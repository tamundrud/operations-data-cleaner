import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { add, map, upload, preview, download } from "./helpers";

const database = "operations-data-cleaner-workflows";
async function records(page: Page) {
  return page.evaluate(async (name) => {
    if (!(await indexedDB.databases()).some((db) => db.name === name)) return [];
    return new Promise<{ id: string; json: string }[]>((resolve, reject) => {
      const open = indexedDB.open(name, 1);
      open.onerror = () => reject(new Error("Cannot inspect workflow storage"));
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction("workflows", "readonly");
        const read = tx.objectStore("workflows").getAll();
        tx.oncomplete = () => { db.close(); resolve(read.result); };
        tx.onabort = () => { db.close(); reject(new Error("Storage inspection aborted")); };
      };
    });
  }, database);
}
async function importFixture(page: Page) {
  await page.getByLabel("Import workflow", { exact: true }).setInputFiles("tests/fixtures/workflows/u4-supported.json");
  await expect(page.getByLabel("Workflow name", { exact: true })).toHaveValue("Synthetic reusable configuration");
}
async function save(page: Page) {
  await page.getByRole("button", { name: /^(Save workflow|Save changes)$/ }).click();
  await expect.poll(async () => (await records(page)).length).toBe(1);
}

test("ad hoc edits persist nothing; explicit save commits configuration that survives reload", async ({ page }) => {
  await page.goto("/");
  await upload(page, "Order\r\nSOURCE_ONLY_SENTINEL_006\r\n", "SOURCE_FILENAME_SENTINEL.csv");
  await add(page, ["Reference"]); await map(page, "Reference", "order");
  expect(await records(page)).toEqual([]);
  await page.getByLabel("Workflow name", { exact: true }).fill("Saved synthetic conversion");
  await save(page);
  const stored = await records(page);
  expect(Object.keys(stored[0]).sort()).toEqual(["id", "json"]);
  expect(stored[0].json).not.toContain("SOURCE_ONLY_SENTINEL_006");
  expect(stored[0].json).not.toContain("SOURCE_FILENAME_SENTINEL");
  expect(JSON.parse(stored[0].json).name).toBe("Saved synthetic conversion");
  await page.reload();
  await page.getByLabel("Saved workflows", { exact: true }).selectOption(stored[0].id);
  await page.getByRole("button", { name: "Open workflow", exact: true }).click();
  await expect(page.getByLabel("Workflow name", { exact: true })).toHaveValue("Saved synthetic conversion");
  expect(await records(page)).toEqual(stored);
});

test("two tabs cannot silently replace a workflow changed since opening", async ({ page, context }) => {
  await page.goto("/"); await importFixture(page); await save(page);
  const initial = (await records(page))[0];
  const second = await context.newPage(); await second.goto("/");
  await second.getByLabel("Saved workflows", { exact: true }).selectOption(initial.id);
  await second.getByRole("button", { name: "Open workflow", exact: true }).click();
  await page.getByLabel("Workflow name", { exact: true }).fill("First tab committed");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect.poll(async () => JSON.parse((await records(page))[0].json).name).toBe("First tab committed");
  const committed = await records(page);
  await second.getByLabel("Workflow name", { exact: true }).fill("Stale second tab");
  await second.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(second.getByText(/changed.*refresh|refresh.*review/i)).toBeVisible();
  expect(await records(second)).toEqual(committed);
  await expect(second.getByLabel("Workflow name", { exact: true })).toHaveValue("Stale second tab");
});

test("write abort after request success preserves the draft and independent portable download", async ({ page }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore["put"]>) {
      const request = put.apply(this, args);
      request.addEventListener("success", () => this.transaction.abort(), { once: true });
      return request;
    };
  });
  await page.goto("/"); await importFixture(page);
  await page.getByRole("button", { name: "Save workflow", exact: true }).click();
  await expect(page.getByText(/storage.*abort|write.*abort/i)).toBeVisible();
  expect(await records(page)).toEqual([]);
  await expect(page.getByLabel("Workflow name", { exact: true })).toHaveValue("Synthetic reusable configuration");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download workflow", exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("workflow.json");
  const backup = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(backup.name).toBe("Synthetic reusable configuration"); expect(backup.fields).toHaveLength(8);
});

