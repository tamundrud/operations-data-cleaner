import { afterEach, expect, test, vi } from "vitest";
import type { Request, Response } from "../../src/session/worker-protocol";
import { makeWorkflow } from "../../src/engine/workflow";

afterEach(()=>vi.unstubAllGlobals());
test("source filters honor their row counts when workflow errors prevent row evaluation",async()=>{
  vi.resetModules();
  let response:Response;
  const worker={onmessage:undefined as undefined | ((event:MessageEvent<Request>)=>Promise<void>),postMessage:(value:Response)=>{response=value;}};
  vi.stubGlobal("self",worker);
  await import("../../src/processing.worker");
  let request=0;
  const send=async(payload:object)=>{
    await worker.onmessage!({data:{request:++request,dataset:"filters",revision:0,...payload}} as MessageEvent<Request>);
    if(response.kind!=="view") throw new Error("Expected source view");
    return response.view;
  };
  const workflow=makeWorkflow(["Unmapped"]);
  const all=await send({kind:"import",bytes:new TextEncoder().encode("ID\n001\n002").buffer,delimiter:",",workflow});
  expect(all.workflowIssues.length).toBeGreaterThan(0);
  expect(all.sourceRows).toHaveLength(2);
  for(const filter of ["invalid","exceptions"]) {
    const view=await send({kind:"source-page",page:0,filter});
    expect(view.sourceRows).toEqual([]);
    expect(view.sourceCount).toBe(0);
    expect(view.summary).toMatchObject({candidates:2,invalid:0,warningOnly:0});
  }
  expect((await send({kind:"source-page",page:0,filter:"all"})).sourceRows).toHaveLength(2);
});
