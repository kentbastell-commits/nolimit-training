import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import WeekCopySheet from "../../../src/WeekCopySheet";
import i18n from "../../../src/i18n";
const station = {exerciseId:"EX",exerciseName:"Split squat",load:"20",sets:"2",groupType:"Straight",groupName:"",sectionName:"Strength",setPrescriptions:[{setNumber:1,load:"20"},{setNumber:2,load:"20"}]} as any;
const sessions = [{localId:"one",week:"1",day:"1",sessionName:"Lower",exercises:[station,{...station,exerciseId:"OTHER",exerciseName:"Hold",load:"BW",setPrescriptions:[]}]},{localId:"two",week:"2",day:"1",sessionName:"Existing",exercises:[station]}] as any;
beforeEach(async()=>{ await i18n.changeLanguage("en"); vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({logs:[{recordId:"LOG",exerciseId:"EX",exerciseName:"Split squat",date:"2026-09-20",setNumber:"1",prescribedReps:"8",actualReps:"6",actualWeight:"20",athleteNotes:"Hard at the bottom",completed:true}]})})); });
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it("reviews planned versus actual facts and selected copied loads before replacing a week",async()=>{
 const copy=vi.fn();render(<WeekCopySheet week={1} count={2} sessions={sessions} clientCode="C1" copy={copy} close={()=>{}}/>);
 await waitFor(()=>expect(screen.getByText(/Last performed/)).toBeTruthy());
 fireEvent.click(screen.getByText(/Last performed/));expect(screen.getByText("Prescribed reps")).toBeTruthy();expect(screen.getByText("6 reps · 20 kg")).toBeTruthy();
 fireEvent.click(screen.getByRole("button",{name:"+5%",exact:true}));expect(screen.getByText("21 / 21")).toBeTruthy();
 const submit=screen.getByRole("button",{name:"Copy to selected weeks"});expect((submit as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByLabelText("Replace existing sessions in week 2"));
 const row=screen.getByText("Split squat").closest("article")!;fireEvent.click(within(row).getByRole("checkbox"));
 expect(screen.queryByText("21 / 21")).toBeNull();fireEvent.click(submit);
 expect(copy.mock.calls[0]).toEqual([1,[2],5,new Set(),true]);expect(sessions[0].exercises[0].load).toBe("20");
 expect((screen.getByLabelText("Hold") as HTMLInputElement).disabled).toBe(true);
});
it("does not fetch another athlete's history for an unlinked library program",()=>{
 render(<WeekCopySheet week={1} count={1} sessions={sessions.slice(0,1)} copy={()=>{}} close={()=>{}}/>);
 expect(fetch).not.toHaveBeenCalled();expect(screen.getByText(/Choose an athlete/)).toBeTruthy();
});
