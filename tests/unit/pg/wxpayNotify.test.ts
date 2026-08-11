// The WeChat Pay money path against real Postgres: a signed+encrypted
// callback must flip the whole order group to Paid exactly once; a forged
// signature or wrong amount must never unlock anything (#22, #45).
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDb, rows, seedClient } from "./helpers.ts";
import { __resetWxpayConfigCache } from "../../../server/wxpay/client.ts";
import wxpayNotify from "../../../api/wxpayNotify.ts";

const API_V3_KEY = "0123456789abcdef0123456789abcdef";
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();

let keyDir: string;

beforeAll(() => {
  keyDir = fs.mkdtempSync(path.join(os.tmpdir(), "wxpay-test-"));
  fs.writeFileSync(path.join(keyDir, "apiclient_key.pem"), privateKeyPem);
  fs.writeFileSync(path.join(keyDir, "pub.pem"), publicKeyPem);
  process.env.WXPAY_MCH_ID = "1749290194";
  process.env.WXPAY_APIV3_KEY = API_V3_KEY;
  process.env.WXPAY_CERT_SERIAL = "TESTSERIAL01";
  process.env.WXPAY_PRIVATE_KEY_PATH = path.join(keyDir, "apiclient_key.pem");
  process.env.WXPAY_PUBLIC_KEY_PATH = path.join(keyDir, "pub.pem");
  process.env.WXPAY_PUBLIC_KEY_ID = "PUB_KEY_ID_TEST";
  __resetWxpayConfigCache();
});

afterAll(async () => {
  fs.rmSync(keyDir, { recursive: true, force: true });
  for (const name of [
    "WXPAY_MCH_ID",
    "WXPAY_APIV3_KEY",
    "WXPAY_CERT_SERIAL",
    "WXPAY_PRIVATE_KEY_PATH",
    "WXPAY_PUBLIC_KEY_PATH",
    "WXPAY_PUBLIC_KEY_ID",
  ]) {
    delete process.env[name];
  }
  __resetWxpayConfigCache();
  await closeDb();
});

beforeEach(async () => {
  await resetDb();
});

function buildCallback(resourcePayload: unknown, options: { badSignature?: boolean } = {}) {
  const nonce = "abcdef123456";
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(API_V3_KEY, "utf8"),
    Buffer.from(nonce, "utf8")
  );
  cipher.setAAD(Buffer.from("transaction", "utf8"));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(resourcePayload), "utf8"),
    cipher.final(),
  ]);
  const body = JSON.stringify({
    id: "evt-1",
    event_type: "TRANSACTION.SUCCESS",
    resource: {
      ciphertext: Buffer.concat([encrypted, cipher.getAuthTag()]).toString("base64"),
      nonce,
      associated_data: "transaction",
    },
  });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = options.badSignature
    ? "aW52YWxpZA=="
    : crypto
        .createSign("RSA-SHA256")
        .update(`${timestamp}\ncb-nonce\n${body}\n`)
        .sign(privateKeyPem, "base64");

  const req = Readable.from([Buffer.from(body, "utf8")]) as any;
  req.headers = {
    "wechatpay-timestamp": timestamp,
    "wechatpay-nonce": "cb-nonce",
    "wechatpay-serial": "PUB_KEY_ID_TEST",
    "wechatpay-signature": signature,
  };
  return req;
}

function makeRawRes() {
  const res: any = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: "",
    setHeader(name: string, value: string) {
      res.headers[name] = value;
    },
    end(chunk?: string) {
      res.body = chunk || "";
      res.ended = true;
    },
  };
  return res;
}

async function seedOrderGroup() {
  await seedClient({ client_id: "CL-7001", full_name: "Pay Tester" });
  await rows(
    `insert into product_orders
       (order_id, client_id, client_name, product_name, amount, currency,
        payment_status, payment_reference, wxpay_trade_no)
     values
       ('ORD-1', 'CL-7001', 'Pay Tester', 'Program A', 299, 'CNY',
        'Pending', 'NL-TEST', 'NLWGROUP1'),
       ('ORD-2', 'CL-7001', 'Pay Tester', 'Add-on B', 100, 'CNY',
        'Pending', 'NL-TEST', 'NLWGROUP1')`
  );
}

const successResource = (totalFen: number) => ({
  out_trade_no: "NLWGROUP1",
  transaction_id: "wx-txn-88",
  trade_state: "SUCCESS",
  amount: { total: totalFen },
});

describe("api/wxpayNotify (postgres)", () => {
  it("marks the whole order group Paid on a valid callback", async () => {
    await seedOrderGroup();
    const res = makeRawRes();
    await wxpayNotify(buildCallback(successResource(39900)), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).code).toBe("SUCCESS");
    const orders = await rows(
      "select payment_status, payment_provider, wxpay_transaction_id from product_orders order by order_id"
    );
    expect(orders).toHaveLength(2);
    for (const order of orders) {
      expect(order.payment_status).toBe("Paid");
      expect(order.payment_provider).toBe("WeChat Pay");
      expect(order.wxpay_transaction_id).toBe("wx-txn-88");
    }
  });

  it("is idempotent when the callback repeats", async () => {
    await seedOrderGroup();
    await wxpayNotify(buildCallback(successResource(39900)), makeRawRes());
    const res = makeRawRes();
    await wxpayNotify(buildCallback(successResource(39900)), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).message).toBe("already paid");
  });

  it("rejects a forged signature and changes nothing", async () => {
    await seedOrderGroup();
    const res = makeRawRes();
    await wxpayNotify(buildCallback(successResource(39900), { badSignature: true }), res);
    expect(res.statusCode).toBe(401);
    const orders = await rows("select payment_status from product_orders");
    for (const order of orders) expect(order.payment_status).toBe("Pending");
  });

  it("flags an amount mismatch without unlocking", async () => {
    await seedOrderGroup();
    const res = makeRawRes();
    await wxpayNotify(buildCallback(successResource(100)), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).message).toBe("amount mismatch flagged");
    const orders = await rows("select payment_status from product_orders");
    for (const order of orders) expect(order.payment_status).toBe("Pending");
  });

  it("acknowledges an unknown trade number without failing", async () => {
    const res = makeRawRes();
    await wxpayNotify(buildCallback(successResource(500)), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).message).toBe("no matching order");
  });

  it("ignores non-SUCCESS trade states", async () => {
    await seedOrderGroup();
    const res = makeRawRes();
    await wxpayNotify(
      buildCallback({ ...successResource(39900), trade_state: "REFUND" }),
      res
    );
    expect(res.statusCode).toBe(200);
    const orders = await rows("select payment_status from product_orders");
    for (const order of orders) expect(order.payment_status).toBe("Pending");
  });
});
