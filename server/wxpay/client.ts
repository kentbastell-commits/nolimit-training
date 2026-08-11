// WeChat Pay APIv3 client — request signing, callback verification, and the
// transaction endpoints this platform uses (Native QR now; JSAPI ready for
// when the service-account OAuth secret is installed).
//
// Credentials come from env (installed 2026-08-11, never committed):
//   WXPAY_MCH_ID            merchant id
//   WXPAY_APIV3_KEY         32-char APIv3 key (AES-256-GCM for callbacks)
//   WXPAY_CERT_SERIAL       merchant certificate serial (request signing id)
//   WXPAY_PRIVATE_KEY_PATH  merchant private key pem (signs requests)
//   WXPAY_PUBLIC_KEY_PATH   WeChat Pay public key pem (verifies callbacks)
//   WXPAY_PUBLIC_KEY_ID     PUB_KEY_ID_... (expected Wechatpay-Serial)
//   WXPAY_APPID             appid transactions are created under
//                           (default: the NoLimit Training service account)
//   WXPAY_ENABLED           "1" switches customer-facing payment on; absent
//                           or anything else keeps the whole feature dormant
//                           (twin-safety: the pg twin shares this .env, so
//                           the flag is set per-app via pm2, never here).
import crypto from "node:crypto";
import fs from "node:fs";

const API_BASE = "https://api.mch.weixin.qq.com";
const DEFAULT_APPID = "wxdf181d0891ae7ed1"; // NoLimit Training service account

export type WxpayConfig = {
  mchId: string;
  apiV3Key: string;
  certSerial: string;
  privateKeyPem: string;
  publicKeyPem: string;
  publicKeyId: string;
  appId: string;
  notifyUrl: string;
};

let cached: WxpayConfig | null | undefined;

/** Loads and caches credentials; null when the server has none installed. */
export function wxpayConfig(): WxpayConfig | null {
  if (cached !== undefined) return cached;
  try {
    const mchId = process.env.WXPAY_MCH_ID || "";
    const apiV3Key = process.env.WXPAY_APIV3_KEY || "";
    const certSerial = process.env.WXPAY_CERT_SERIAL || "";
    const privateKeyPath = process.env.WXPAY_PRIVATE_KEY_PATH || "";
    const publicKeyPath = process.env.WXPAY_PUBLIC_KEY_PATH || "";
    const publicKeyId = process.env.WXPAY_PUBLIC_KEY_ID || "";
    if (!mchId || apiV3Key.length !== 32 || !certSerial || !privateKeyPath) {
      cached = null;
      return cached;
    }
    cached = {
      mchId,
      apiV3Key,
      certSerial,
      privateKeyPem: fs.readFileSync(privateKeyPath, "utf8"),
      publicKeyPem: publicKeyPath ? fs.readFileSync(publicKeyPath, "utf8") : "",
      publicKeyId,
      appId: process.env.WXPAY_APPID || DEFAULT_APPID,
      notifyUrl: `${process.env.WXPAY_NOTIFY_BASE || "https://trainnolimit.cn"}/api/wxpayNotify`,
    };
  } catch {
    cached = null;
  }
  return cached;
}

/** Customer-facing payments are on only when creds exist AND the flag is set. */
export function wxpayEnabled(): boolean {
  return process.env.WXPAY_ENABLED === "1" && wxpayConfig() !== null;
}

/** For tests: reset the config cache after env changes. */
export function __resetWxpayConfigCache(): void {
  cached = undefined;
}

const nonce = () => crypto.randomBytes(16).toString("hex");

/** APIv3 request signature: RSA-SHA256 over method/path/timestamp/nonce/body. */
export function buildAuthorization(
  config: WxpayConfig,
  method: string,
  urlPath: string,
  body: string,
  timestamp = Math.floor(Date.now() / 1000),
  nonceStr = nonce()
): string {
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(message)
    .sign(config.privateKeyPem, "base64");
  return (
    `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",` +
    `nonce_str="${nonceStr}",signature="${signature}",` +
    `timestamp="${timestamp}",serial_no="${config.certSerial}"`
  );
}

