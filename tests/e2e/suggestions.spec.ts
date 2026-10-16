import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { add, upload, download, map, fixed } from "./helpers";

test("keyboard accept/reject leaves candidates unconfirmed and existing recipes authoritative", async ({ page }) => {
  await page.goto("/");
  await upload(page, "Ship To,PO #,Bill To,Sales Order,Shipment ID,Quantity Cases\nDepot,000123,Billing,000456,S001,2");
  await add(page, ["Consignee", "Purchase Order Reference", "Stop ID", "Quantity Units"]);
  await expect(page.getByRole("button", { name: "Accept Ship To for Consignee", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Unlink Consignee", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download converted CSV", exact: true })).toBeDisabled();
  const reject = page.getByRole("button", { name: "Reject PO # for Purchase Order Reference", exact: true });
  await reject.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Accept PO # for Purchase Order Reference", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Select output Purchase Order Reference", exact: true })).toBeFocused();
  const accept = page.getByRole("button", { name: "Accept Ship To for Consignee", exact: true });
  await accept.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Unlink Consignee", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Select output Consignee", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Unlink Consignee", exact: true }).click();
  await map(page, "Consignee", "bill to");
  await expect(page.getByRole("button", { name: "Select output Consignee", exact: true })).toContainText("Confirmed · copies Bill To");
  await expect(page.getByRole("button", { name: "Accept Ship To for Consignee", exact: true })).toHaveCount(0);
  await map(page, "Purchase Order Reference", "po #");
  await expect(page.getByRole("button", { name: "Select output Purchase Order Reference", exact: true })).toContainText("Confirmed · copies PO #");
  await fixed(page, "Consignee", "text", "Fixed Depot");
  await expect(page.getByRole("button", { name: "Accept Ship To for Consignee", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Select output Consignee", exact: true })).toContainText('Fixed text · "Fixed Depot"');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("ambiguous exact/dictionary candidates remain alternatives until an explicit choice", async ({ page }) => {
  await page.goto("/"); await upload(page, "Ship To,Consignee\nDepot A,Depot B"); await add(page, ["Consignee"]);
  await expect(page.getByRole("button", { name: "Accept Ship To for Consignee", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept Consignee for Consignee", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Download converted CSV", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Accept Consignee for Consignee", exact: true }).click();
  expect((await download(page)).toString()).toBe("Consignee\r\nDepot B\r\n");
});

async function watchPrivacy(context: BrowserContext) {
  const unexpected: string[] = [];
  const diagnostics: string[] = [];
  const privateContent = /U5_PRIVATE|Ship%20To|Ship To|Consignee|PO #/i;
  const assets = new Set(["/", "/index.html", ...(await readdir("dist/assets")).map((name) => `/assets/${name}`)]);
  await context.route("**/*", async (route) => {
    const request = route.request(), url = new URL(request.url());
    const payload = JSON.stringify([request.url(), request.headers(), request.postData()]);
    if (url.origin !== "http://127.0.0.1:4173" || request.method() !== "GET" || url.search ||
      !assets.has(url.pathname) || privateContent.test(payload)) {
      unexpected.push(payload); await route.abort();
    } else await route.continue();
  });
  await context.routeWebSocket(/.*/, (socket) => { unexpected.push(socket.url()); socket.close(); });
  const observe = (page: Page) => {
    page.on("console", (message) => diagnostics.push(message.text()));
    page.on("pageerror", (error) => diagnostics.push(error.message));
  };
  context.on("page", observe);
  context.pages().forEach(observe);
  return () => {
    expect(unexpected).toEqual([]);
    expect(diagnostics.filter((message) => privateContent.test(message))).toEqual([]);
  };
}

test("only accepted mappings save, back up and rerun; renamed headers still block", async ({ page, context, browser }) => {
  const verifyPrivacy = await watchPrivacy(context);
  const response = await page.goto("/");
  expect(response!.headers()["content-security-policy"]).toContain("connect-src 'none'");
  await upload(page, "Ship To,PO #,U5_PRIVATE_HEADER\nU5_PRIVATE_DEPOT,U5_PRIVATE_ORDER_000123,unused", "U5_PRIVATE_FILE.csv");
  await add(page, ["Consignee", "Purchase Order Reference"]);
  await page.getByRole("button", { name: "Accept Ship To for Consignee", exact: true }).click();
  await page.getByRole("button", { name: "Save workflow", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Workflow configuration is invalid" })).toBeVisible();
  await page.getByRole("button", { name: "Reject PO # for Purchase Order Reference", exact: true }).click();
  await page.getByRole("button", { name: "Download workflow", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Workflow configuration is invalid" })).toBeVisible();
  await page.getByRole("button", { name: "Edit Purchase Order Reference", exact: true }).click();
  await page.getByRole("button", { name: "Remove Purchase Order Reference", exact: true }).click();
  await page.getByLabel("Workflow name", { exact: true }).fill("Synthetic U5");
  await page.getByRole("button", { name: "Save workflow", exact: true }).click();
  await expect(page.getByText("Saved in this browser.", { exact: true })).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download workflow", exact: true }).click();
  const json = await readFile((await (await pending).path())!, "utf8");
  expect(JSON.parse(json).fields).toMatchObject([{ header: "Consignee", recipe: { kind: "copy", source: "ship to" } }]);
  expect(json).not.toMatch(/U5_PRIVATE|suggest|reject|po #/i);
  verifyPrivacy();
  await page.reload();
  await page.getByLabel("Saved workflows", { exact: true }).selectOption({ label: "Synthetic U5" });
  await page.getByRole("button", { name: "Open workflow", exact: true }).click();
  await expect(page.getByRole("region", { name: "Repeat workflow", exact: true })).toContainText("Synthetic U5");
  await upload(page, "Extra,Ship To\nunused,U5_PRIVATE_REUSED_DEPOT");
  expect((await download(page)).toString()).toBe("Consignee\r\nU5_PRIVATE_REUSED_DEPOT\r\n");
  const fresh = await browser.newContext({ baseURL: "http://127.0.0.1:4173", serviceWorkers: "block" });
  try {
    const verifyPortablePrivacy = await watchPrivacy(fresh);
    const next = await fresh.newPage(); await next.goto("/");
    await next.getByLabel("Import workflow", { exact: true }).setInputFiles({ name: "synthetic.json", mimeType: "application/json", buffer: Buffer.from(json) });
    await expect(next.getByRole("button", { name: "Edit workflow", exact: true })).toBeVisible();
    await upload(next, "Ship To\nU5_PRIVATE_PORTABLE_DEPOT", "U5_PRIVATE_PORTABLE.csv");
    expect((await download(next)).toString()).toBe("Consignee\r\nU5_PRIVATE_PORTABLE_DEPOT\r\n");
    await upload(next, "Consignee\nU5_PRIVATE_RENAMED_DEPOT");
    await expect(next.getByRole("button", { name: "Download converted CSV", exact: true })).toBeDisabled();
    await next.getByRole("button", { name: "Edit workflow", exact: true }).click();
    await expect(next.getByRole("button", { name: "Select output Consignee", exact: true })).toContainText("Confirmed · copies ship to");
    await expect(next.getByRole("button", { name: /^Accept / })).toHaveCount(0);
    verifyPortablePrivacy();
  } finally { await fresh.close(); }
  verifyPrivacy();
});
