import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, afterAll, beforeEach, afterEach, expect, it, vi } from "vitest";
import { __resetWxpayConfigCache, queryTransaction } from "../../../server/wxpay/client.ts";
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"nl-query-test-")),key=path.join(dir,"test.pem");
beforeAll(()=>{const pair=crypto.generateKeyPairSync("rsa",{modulusLength:2048});fs.writeFileSync(key,pair.privateKey.export({format:"pem",type:"pkcs8"}));});
beforeEach(()=>{
  for(const [name,value] of Object.entries({WXPAY_MCH_ID:"test-merchant",WXPAY_APIV3_KEY:"0123456789abcdef0123456789abcdef",WXPAY_CERT_SERIAL:"TEST",WXPAY_PRIVATE_KEY_PATH:key,WXPAY_PUBLIC_KEY_PATH:""}))vi.stubEnv(name,value);
  __resetWxpayConfigCache();
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();__resetWxpayConfigCache();});
afterAll(()=>{fs.unlinkSync(key);fs.rmdirSync(dir);});
it("distinguishes an explicitly nonexistent provider trade from an unknown query failure",async()=>{
  vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify({code:"ORDER_NOT_EXIST"}),{status:404})));
  expect(await queryTransaction("NLAUDIT")).toEqual({tradeState:"NOT_FOUND"});
});
it.each([[500,"SYSTEM_ERROR"],[404,"MCH_NOT_EXISTS"]])("does not classify provider error %s/%s as a safe new payment attempt",async(status,code)=>{
  vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify({code}),{status})));
  await expect(queryTransaction("NLAUDIT")).rejects.toThrow("WeChat Pay query failed");
});
