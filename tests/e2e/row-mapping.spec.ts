import { test, expect } from "@playwright/test";
import {
  upload,
  add,
  map,
  preview,
  download,
  edit,
  closeSettings,
  rename,
  remove,
} from "./helpers";

const output = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("button", { name: `Select output ${name}`, exact: true });
const source = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("button", { name: `Select source ${name}`, exact: true });

test("both drag directions, grouping, source reuse, replacement and unlink preserve export order", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1400 });
  await page.goto("/");
  await upload(page, "ID,Name\n001234,Depot");
  await page.getByLabel("Upload destination CSV template").setInputFiles({
    name: "template.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Reference,Copy,Customer\n"),
  });
  const initial = await page.locator(".order-overflow").innerText();
  await source(page, "ID").dragTo(output(page, "Reference"));
  await expect(page.locator(".matched-scroll .pair")).toHaveCount(1);
  await output(page, "Customer").dragTo(source(page, "Name"));
  await expect(page.locator(".matched-scroll .pair")).toHaveCount(2);
  await source(page, "ID").dragTo(output(page, "Copy"));
  await expect(source(page, "ID")).toContainText("Used in 2 outputs");
  expect(await page.locator(".order-overflow").innerText()).toBe(initial);
  await preview(page);
  expect((await download(page)).toString()).toBe(
    "Reference,Copy,Customer\r\n001234,001234,Depot\r\n",
  );
  await source(page, "Name").dragTo(output(page, "Copy"));
  await expect(output(page, "Copy")).toContainText("copies Name");
  await preview(page);
  expect((await download(page)).toString()).toBe(
    "Reference,Copy,Customer\r\n001234,Depot,Depot\r\n",
  );
  await page.getByRole("button", { name: "Unlink Copy", exact: true }).click();
  await expect(output(page, "Copy")).toBeFocused();
  await expect(page.locator(".dest-list")).toContainText("Copy");
  expect(await page.locator(".order-overflow").innerText()).toBe(initial);
  await expect(
    page.getByRole("button", { name: "Download converted CSV" }),
  ).toBeDisabled();
  await preview(page);
  await expect(
    page.getByText(
      "Copy is unmapped. Choose a source column or remove this output column.",
    ),
  ).toBeVisible();
});

test("keyboard counterpart selection in both directions, Escape and pair reordering retain focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1400 });
  await page.goto("/");
  await upload(page, "ID,Name\n001234,Depot");
  await add(page, ["A", "Gap", "C"]);
  const status = page.locator(".mapping-status");
  await source(page, "ID").press("Enter");
  await expect(source(page, "ID")).toBeFocused();
  await expect(source(page, "ID")).toHaveAttribute("aria-pressed", "true");
  await expect(output(page, "A")).toHaveClass(/valid-target/);
  await expect(status).toContainText("ID selected. Select its counterpart");
  await output(page, "A").press("Enter");
  await expect(output(page, "A")).toBeFocused();
  await expect(source(page, "ID")).toHaveAttribute("aria-pressed", "false");
  await expect(output(page, "A")).toHaveAttribute("aria-pressed", "false");
  await expect(status).toContainText(
    "A now copies ID. Export order unchanged.",
  );
  await output(page, "C").press("Enter");
  await expect(output(page, "C")).toHaveAttribute("aria-pressed", "true");
  await expect(source(page, "Name")).toHaveClass(/valid-target/);
  await expect(status).toContainText("C selected. Select its counterpart");
  await source(page, "Name").press("Enter");
  await expect(output(page, "C")).toBeFocused();
  await expect(output(page, "C")).toHaveAttribute("aria-pressed", "false");
  await expect(source(page, "Name")).toHaveAttribute("aria-pressed", "false");
  await expect(status).toContainText(
    "C now copies Name. Export order unchanged.",
  );
  await source(page, "ID").press("Enter");
  await expect(source(page, "ID")).toHaveAttribute("aria-pressed", "true");
  await source(page, "ID").press("Enter");
  await expect(source(page, "ID")).toHaveAttribute("aria-pressed", "false");
  await expect(status).toHaveText("Selection cancelled.");
  await source(page, "ID").press("Enter");
  await source(page, "ID").press("Escape");
  await expect(source(page, "ID")).toHaveAttribute("aria-pressed", "false");
  await expect(output(page, "A")).not.toHaveClass(/valid-target/);
  await expect(status).toHaveText("Selection cancelled.");
  const grip = page.getByRole("button", {
    name: "Reorder pair C",
    exact: true,
  });
  await grip.press("Alt+ArrowUp");
  await expect(grip).toBeFocused();
  await expect(status).toContainText(
    "Pair reordered. Export order updated; unmatched output positions stayed fixed.",
  );
  expect(await page.locator(".order-chip").allTextContents()).toEqual([
    "1 · C",
    "2 · Gap",
    "3 · A",
  ]);
  await grip.press("Alt+ArrowDown");
  await expect(grip).toBeFocused();
  expect(await page.locator(".order-chip").allTextContents()).toEqual([
    "1 · A",
    "2 · Gap",
    "3 · C",
  ]);
  await grip.press("Alt+ArrowUp");
  await page
    .getByRole("button", { name: "Reorder pair A", exact: true })
    .dragTo(page.locator(".pair").first());
  expect(await page.locator(".order-chip").allTextContents()).toEqual([
    "1 · A",
    "2 · Gap",
    "3 · C",
  ]);
  await page
    .getByRole("button", { name: "Reorder pair A", exact: true })
    .dragTo(page.locator(".pair").last());
  expect(await page.locator(".order-chip").allTextContents()).toEqual([
    "1 · C",
    "2 · Gap",
    "3 · A",
  ]);
  await map(page, "Gap", "id");
  await preview(page);
  expect(
    await page
      .getByRole("region", { name: "Output preview, scroll horizontally" })
      .getByRole("columnheader")
      .allTextContents(),
  ).toEqual(["Source record / line", "Status", "C", "Gap", "A"]);
  expect((await download(page)).toString()).toBe(
    "C,Gap,A\r\nDepot,001234,001234\r\n",
  );
  await page.getByRole("button", { name: "Output order", exact: true }).click();
  await page.getByRole("button", { name: "Move Gap up", exact: true }).click();
  await closeSettings(page);
  await preview(page);
  expect((await download(page)).toString()).toBe(
    "Gap,C,A\r\n001234,Depot,001234\r\n",
  );
});

