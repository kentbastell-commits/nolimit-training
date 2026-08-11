// WeChat Pay APIv3 crypto: request signing, callback verification, and
// resource decryption, exercised against a locally generated keypair so the
// exact byte formats WeChat specifies are pinned by tests.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  __resetWxpayConfigCache,
  buildAuthorization,
  decryptCallbackResource,
  makeOpenidToken,
  makeOutTradeNo,
  signJsapiInvoke,
  verifyCallbackSignature,
  verifyOpenidToken,
  type WxpayConfig,
} from "../../../server/wxpay/client.ts";

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();

const API_V3_KEY = "0123456789abcdef0123456789abcdef";

const config: WxpayConfig = {
  mchId: "1749290194",
  apiV3Key: API_V3_KEY,
  certSerial: "ABCDEF0123456789",
  privateKeyPem,
  publicKeyPem,
  publicKeyId: "PUB_KEY_ID_TEST",
  appId: "wxdf181d0891ae7ed1",
  notifyUrl: "https://trainnolimit.cn/api/wxpayNotify",
};

function signCallback(body: string, timestamp: string, nonce: string): string {
  return crypto
    .createSign("RSA-SHA256")
    .update(`${timestamp}\n${nonce}\n${body}\n`)
    .sign(privateKeyPem, "base64");
}

function callbackHeaders(body: string, overrides: Record<string, string> = {}) {
  const timestamp = overrides["wechatpay-timestamp"] || String(Math.floor(Date.now() / 1000));
  const nonce = overrides["wechatpay-nonce"] || "test-nonce";
  return {
    "wechatpay-timestamp": timestamp,
    "wechatpay-nonce": nonce,
    "wechatpay-serial": "PUB_KEY_ID_TEST",
    "wechatpay-signature": signCallback(body, timestamp, nonce),
    ...overrides,
  };
}

function encryptResource(payload: unknown, associatedData = "transaction") {
  const nonce = "abcdef123456"; // 12 bytes, as WeChat uses
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(API_V3_KEY, "utf8"),
    Buffer.from(nonce, "utf8")
  );
  cipher.setAAD(Buffer.from(associatedData, "utf8"));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const withTag = Buffer.concat([encrypted, cipher.getAuthTag()]);
  return {
    ciphertext: withTag.toString("base64"),
    nonce,
    associated_data: associatedData,
  };
}

describe("wxpay request signing", () => {
  it("builds a WECHATPAY2-SHA256-RSA2048 header that verifies", () => {
    const header = buildAuthorization(
      config,
      "POST",
      "/v3/pay/transactions/native",
      '{"a":1}',
      1_700_000_000,
      "noncestr"
    );
    expect(header).toContain('mchid="1749290194"');
    expect(header).toContain('serial_no="ABCDEF0123456789"');
    const signature = header.match(/signature="([^"]+)"/)?.[1] || "";
    const verified = crypto
      .createVerify("RSA-SHA256")
      .update('POST\n/v3/pay/transactions/native\n1700000000\nnoncestr\n{"a":1}\n')
      .verify(publicKeyPem, signature, "base64");
    expect(verified).toBe(true);
  });

  it("signs JSAPI invoke params over appId/timeStamp/nonceStr/package", () => {
    const invoke = signJsapiInvoke(config, "prepay123");
    expect(invoke.package).toBe("prepay_id=prepay123");
    expect(invoke.signType).toBe("RSA");
    const verified = crypto
      .createVerify("RSA-SHA256")
      .update(`${invoke.appId}\n${invoke.timeStamp}\n${invoke.nonceStr}\n${invoke.package}\n`)
      .verify(publicKeyPem, invoke.paySign, "base64");
    expect(verified).toBe(true);
  });
});

describe("wxpay callback verification", () => {
  const body = '{"id":"evt-1","resource":{}}';

  it("accepts a correctly signed callback", () => {
    expect(verifyCallbackSignature(config, callbackHeaders(body), body)).toBeNull();
  });

  it("rejects a tampered body", () => {
    expect(
      verifyCallbackSignature(config, callbackHeaders(body), body + " ")
    ).toBe("signature mismatch");
  });

  it("rejects an unexpected serial", () => {
    const headers = callbackHeaders(body, { "wechatpay-serial": "PUB_KEY_ID_EVIL" });
    expect(verifyCallbackSignature(config, headers, body)).toContain("unexpected serial");
  });

  it("rejects a stale timestamp", () => {
    const stale = String(Math.floor(Date.now() / 1000) - 3600);
    const headers = callbackHeaders(body, { "wechatpay-timestamp": stale });
    expect(verifyCallbackSignature(config, headers, body)).toBe("timestamp out of range");
  });

  it("rejects missing headers", () => {
    expect(verifyCallbackSignature(config, {}, body)).toBe("missing signature headers");
  });
});

describe("wxpay resource decryption", () => {
  it("round-trips an AES-256-GCM resource", () => {
    const payload = {
      out_trade_no: "NLWTEST123",
      transaction_id: "wx-txn-1",
      trade_state: "SUCCESS",
      amount: { total: 39900 },
    };
    const decrypted = decryptCallbackResource(config, encryptResource(payload));
    expect(decrypted).toEqual(payload);
  });

  it("throws on a tampered ciphertext", () => {
    const resource = encryptResource({ ok: true });
    const corrupted = Buffer.from(resource.ciphertext, "base64");
    corrupted[0] ^= 0xff;
    expect(() =>
      decryptCallbackResource(config, { ...resource, ciphertext: corrupted.toString("base64") })
    ).toThrow();
  });
});

describe("makeOutTradeNo", () => {
  it("generates unique alphanumeric ids within WeChat's 32-char limit", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const id = makeOutTradeNo();
      expect(id).toMatch(/^NLW[A-Z0-9]{8,29}$/);
      expect(id.length).toBeLessThanOrEqual(32);
      seen.add(id);
    }
    expect(seen.size).toBe(200);
  });
});

describe("openid tokens", () => {
  it("round-trips and rejects tampering/expiry", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wxpay-oid-"));
    fs.writeFileSync(path.join(dir, "key.pem"), privateKeyPem);
    process.env.WXPAY_MCH_ID = "1749290194";
    process.env.WXPAY_APIV3_KEY = API_V3_KEY;
    process.env.WXPAY_CERT_SERIAL = "TESTSERIAL01";
    process.env.WXPAY_PRIVATE_KEY_PATH = path.join(dir, "key.pem");
    __resetWxpayConfigCache();
    try {
      const token = makeOpenidToken("openid-abc-123");
      expect(verifyOpenidToken(token)).toBe("openid-abc-123");
      expect(verifyOpenidToken(token + "x")).toBeNull();
      expect(verifyOpenidToken("a.b")).toBeNull();
      const expired = makeOpenidToken("openid-abc-123", -1_000);
      expect(verifyOpenidToken(expired)).toBeNull();
    } finally {
      for (const name of [
        "WXPAY_MCH_ID", "WXPAY_APIV3_KEY", "WXPAY_CERT_SERIAL", "WXPAY_PRIVATE_KEY_PATH",
      ]) {
        delete process.env[name];
      }
      __resetWxpayConfigCache();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