test("corrupt records stay untouched while intact saved definitions remain available", async ({ page }) => {
  await page.goto("/"); await importFixture(page); await save(page);
  const intact = (await records(page))[0];
  await page.evaluate(async (name) => {
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open(name, 1);
      open.onsuccess = () => {
        const db = open.result; const tx = db.transaction("workflows", "readwrite");
        tx.objectStore("workflows").put({ id: "corrupt-synthetic", json: "{" });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onabort = () => { db.close(); reject(new Error("Could not install corrupt fixture")); };
      };
    });
  }, database);
  await page.reload();
  await expect(page.getByText(/unreadable|unsupported.*untouched/i)).toBeVisible();
  await page.getByLabel("Saved workflows", { exact: true }).selectOption(intact.id);
  await page.getByRole("button", { name: "Open workflow", exact: true }).click();
  await expect(page.getByLabel("Workflow name", { exact: true })).toHaveValue("Synthetic reusable configuration");
  expect(await records(page)).toEqual(expect.arrayContaining([intact, { id: "corrupt-synthetic", json: "{" }]));
});

test("save acknowledges its submitted snapshot while newer name edits remain unsaved", async ({ page }) => {
  await page.goto("/"); await importFixture(page);
  await page.evaluate(() => {
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (...args: Parameters<IDBFactory["open"]>) {
      const request = open.apply(this, args);
      request.addEventListener("success", (event) => {
        event.stopImmediatePropagation();
        Reflect.set(window, "releaseSyntheticWorkflowOpen", () => request.dispatchEvent(new Event("success")));
      }, { once: true });
      IDBFactory.prototype.open = open;
      return request;
    };
  });
  await page.getByRole("button", { name: "Save workflow", exact: true }).click();
  await expect.poll(() => page.evaluate(() => typeof Reflect.get(window, "releaseSyntheticWorkflowOpen"))).toBe("function");
  await page.getByLabel("Workflow name", { exact: true }).fill("Newer unsaved name");
  await page.evaluate(() => Reflect.get(window, "releaseSyntheticWorkflowOpen")());
  await expect(page.getByText("Saved in this browser.", { exact: true })).toBeVisible();
  const stored = await records(page);
  expect(JSON.parse(stored[0].json).name).toBe("Synthetic reusable configuration");
  await expect(page.getByLabel("Workflow name", { exact: true })).toHaveValue("Newer unsaved name");
  await expect(page.getByText("Unsaved configuration", { exact: true })).toBeVisible();
});

test("storage denial keeps portable workflow download and ad hoc processing available", async ({ page }) => {
  await page.addInitScript(() => { IDBFactory.prototype.open = () => { throw new DOMException("Synthetic denied storage", "SecurityError"); }; });
  await page.goto("/"); await importFixture(page);
  await page.getByRole("button", { name: "Save workflow", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /storage is unavailable/i })).toBeVisible();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download workflow", exact: true }).click();
  const file = await event;
  expect(JSON.parse(await readFile((await file.path())!, "utf8")).fields).toHaveLength(8);
  await page.getByLabel("Upload source CSV").setInputFiles({ name: "synthetic.csv", mimeType: "text/csv", buffer: Buffer.from("Order,Consignee,Note\n001234,Depot,note") });
  await expect(page.getByLabel("Full dataset counts")).toBeVisible();
});

test("a delayed saved-workflow read uses current confirmation after a draft edit", async ({ page }) => {
  await page.goto("/"); await importFixture(page); await save(page);
  const initial = (await records(page))[0];
  await page.reload(); await page.getByLabel("Saved workflows", { exact: true }).selectOption(initial.id);
  await page.getByRole("button", { name: "Open workflow", exact: true }).click();
  await expect(page.getByLabel("Workflow name", { exact: true })).toHaveValue("Synthetic reusable configuration");
  await page.evaluate(() => {
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (...args: Parameters<IDBFactory["open"]>) {
      const request = open.apply(this, args);
      request.addEventListener("success", (event) => {
        event.stopImmediatePropagation();
        Reflect.set(window, "releaseSyntheticSavedRead", () => request.dispatchEvent(new Event("success")));
      }, { once: true });
      IDBFactory.prototype.open = open;
      return request;
    };
  });
  await page.getByRole("button", { name: "Open workflow", exact: true }).click();
  await expect.poll(() => page.evaluate(() => typeof Reflect.get(window, "releaseSyntheticSavedRead"))).toBe("function");
  await page.getByLabel("Workflow name", { exact: true }).fill("Latest unsaved draft");
  let confirmations = 0;
  page.once("dialog", async (dialog) => { confirmations++; await dialog.dismiss(); });
  await page.evaluate(() => Reflect.get(window, "releaseSyntheticSavedRead")());
  await expect.poll(() => confirmations).toBe(1);
  await expect(page.getByLabel("Workflow name", { exact: true })).toHaveValue("Latest unsaved draft");
  expect(await records(page)).toEqual([initial]);
});