test("25 sources and 30 outputs stay searchable and aligned at desktop and laptop widths", async ({
  page,
}) => {
  const headers = Array.from({ length: 25 }, (_, i) => `Source ${i + 1}`);
  await page.goto("/");
  await upload(
    page,
    headers.join(",") + "\n" + headers.map((_, i) => `00${i}`).join(","),
  );
  await add(
    page,
    Array.from({ length: 30 }, (_, i) => `Output ${i + 1}`),
  );
  await page.getByLabel("Search source columns").fill("source 25");
  await expect(
    page.getByRole("button", { name: /^Select source / }),
  ).toHaveCount(1);
  await source(page, "Source 25").click();
  await output(page, "Output 30").click();
  await page.getByLabel("Search source columns").fill("");
  for (let i = 1; i <= 10; i++) await map(page, `Output ${i}`, `source ${i}`);
  for (const width of [1440, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator(".matched-scroll .pair")).toHaveCount(11);
    await expect(page.locator(".dest-list .card")).toHaveCount(19);
    await page.locator(".matched-scroll").evaluate((e) => {
      e.scrollTop = e.scrollHeight;
    });
    const a = await page
      .getByRole("button", {
        name: "Select paired source Source 25 for Output 30",
        exact: true,
      })
      .boundingBox();
    const b = await output(page, "Output 30").boundingBox();
    expect(a && b && Math.abs(a.y - b.y)).toBeLessThan(2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  for (let i = 11; i <= 29; i++)
    await map(page, `Output ${i}`, `source ${((i - 1) % 25) + 1}`);
  await preview(page);
  const bytes = (await download(page)).toString();
  expect(bytes.split("\r\n")[0].split(",")).toEqual(
    Array.from({ length: 30 }, (_, i) => `Output ${i + 1}`),
  );
  expect(bytes.split("\r\n")[1].split(",")).toEqual(
    Array.from({ length: 30 }, (_, i) => (i === 29 ? "0024" : `00${i % 25}`)),
  );
});

test("rapid edits debounce and never enable an old export", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, "ID,Name\n001234,Depot");
  await add(page, ["Reference"]);
  await map(page, "Reference", "id");
  await preview(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await rename(page, "Reference", "Draft");
  await expect(
    page.getByRole("button", { name: "Download converted CSV" }),
  ).toBeDisabled();
  await rename(page, "Draft", "Final");
  await map(page, "Final", "name");
  await page.clock.runFor(250);
  await preview(page);
  expect((await download(page)).toString()).toBe("Final\r\nDepot\r\n");
});

test("edits during an older worker evaluation queue the latest draft", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-14T00:00:00Z") });
  await page.addInitScript(() => {
    const runtime = Object.assign(window, {
      holdRuns: true,
      pendingRuns: [] as (() => void)[],
    });
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      postMessage(
        message: unknown,
        options: Transferable[] | StructuredSerializeOptions = [],
      ) {
        // Hold delivery, then send the genuine request to the production worker.
        const send = () => {
          if (Array.isArray(options)) super.postMessage(message, options);
          else super.postMessage(message, options);
        };
        if ((message as { kind?: string }).kind === "run" && runtime.holdRuns)
          runtime.pendingRuns.push(send);
        else send();
      }
    };
  });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-10-14T00:10:00Z"));
  await upload(page, "ID,Name\n001234,Depot");
  await add(page, ["Reference"]);
  await map(page, "Reference", "id");
  await page.clock.runFor(250);
  await expect(page.locator(".status-bar [role=status]")).toContainText(
    "Checking all rows",
  );
  await rename(page, "Reference", "Latest");
  await map(page, "Latest", "name");
  await expect(
    page.getByRole("button", { name: "Download converted CSV" }),
  ).toBeDisabled();
  await page.evaluate(() => Reflect.get(window, "pendingRuns").shift()?.());
  await expect(page.getByLabel("Upload source CSV")).toBeEnabled();
  // The older completion cannot make the newest draft exportable.
  await expect(
    page.getByRole("button", { name: "Download converted CSV" }),
  ).toBeDisabled();
  await page.clock.runFor(250);
  await page.evaluate(() => Reflect.get(window, "pendingRuns").shift()?.());
  await preview(page);
  expect((await download(page)).toString()).toBe("Latest\r\nDepot\r\n");
  await rename(page, "Latest", "Cancelled");
  await page.clock.runFor(250);
  await expect(page.locator(".status-bar [role=status]")).toContainText(
    "Checking all rows",
  );
  await rename(page, "Cancelled", "Recovered");
  await map(page, "Recovered", "id");
  await page.getByRole("button", { name: "Cancel processing" }).click();
  await page.evaluate(() => {
    Reflect.set(window, "holdRuns", false);
    Reflect.set(window, "pendingRuns", []);
  });
  await page.getByRole("button", { name: "Retry active file" }).click();
  await expect(page.getByLabel("Upload source CSV")).toBeEnabled();
  await page.clock.runFor(250);
  await preview(page);
  expect((await download(page)).toString()).toBe("Recovered\r\n001234\r\n");
});

