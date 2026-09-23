import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { acceptCloudDraft, readCoachDrafts, removeCoachDraft, writeCoachDraft, readDraftDeletions } from "../../../src/coachDraft";
import { draftSyncAction, syncCoachDrafts } from "../../../src/cloudCoachDrafts";
const draft = (revision = "r1", cloudRevision: string | null = null) => ({ schema:1 as const, id:"draft", revision, cloudRevision, title:"Core",updatedAt:1,snapshot:{programName:"Core",programSessions:[],selectedProgramExercises:[]} });
let cloud: any[], posts: any[];
beforeEach(() => {
  const values = new Map<string,string>(); cloud=[]; posts=[];
  vi.stubGlobal("localStorage", { get length() {return values.size;}, key:(i:number)=>[...values.keys()][i], getItem:(k:string)=>values.get(k)||null, setItem:(k:string,v:string)=>values.set(k,v), removeItem:(k:string)=>values.delete(k) });
  vi.stubGlobal("fetch",vi.fn(async (_:any,init:any) => {
    if (init.method === "GET") return {ok:true,json:async()=>({drafts:structuredClone(cloud)})};
    const body=JSON.parse(init.body);posts.push(body); const current=cloud.find(d=>d.id===body.id);
    if(current?.revision !== body.revision && (current?.revision||null)!==body.expectedRevision) return {ok:false,status:409};
    const saved={...body,deleted:!!body.deleted}; cloud=[...cloud.filter(d=>d.id!==body.id),saved]; return {ok:true,json:async()=>({draft:saved})};
  }));
});
afterEach(()=>vi.unstubAllGlobals());
describe("cross-device draft recovery",()=>{
  it("uploads, then downloads the complete unpublished snapshot on a second device",async()=>{
    writeCoachDraft("phone",draft(),null); await syncCoachDrafts("phone","key",()=>undefined);
    expect(readCoachDrafts("phone")[0].cloudRevision).toBe("r1");
    await syncCoachDrafts("desktop","key",()=>undefined);
    expect(readCoachDrafts("desktop")[0].snapshot).toEqual(draft().snapshot); expect(posts).toHaveLength(1);
  });
  it("does not overwrite competing device edits or change an open editor",async()=>{
    const remote={...draft("r3"),deleted:false};
    expect(draftSyncAction(draft("r2","r1"),remote,false)).toBe("conflict");
    expect(draftSyncAction(draft("r1","r1"),remote,true)).toBe("conflict");
    expect(draftSyncAction(draft("r1","r1"),remote,false)).toBe("download");
    acceptCloudDraft("phone",draft(),null); writeCoachDraft("phone",draft("r2"),"r1");cloud=[remote];
    expect((await syncCoachDrafts("phone","key",()=>"draft")).draft).toBe("conflict");
    expect(readCoachDrafts("phone")[0].revision).toBe("r2");expect(posts).toHaveLength(0);
  });
  it("acknowledges an older in-flight write without dropping newer local typing",async()=>{
    writeCoachDraft("phone",draft(),null);
    const fetcher=fetch;
    vi.stubGlobal("fetch",async (url:any,init:any)=>{ const result=await fetcher(url,init);if(init.method==='POST')writeCoachDraft("phone",draft("r2"),"r1");return result;});
    await syncCoachDrafts("phone","key",()=>"draft");
    expect(readCoachDrafts("phone")[0]).toMatchObject({revision:"r2",cloudRevision:"r1"});
    vi.stubGlobal("fetch",fetcher);await syncCoachDrafts("phone","key",()=>"draft");expect(cloud[0].revision).toBe("r2");
  });
  it("retains local drafts when offline and retries without publishing",async()=>{
    writeCoachDraft("phone",draft(),null);const fetcher=fetch;vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("offline")));
    await expect(syncCoachDrafts("phone","key",()=>undefined)).rejects.toThrow();expect(readCoachDrafts("phone")).toHaveLength(1);
    vi.stubGlobal("fetch",fetcher);await syncCoachDrafts("phone","key",()=>undefined);expect(posts[0].snapshot.programName).toBe("Core");
  });
  it("deletes only the acknowledged version and prevents a clean offline copy reappearing",async()=>{
    writeCoachDraft("phone",draft(),null);await syncCoachDrafts("phone","key",()=>undefined);await syncCoachDrafts("desktop","key",()=>undefined);
    removeCoachDraft("phone","draft","r1");await syncCoachDrafts("phone","key",()=>undefined);
    expect(cloud[0].deleted).toBe(true);expect(readDraftDeletions("phone")).toEqual({});
    await syncCoachDrafts("desktop","key",()=>undefined);expect(readCoachDrafts("desktop")).toEqual([]);
  });
  it("preserves unsynced work when another device deletes, and serializes overlapping syncs",async()=>{
    acceptCloudDraft("phone",draft(),null);writeCoachDraft("phone",draft("r2"),"r1");cloud=[{...draft("deleted"),deleted:true}];
    const a=syncCoachDrafts("phone","key",()=>undefined), b=syncCoachDrafts("phone","key",()=>undefined);expect(a).toBe(b);
    expect((await a).draft).toBe("conflict");expect(readCoachDrafts("phone")[0].revision).toBe("r2");
  });
  it("reserves deletion of a never-uploaded draft against a delayed first upload",async()=>{
    writeCoachDraft("phone",draft(),null);removeCoachDraft("phone","draft","r1");
    await syncCoachDrafts("phone","key",()=>undefined);
    expect(cloud[0]).toMatchObject({id:"draft",deleted:true,expectedRevision:null});
    expect(readCoachDrafts("phone")).toEqual([]);
  });
});