test("immediate source upload waits for the selected saved workflow to activate", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Import workflow", { exact: true }).setInputFiles("examples/u3-workflow.json");
  await expect(page.getByLabel("Workflow name", { exact: true })).toHaveValue("Synthetic fixed fields and trim");
  await save(page);
  const stored = (await records(page))[0];
  await page.reload();
  await page.getByLabel("Saved workflows", { exact: true }).selectOption(stored.id);
  await page.evaluate(() => {
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (...args: Parameters<IDBFactory["open"]>) {
      const request = open.apply(this, args);
      request.addEventListener("success", (event) => {
        event.stopImmediatePropagation();
        Reflect.set(window, "releaseImmediateOpen", () => request.dispatchEvent(new Event("success")));
      }, { once: true });
      IDBFactory.prototype.open = open;
      return request;
    };
  });
  await page.getByRole("button", { name: "Open workflow", exact: true }).click();
  await expect.poll(() => page.evaluate(() => typeof Reflect.get(window, "releaseImmediateOpen"))).toBe("function");
  const source = page.getByLabel("Upload source CSV");
  await expect(source).toBeDisabled();
  await expect(page.getByRole("status").filter({ hasText: "Opening workflow…" })).toBeVisible();
  await expect(page.getByLabel("Import workflow", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Try sample data", exact: true })).toBeDisabled();
  const chooserEvent = page.waitForEvent("filechooser");
  const immediateUpload = source.click();
  await page.evaluate(() => Reflect.get(window, "releaseImmediateOpen")());
  const chooser = await chooserEvent; await immediateUpload;
  await chooser.setFiles({ name: "synthetic-immediate.csv", mimeType: "text/csv", buffer: Buffer.from("Order,Consignee\n000088,  New depot  ") });
  await preview(page);
  await expect(page.getByLabel("Workflow name", { exact: true })).toHaveValue("Synthetic fixed fields and trim");
  await expect(page.getByRole("region", { name: "Repeat workflow", exact: true })).toContainText("5 output columns");
  expect(await download(page)).toEqual(Buffer.concat([Buffer.from([239, 187, 191]), Buffer.from("000088;0012;New depot;12.50;\r\n")]));
  expect(await records(page)).toEqual([stored]);
});


for (const outcome of ["cancel", "missing"] as const) {
  test(`pending Open releases controls after ${outcome} without activating a late workflow`, async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Import workflow", { exact: true }).setInputFiles("examples/u3-workflow.json");
    await expect(page.getByLabel("Workflow name", { exact: true })).toHaveValue("Synthetic fixed fields and trim");
    await upload(page, "Order,Consignee\n000099,Depot"); await preview(page);
    const previous = await download(page);
    await save(page);
    await page.evaluate(() => {
      const open = IDBFactory.prototype.open;
      IDBFactory.prototype.open = function (...args: Parameters<IDBFactory["open"]>) {
        const request = open.apply(this, args);
        request.addEventListener("success", (event) => {
          event.stopImmediatePropagation();
          Reflect.set(window, "releaseCancelledOpen", () => request.dispatchEvent(new Event("success")));
        }, { once: true });
        IDBFactory.prototype.open = open;
        return request;
      };
    });
    await page.getByRole("button", { name: "Open workflow", exact: true }).click();
    await expect.poll(() => page.evaluate(() => typeof Reflect.get(window, "releaseCancelledOpen"))).toBe("function");
    await expect(page.getByLabel("Upload source CSV")).toBeDisabled();
    if (outcome === "cancel") {
      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: "New conversion", exact: true }).click();
    } else {
      await page.evaluate(async () => new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("operations-data-cleaner-workflows", 1);
        request.onsuccess = () => {
          const db = request.result, tx = db.transaction("workflows", "readwrite");
          tx.objectStore("workflows").clear();
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onabort = () => { db.close(); reject(new Error("Synthetic deletion failed")); };
        };
      }));
    }
    await page.evaluate(() => Reflect.get(window, "releaseCancelledOpen")());
    if (outcome === "missing") {
      await expect(page.getByText("Saved workflow unavailable. Retry to refresh the list.", { exact: true })).toBeVisible();
      expect(await download(page)).toEqual(previous);
    } else {
      await upload(page, "Order,Consignee\n000100,New depot");
      await expect(page.getByLabel("Workflow name", { exact: true })).toHaveValue("");
      await expect(page.getByRole("button", { name: "Edit workflow", exact: true })).not.toBeVisible();
      await expect(page.getByText("Add an output column or import a template to start matching.", { exact: true })).toBeVisible();
    }
    await expect(page.getByLabel("Upload source CSV")).toBeEnabled();
    await expect(page.getByLabel("Import workflow", { exact: true })).toBeEnabled();
    await expect(page.getByRole("status").filter({ hasText: "Opening workflow…" })).not.toBeVisible();
  });
}
