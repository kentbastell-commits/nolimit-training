import express from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createMediaUploadHandler } from "../../../server/mediaUpload.ts";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"nl-upload-auth-"));
const app=express();app.post("/upload",createMediaUploadHandler(dir));
const server=createServer(app);let base="";
beforeAll(async()=>{await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));const address=server.address();if(!address||typeof address==="string")throw Error("No test port");base=`http://127.0.0.1:${address.port}`;});
beforeEach(()=>vi.stubEnv("COACH_ACCESS_KEY","media-coach-key"));
afterEach(()=>{
  vi.unstubAllEnvs();
  for(const name of fs.readdirSync(dir)){
    if(!/^(ex|fv|coach)-[a-f0-9]{24}\.mp4$/.test(name))throw Error("Unexpected upload fixture");
    fs.unlinkSync(path.join(dir,name));
  }
});
afterAll(async()=>{server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));fs.rmdirSync(dir);});
async function upload(kind:string,coach=false,body="audit-media-bytes"){
  return fetch(`${base}/upload?kind=${kind}&name=audit.mp4`,{method:"POST",headers:{"content-type":"video/mp4",...(coach?{"x-coach-key":"media-coach-key"}:{})},body});
}
describe("direct upload HTTP authorization",()=>{
  it.each(["exercise","coach"])("refuses a public %s upload before writing any file",async kind=>{
    const res=await upload(kind);expect(res.status).toBe(401);await res.body?.cancel();expect(fs.readdirSync(dir)).toEqual([]);
  });
  it.each(["exercise","coach"])("stores the exact bytes of an authenticated %s upload",async kind=>{
    const res=await upload(kind,true);expect(res.status).toBe(200);const data=await res.json();
    expect(fs.readFileSync(path.join(dir,path.basename(data.url)),"utf8")).toBe("audit-media-bytes");
  });
  it("keeps athlete form uploads available without a coach key",async()=>{
    const res=await upload("form");expect(res.status).toBe(200);expect((await res.json()).url).toMatch(/^\/uploads\/fv-/);
  });
  it("rejects an empty upload and removes its empty file",async()=>{
    const res=await upload("exercise",true,"");expect(res.status).toBe(400);await res.body?.cancel();
    await expect.poll(()=>fs.readdirSync(dir)).toEqual([]);
  });
});