async function apiRequest(
  config: WxpayConfig,
  method: "GET" | "POST",
  urlPath: string,
  payload?: unknown
): Promise<{ status: number; body: any }> {
  const body = payload === undefined ? "" : JSON.stringify(payload);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${API_BASE}${urlPath}`, {
      method,
      headers: {
        Authorization: buildAuthorization(config, method, urlPath, body),
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "nolimit-training/1.0",
      },
      ...(body ? { body } : {}),
      signal: controller.signal,
    });
    const text = await response.text();
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text };
    }
    return { status: response.status, body: parsed };
  } finally {
    clearTimeout(timer);
  }
}

/** Creates a Native (QR) transaction; returns the code_url to render. */
export async function createNativeTransaction(input: {
  outTradeNo: string;
  description: string;
  totalFen: number;
}): Promise<{ codeUrl: string }> {
  const config = wxpayConfig();
  if (!config) throw new Error("WeChat Pay is not configured");
  const { status, body } = await apiRequest(config, "POST", "/v3/pay/transactions/native", {
    appid: config.appId,
    mchid: config.mchId,
    description: input.description.slice(0, 127),
    out_trade_no: input.outTradeNo,
    notify_url: config.notifyUrl,
    amount: { total: input.totalFen, currency: "CNY" },
  });
  if (status !== 200 || !body?.code_url) {
    throw new Error(
      `WeChat Pay create failed (${status}): ${body?.message || body?.code || "unknown"}`
    );
  }
  return { codeUrl: String(body.code_url) };
}

/** Creates a JSAPI transaction (inside the WeChat browser); needs an openid. */
export async function createJsapiTransaction(input: {
  outTradeNo: string;
  description: string;
  totalFen: number;
  openid: string;
}): Promise<{ prepayId: string }> {
  const config = wxpayConfig();
  if (!config) throw new Error("WeChat Pay is not configured");
  const { status, body } = await apiRequest(config, "POST", "/v3/pay/transactions/jsapi", {
    appid: config.appId,
    mchid: config.mchId,
    description: input.description.slice(0, 127),
    out_trade_no: input.outTradeNo,
    notify_url: config.notifyUrl,
    amount: { total: input.totalFen, currency: "CNY" },
    payer: { openid: input.openid },
  });
  if (status !== 200 || !body?.prepay_id) {
    throw new Error(
      `WeChat Pay create failed (${status}): ${body?.message || body?.code || "unknown"}`
    );
  }
  return { prepayId: String(body.prepay_id) };
}

/** Client-side invoke params for WeixinJSBridge, signed with our key. */
export function signJsapiInvoke(config: WxpayConfig, prepayId: string) {
  const timeStamp = String(Math.floor(Date.now() / 1000));
  const nonceStr = nonce();
  const pkg = `prepay_id=${prepayId}`;
  const paySign = crypto
    .createSign("RSA-SHA256")
    .update(`${config.appId}\n${timeStamp}\n${nonceStr}\n${pkg}\n`)
    .sign(config.privateKeyPem, "base64");
  return { appId: config.appId, timeStamp, nonceStr, package: pkg, signType: "RSA", paySign };
}

export type WxpayTransactionState = {
  tradeState: string;
  transactionId?: string;
  totalFen?: number;
  payerTotalFen?: number;
};

/** Queries a transaction by our out_trade_no. */
export async function queryTransaction(outTradeNo: string): Promise<WxpayTransactionState> {
  const config = wxpayConfig();
  if (!config) throw new Error("WeChat Pay is not configured");
  const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${config.mchId}`;
  const { status, body } = await apiRequest(config, "GET", path);
  if (status !== 200 || !body?.trade_state) {
    throw new Error(
      `WeChat Pay query failed (${status}): ${body?.message || body?.code || "unknown"}`
    );
  }
  return {
    tradeState: String(body.trade_state),
    transactionId: body.transaction_id ? String(body.transaction_id) : undefined,
    totalFen: Number(body.amount?.total) || undefined,
    payerTotalFen: Number(body.amount?.payer_total) || undefined,
  };
}

/**
 * Verifies a callback's signature headers against the WeChat Pay public key.
 * Returns a reason string when invalid, null when valid.
 */
export function verifyCallbackSignature(
  config: WxpayConfig,
  headers: Record<string, string | string[] | undefined>,
  rawBody: string
): string | null {
  const header = (name: string): string => {
    const value = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] || "" : value || "";
  };
  const timestamp = header("wechatpay-timestamp");
  const nonceStr = header("wechatpay-nonce");
  const signature = header("wechatpay-signature");
  const serial = header("wechatpay-serial");
  if (!timestamp || !nonceStr || !signature || !serial) return "missing signature headers";
  if (!config.publicKeyPem) return "public key not installed";
  if (config.publicKeyId && serial !== config.publicKeyId) {
    return `unexpected serial ${serial}`;
  }
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return "timestamp out of range";
  const message = `${timestamp}\n${nonceStr}\n${rawBody}\n`;
  const valid = crypto
    .createVerify("RSA-SHA256")
    .update(message)
    .verify(config.publicKeyPem, signature, "base64");
  return valid ? null : "signature mismatch";
}

/** Decrypts a callback's AES-256-GCM resource with the APIv3 key. */
export function decryptCallbackResource(
  config: WxpayConfig,
  resource: { ciphertext: string; nonce: string; associated_data?: string }
): any {
  const buffer = Buffer.from(resource.ciphertext, "base64");
  const authTag = buffer.subarray(buffer.length - 16);
  const data = buffer.subarray(0, buffer.length - 16);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(config.apiV3Key, "utf8"),
    Buffer.from(resource.nonce, "utf8")
  );
  decipher.setAuthTag(authTag);
  if (resource.associated_data) {
    decipher.setAAD(Buffer.from(resource.associated_data, "utf8"));
  }
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(plain.toString("utf8"));
}

/** Generates a unique out_trade_no (alnum, <=32 chars, prefixed for greppability). */
export function makeOutTradeNo(): string {
  return `NLW${Date.now().toString(36).toUpperCase()}${crypto
    .randomBytes(6)
    .toString("hex")
    .toUpperCase()}`;
}