test("template replacement is deliberate and failed parsing preserves mapped columns", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, "ID,Name\n001234,Depot");
  await page
    .getByRole("button", { name: "+ Add output column", exact: true })
    .click();
  const name = page.getByLabel("Output column name", { exact: true });
  await expect(name).toBeFocused();
  await name.fill("Reference");
  await closeSettings(page);
  await map(page, "Reference", "id");
  await preview(page);
  const template = page.getByLabel("Upload destination CSV template");
  await template.setInputFiles({
    name: "synthetic-template.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Order,Receiver\n"),
  });
  await page.getByRole("button", { name: "Keep current columns" }).click();
  expect((await download(page)).toString()).toBe("Reference\r\n001234\r\n");
  await template.setInputFiles({
    name: "broken-template.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Order,order\n"),
  });
  await page.getByRole("button", { name: "Replace output columns" }).click();
  await expect(page.locator(".status-bar [role=alert]")).toContainText(
    "duplicate source headers",
  );
  await expect(
    page.getByRole("button", { name: "Select output Reference", exact: true }),
  ).toContainText("Reference");
  expect((await download(page)).toString()).toBe("Reference\r\n001234\r\n");
  await template.setInputFiles({
    name: "synthetic-template.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Order,Receiver\n"),
  });
  await page.getByRole("button", { name: "Replace output columns" }).click();
  await expect(
    page.getByRole("button", { name: /^Select output / }),
  ).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Select output Order", exact: true }),
  ).toContainText("Unmatched");
  await expect(
    page.getByRole("button", { name: "Download converted CSV" }),
  ).toBeDisabled();
  await map(page, "Order", "id");
  await map(page, "Receiver", "name");
  await preview(page);
  expect((await download(page)).toString()).toBe(
    "Order,Receiver\r\n001234,Depot\r\n",
  );
});

