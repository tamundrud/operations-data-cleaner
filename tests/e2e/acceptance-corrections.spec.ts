import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readdir } from "node:fs/promises";
import * as XLSX from "xlsx";
import { makeWorkflow, referencedHeaders, type Workflow } from "../../src/engine/workflow";
import { download, edit, closeSettings, upload } from "./helpers";

async function open(page: Page, workflow: Workflow, csv: string) {
  workflow.source.referencedHeaders = referencedHeaders(workflow.fields);
  await page.goto("/");
  await page.getByLabel("Import workflow", {exact:true}).setInputFiles({name:"synthetic.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(workflow))});
  await expect(page.getByRole("button",{name:"Edit workflow",exact:true})).toBeVisible();
  await upload(page,csv);
}
function quantityWorkflow() {
  const w = makeWorkflow(["Reference","ConvertedCases"]);
  w.name="Synthetic batch";
  w.fields[0].recipe={kind:"copy",source:"id"};
  w.fields[1].type="number"; w.fields[1].required=true;
  w.fields[1].recipe={kind:"calculate",operation:"divide",left:{kind:"source",source:"units"},right:{kind:"number",decimal:"4"}};
  return w;
}
const apply = (page: Page, count: number) => page.getByRole("button",{name:`Apply ${count} corrections`,exact:true}).first().click();

test("Done editing retains unsaved configuration across repeat mode and portable workflows", async ({page}) => {
  await open(page,quantityWorkflow(),"ID,Units\n001234,12");
  await page.getByRole("button",{name:"Save workflow",exact:true}).click();
  await expect(page.getByText("Saved in this browser.",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Edit workflow",exact:true}).click();
  await edit(page,"Reference");
  await page.getByLabel("Output column name",{exact:true}).fill("Unsaved reference");
  await closeSettings(page);
  await page.getByRole("button",{name:"Done editing",exact:true}).click();
  await expect(page.getByLabel("Repeat workflow")).toContainText("Unsaved");
  expect((await download(page)).toString()).toBe("Unsaved reference,ConvertedCases\r\n001234,3\r\n");
  await page.getByRole("button",{name:"Edit workflow",exact:true}).click();
  await edit(page,"Unsaved reference");
  await expect(page.getByLabel("Output column name",{exact:true})).toHaveValue("Unsaved reference");
  await closeSettings(page);
  await page.getByRole("button",{name:"Done editing",exact:true}).click();
  // Exiting did not implicitly update the saved workflow.
  await page.reload();
  await page.getByLabel("Saved workflows",{exact:true}).selectOption({label:"Synthetic batch"});
  await page.getByRole("button",{name:"Open workflow",exact:true}).click();
  await upload(page,"ID,Units\n001234,12");
  expect((await download(page)).toString()).toBe("Reference,ConvertedCases\r\n001234,3\r\n");
});

test("one address root cause navigates and highlights the original cell; diagnostics and independent errors remain", async ({page},info) => {
  const w=makeWorkflow(["Street","City","Province","PostalCode","Required"]);
  w.fields.slice(0,4).forEach((f,index)=>{f.required=true;f.recipe={kind:"split",source:"address",delimiter:",",segments:4,index,trim:true,optionalEmpty:[]};});
  w.fields[4].required=true;w.fields[4].recipe={kind:"copy",source:"empty"};
  await open(page,w,'Address,Empty\n"Street,City,Province,Postal,Extra",');
  const review=page.getByLabel("Exception details");
  await expect(review.locator(":scope > li")).toHaveCount(2);
  await expect(review).toContainText("Street, City, Province, PostalCode");
  await review.getByRole("button",{name:"Inspect Address, record 2",exact:true}).click();
  const input=page.getByLabel("Replacement for Address, record 2",{exact:true});
  await expect(input).toBeFocused();
  await expect(input.locator("xpath=ancestor::td")).toHaveClass(/source-error/);
  await input.fill("Street,City,Province,Postal");
  await expect(page.getByText("Pending change",{exact:true})).toBeVisible();
  if(info.project.name==="chromium") {
    await page.locator(".source-inspection").screenshot({path:"docs/reviews/issue-14/screenshots/address-pending-desktop.png"});
    await page.setViewportSize({width:390,height:844});
    await review.getByRole("button",{name:"Inspect Address, record 2",exact:true}).click();
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("Street,City,Province,Postal");
    await page.locator(".source-inspection").screenshot({path:"docs/reviews/issue-14/screenshots/address-pending-mobile.png"});
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await page.setViewportSize({width:1280,height:720});
  }
  await apply(page,1);
  await expect(page.getByLabel("Full dataset counts")).toContainText("Invalid 1");
  await expect(review.locator(":scope > li")).toHaveCount(1);
  await expect(review).toContainText("Required is required but blank");
});

test("independent filters retain multi-page drafts and apply once without changing output pages", async ({page,context}, info) => {
  const unexpected:string[]=[];
  const assets=new Set(["/","/index.html",...(await readdir("dist/assets")).map(f=>"/assets/"+f)]);
  await context.route("**/*",async route=>{
    const r=route.request(),u=new URL(r.url());
    if(u.origin!=="http://127.0.0.1:4173" || r.method()!=="GET" || !assets.has(u.pathname) || u.search) {unexpected.push(r.url());await route.abort();}
    else await route.continue();
  });
  await context.routeWebSocket(/.*/,ws=>{unexpected.push(ws.url());ws.close();});
  const rows=Array.from({length:125},(_,i)=>`${i===0 ? "=PRIVATE_U14_WARNING" : String(i).padStart(6,"0")},${i===124?"=WARNING":i%2?"Twelve":"12"}`);
  await open(page,quantityWorkflow(),"ID,Units\n"+rows.join("\n"));
  const counts=page.getByLabel("Full dataset counts");
  await expect(counts).toContainText("Invalid 63");
  await expect(counts).toContainText("Warning rows 1");
  await page.getByRole("button",{name:"Next page",exact:true}).click();
  await expect(page.getByRole("region",{name:"Output preview, scroll horizontally"})).toContainText("000050");
  await page.getByText("Inspect original source table",{exact:true}).click();
  const source=page.getByRole("region",{name:"Source table, scroll horizontally"});
  await page.getByLabel("Source row filter",{exact:true}).selectOption("exceptions");
  await expect(source).toContainText("=PRIVATE_U14_WARNING");
  await page.getByLabel("Source row filter",{exact:true}).selectOption("invalid");
  await expect(source).not.toContainText("=PRIVATE_U14_WARNING");
  await expect(source.locator("tbody tr")).toHaveCount(50);
  await page.getByRole("button",{name:"Correct Units, record 3",exact:true}).click();
  await page.getByLabel("Replacement for Units, record 3",{exact:true}).fill("12");
  await page.getByRole("button",{name:"Next source page",exact:true}).click();
  await page.getByRole("button",{name:"Correct Units, record 103",exact:true}).click();
  await page.getByLabel("Replacement for Units, record 103",{exact:true}).fill("20");
  await page.getByLabel("Source row filter",{exact:true}).selectOption("all");
  await expect(page.getByRole("button",{name:"Apply 2 corrections",exact:true}).first()).toBeEnabled();
  await expect(page.getByRole("button",{name:"Download converted CSV",exact:true})).toBeDisabled();
  await apply(page,2);
  await expect(counts).toContainText("Invalid 61");
  await expect(counts).toContainText("Corrected 2");
  await expect(page.getByRole("region",{name:"Output preview, scroll horizontally"})).toContainText("000050");
  await expect(page.getByRole("status").filter({hasText:"Applied 2 corrections"})).toBeVisible();
  await page.getByLabel("Preserve raw text for TMS import").check();
  await page.getByLabel(/I acknowledge that .* invalid rows will be excluded/).check();
  await expect(counts).toContainText("Warning rows 1");
  const expected=Array.from({length:125},(_,i)=>i%2===0 && i!==124 || i===1 || i===101 ? `${i===0 ? "=PRIVATE_U14_WARNING" : String(i).padStart(6,"0")},${i===101?"5":"3"}\r\n`:"").join("");
  expect((await download(page)).toString()).toBe("Reference,ConvertedCases\r\n"+expected);
  if(info.project.name==="chromium") {
    await page.screenshot({path:"docs/reviews/issue-14/screenshots/batch-desktop.png",fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:"docs/reviews/issue-14/screenshots/batch-mobile.png",fullPage:true});
  }
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  expect(unexpected).toEqual([]);
  await info.attach("batch-privacy.json",{body:JSON.stringify({unexpected}),contentType:"application/json"});
});

test("pending changes survive cancelled loss, failed replacement and inspection, with explicit discard",async({page})=>{
  await open(page,quantityWorkflow(),"ID,Units\n001234,Twelve");
  await page.getByLabel("Exception details").getByRole("button",{name:"Inspect Units, record 2",exact:true}).click();
  const input=page.getByLabel("Replacement for Units, record 2",{exact:true});
  await input.fill("12");
  await page.getByText("Inspect original source table",{exact:true}).click();
  await page.getByText("Inspect original source table",{exact:true}).click();
  await expect(input).toHaveValue("12");
  page.once("dialog",dialog=>dialog.dismiss());
  await page.getByRole("button",{name:"End session",exact:true}).click();
  await expect(input).toHaveValue("12");
  await page.getByLabel("Upload source CSV",{exact:true}).setInputFiles({name:"invalid.csv",mimeType:"text/csv",buffer:Buffer.from("ID,ID\na,b")});
  await page.getByRole("button",{name:"Keep current source",exact:true}).click();
  await expect(input).toHaveValue("12");
  await page.getByLabel("Upload source CSV",{exact:true}).setInputFiles({name:"invalid.csv",mimeType:"text/csv",buffer:Buffer.from("ID,ID\na,b")});
  await page.getByRole("button",{name:"Replace source and discard corrections",exact:true}).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(input).toHaveValue("12");
  page.once("dialog",dialog=>dialog.dismiss());
  await page.getByRole("button",{name:"Discard pending changes",exact:true}).click();
  await expect(input).toHaveValue("12");
  page.once("dialog",dialog=>dialog.accept());
  await page.getByRole("button",{name:"Discard pending changes",exact:true}).click();
  await expect(input).toHaveValue("Twelve");
  await expect(page.getByRole("button",{name:"Download converted CSV",exact:true})).toBeDisabled();
});

test("rule failures open settings instead of highlighting valid source data",async({page})=>{
  const w=quantityWorkflow();
  w.fields[1].recipe={kind:"calculate",operation:"divide",left:{kind:"source",source:"units"},right:{kind:"number",decimal:"3"}};
  await open(page,w,"ID,Units\n001234,1");
  const review=page.getByLabel("Exception details");
  await expect(review.getByRole("button",{name:/Inspect/})).toHaveCount(0);
  await review.getByRole("button",{name:"Review ConvertedCases settings",exact:true}).click();
  await expect(page.getByRole("dialog",{name:/ConvertedCases.*column settings/})).toBeVisible();
  await closeSettings(page);
  await page.getByRole("button",{name:"Done editing",exact:true}).click();
  await expect(page.getByRole("button",{name:"Download converted CSV",exact:true})).toBeDisabled();
});

test("off-page Excel exception navigation preserves worksheet provenance and reaches the next unresolved record",async({page},info)=>{
  const w=quantityWorkflow();w.source.referencedHeaders=referencedHeaders(w.fields);
  const book=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([["ID","Units"],...Array.from({length:105},(_,i)=>[String(i).padStart(6,"0"),i===53 || i===101 ? "Twelve" : "12"])]),"Orders");
  await page.goto("/");
  await page.getByLabel("Import workflow",{exact:true}).setInputFiles({name:"synthetic.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(w))});
  await page.getByLabel("Upload source CSV",{exact:true}).setInputFiles({name:"synthetic.xlsx",mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",buffer:Buffer.from(XLSX.write(book,{type:"buffer",bookType:"xlsx"}))});
  await expect(page.getByLabel("Full dataset counts")).toContainText("Invalid 2");
  await page.getByLabel("Show only rows with exceptions").check();
  await page.getByLabel("Exception details").getByRole("button",{name:"Inspect Units, record 103",exact:true}).click();
  const input=page.getByLabel("Replacement for Units, record 103",{exact:true});
  await expect(input).toBeFocused();
  await expect(page.getByText("Source page 3 of 3",{exact:true})).toBeVisible();
  await expect(page.getByRole("region",{name:"Source table, scroll horizontally"})).toContainText("Worksheet Orders");
  await input.fill("12");
  if(info.project.name==="chromium") {
    await page.locator(".source-inspection").screenshot({path:"docs/reviews/issue-14/screenshots/highlighted-pending.png"});
  }
  await apply(page,1);
  await expect(page.getByRole("region",{name:"Source table, scroll horizontally"})).toContainText("Original: Twelve");
  await page.getByRole("button",{name:"Next unresolved record",exact:true}).click();
  await expect(page.getByLabel("Replacement for Units, record 55",{exact:true})).toBeFocused();
});
