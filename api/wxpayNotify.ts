import type { IncomingMessage, ServerResponse } from "node:http";
import {
  markOrdersPaidByWxpay,
  ordersByWxpayTradeNo,
} from "../server/db/repositories/productOrders.ts";
import {
  decryptCallbackResource,
  verifyCallbackSignature,
  wxpayConfig,
} from "../server/wxpay/client.ts";
import { notifyCoach } from "./_notify.ts";

// WeChat Pay APIv3 payment callback. Mounted as a dedicated raw-body route
// BEFORE express.json in server/index.ts — the signature is computed over the
// exact raw bytes, so the body must not be parsed first.
//
// Every response is JSON {code, message}; anything but 2xx makes WeChat retry
// (repeating over ~24h), so permanent conditions (unknown trade, amount
// mismatch) are acknowledged with 200 after alerting the coach, while
// transient conditions (DB down) return 500 so the retry can succeed later.

const MAX_BODY_BYTES = 128 * 1024;

function readRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let received = 0;
    req.on("data", (chunk: Buffer) => {
      received += chunk.length;
      if (received > MAX_BODY_BYTES) {
        reject(new Error("Body too large"));
        req.destroy();
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function respond(res: ServerResponse, status: number, code: string, message: string) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ code, message }));
}

export default async function wxpayNotify(req: IncomingMessage, res: ServerResponse) {
  const config = wxpayConfig();
  if (!config) return respond(res, 503, "FAIL", "not configured");

  let rawBody: string;
  try {
    rawBody = await readRawBody(req);
  } catch {
    return respond(res, 400, "FAIL", "unreadable body");
  }

  const invalid = verifyCallbackSignature(
    config,
    req.headers as Record<string, string | string[] | undefined>,
    rawBody
  );
  if (invalid) {
    console.error("wxpayNotify: rejected callback:", invalid);
    return respond(res, 401, "FAIL", "signature verification failed");
  }

  let event: any;
  let resource: any;
  try {
    event = JSON.parse(rawBody);
    resource = decryptCallbackResource(config, event.resource || {});
  } catch (err) {
    console.error("wxpayNotify: decrypt/parse failed:", err);
    return respond(res, 400, "FAIL", "undecryptable resource");
  }

  const tradeNo = String(resource?.out_trade_no || "");
  const tradeState = String(resource?.trade_state || "");
  const transactionId = String(resource?.transaction_id || "");
  const paidFen = Number(resource?.amount?.total);

  if (tradeState !== "SUCCESS") {
    // Refund/close events etc. — acknowledged, nothing to unlock.
    return respond(res, 200, "SUCCESS", "ignored");
  }

  try {
    const orders = await ordersByWxpayTradeNo(tradeNo);
    if (!orders.length) {
      void notifyCoach(
        `⚠️ WeChat payment ${transactionId} (${tradeNo}, ${paidFen} fen) ` +
          `matches no order — check the merchant platform and match it manually.`
      );
      return respond(res, 200, "SUCCESS", "no matching order");
    }

    const unpaid = orders.filter(
      (order) => order.paymentStatus.trim().toLowerCase() !== "paid"
    );
    if (!unpaid.length) return respond(res, 200, "SUCCESS", "already paid");

    const expectedFen = Math.round(
      unpaid.reduce((sum, order) => sum + (order.amount > 0 ? order.amount : 0), 0) * 100
    );
    if (Number.isFinite(paidFen) && paidFen !== expectedFen) {
      void notifyCoach(
        `⚠️ WeChat payment amount mismatch on ${tradeNo}: paid ${paidFen} fen, ` +
          `expected ${expectedFen} fen. Order NOT auto-unlocked — resolve manually.`
      );
      return respond(res, 200, "SUCCESS", "amount mismatch flagged");
    }

    const updated = await markOrdersPaidByWxpay(tradeNo, transactionId);
    if (updated.length) {
      const buyer = orders[0]?.clientName || orders[0]?.clientId || "";
      void notifyCoach(
        `💰 WeChat payment received: ¥${(expectedFen / 100).toFixed(2)} from ` +
          `${buyer} — order(s) ${updated.join(", ")} unlocked automatically.`
      );
    }
    return respond(res, 200, "SUCCESS", "ok");
  } catch (err) {
    // Transient (likely DB) — let WeChat retry.
    console.error("wxpayNotify: processing failed:", err);
    return respond(res, 500, "FAIL", "temporary failure");
  }
}