test("automatic evaluation waits for a fresh 250 ms quiet period", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-13T00:00:00Z") });
  await page.addInitScript(() => {
    const runtime = Object.assign(window, { runSubmissions: 0 });
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      postMessage(
        message: unknown,
        options: Transferable[] | StructuredSerializeOptions = [],
      ) {
        if ((message as { kind?: string }).kind === "run")
          runtime.runSubmissions++;
        if (Array.isArray(options)) super.postMessage(message, options);
        else super.postMessage(message, options);
      }
    };
  });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-10-13T00:10:00Z"));
  await upload(page, "ID\n001234");
  await add(page, ["Reference"]);
  await map(page, "Reference", "id");
  await page.clock.runFor(249);
  expect(await page.evaluate(() => Reflect.get(window, "runSubmissions"))).toBe(
    0,
  );
  await rename(page, "Reference", "Final");
  await page.clock.runFor(249);
  expect(await page.evaluate(() => Reflect.get(window, "runSubmissions"))).toBe(
    0,
  );
  await page.clock.runFor(1);
  await preview(page);
  expect(await page.evaluate(() => Reflect.get(window, "runSubmissions"))).toBe(
    1,
  );
  expect((await download(page)).toString()).toBe("Final\r\n001234\r\n");
});

test("a failed automatic evaluation stops until explicit recovery", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-14T00:00:00Z") });
  await page.addInitScript(() => {
    const runtime = Object.assign(window, {
      runSubmissions: 0,
      failNextRun: true,
    });
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      postMessage(
        message: unknown,
        options: Transferable[] | StructuredSerializeOptions = [],
      ) {
        if ((message as { kind?: string }).kind === "run") {
          runtime.runSubmissions++;
          if (runtime.failNextRun) {
            runtime.failNextRun = false;
            this.dispatchEvent(
              new ErrorEvent("error", { message: "Synthetic worker failure" }),
            );
            return;
          }
        }
        if (Array.isArray(options)) super.postMessage(message, options);
        else super.postMessage(message, options);
      }
    };
  });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-10-14T00:10:00Z"));
  await upload(page, "ID\n001234");
  await add(page, ["Reference"]);
  await map(page, "Reference", "id");
  await page.clock.runFor(250);
  await expect(page.locator(".status-bar [role=alert]")).toContainText(
    "Processing worker stopped",
  );
  await page.clock.runFor(2000);
  expect(await page.evaluate(() => Reflect.get(window, "runSubmissions"))).toBe(
    1,
  );
  await page.getByRole("button", { name: "Retry active file" }).click();
  await expect(
    page.getByRole("heading", { name: "2. Match your columns" }),
  ).toBeVisible();
  await page.clock.runFor(250);
  await preview(page);
  expect((await download(page)).toString()).toBe("Reference\r\n001234\r\n");
});

test("zero output columns give an actionable empty state rather than a pending preview", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, "ID\n001234");
  await expect(page.locator(".review")).toContainText(
    "Add an output column or import a template to start matching.",
  );
  await add(page, ["Reference"]);
  await map(page, "Reference", "id");
  await preview(page);
  await remove(page, "Reference");
  await expect(page.locator(".review")).toContainText(
    "Add an output column or import a template to start matching.",
  );
  await expect(
    page.getByRole("button", { name: "Download converted CSV" }),
  ).toBeDisabled();
});

test("external drops cannot create mappings; contextual settings and deletion restore focus", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, "ID\n001234");
  await add(page, ["A", "B"]);
  await output(page, "A").evaluate((node) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/plain", "id");
    node.dispatchEvent(
      new DragEvent("dragover", { bubbles: true, dataTransfer }),
    );
    node.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer }));
  });
  await expect(page.locator(".pair")).toHaveCount(0);
  await expect(output(page, "A")).toContainText("Unmatched");
  await edit(page, "A");
  await page.getByLabel("Output column name", { exact: true }).press("Escape");
  await expect(
    page.getByRole("button", { name: "Edit A", exact: true }),
  ).toBeFocused();
  await remove(page, "A");
  await expect(output(page, "B")).toBeFocused();
});
