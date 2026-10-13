import { test, expect } from "@playwright/test";
import { upload, add, map, preview, download } from "./helpers";

test("automatic preview, reusable drag mapping and keyboard alternative", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, "ID,Name\n001234,Depot");
  await add(page, ["Reference", "Copy", "Customer"]);
  await expect(
    page.getByRole("button", { name: "Preview all rows" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Select source ID", exact: true })
    .dragTo(page.getByLabel("Mapping position for Reference"));
  await page
    .getByRole("button", { name: "Select source ID", exact: true })
    .dragTo(page.getByLabel("Mapping position for Copy"));
  const source = page.getByRole("button", {
    name: "Select source Name",
    exact: true,
  });
  await source.focus();
  await source.press("Enter");
  await expect(source).toBeFocused();
  await page
    .getByRole("button", {
      name: "Match selected source to Customer",
      exact: true,
    })
    .press("Enter");
  await expect(
    page.getByLabel("Copy source for Customer", { exact: true }),
  ).toBeFocused();
  await preview(page);
  expect((await download(page)).toString()).toBe(
    "Reference,Copy,Customer\r\n001234,001234,Depot\r\n",
  );
  await source.dragTo(page.getByLabel("Mapping position for Copy"));
  await preview(page);
  expect((await download(page)).toString()).toBe(
    "Reference,Copy,Customer\r\n001234,Depot,Depot\r\n",
  );
  await page.getByRole("button", { name: "Unlink Copy", exact: true }).click();
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

test("25 sources and 30 ordered destinations remain searchable and aligned", async ({
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
  await page
    .getByRole("button", { name: "Select source Source 25", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Match selected source to Output 30",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Copy source for Output 30", { exact: true }),
  ).toHaveValue("source 25");
  await page.getByLabel("Search source columns").fill("");
  for (let i = 1; i <= 29; i++)
    await map(page, `Output ${i}`, `source ${((i - 1) % 25) + 1}`);
  await preview(page);
  const bytes = (await download(page)).toString();
  expect(bytes.split("\r\n")[0].split(",")).toHaveLength(30);
  expect(bytes.split("\r\n")[1].split(",").at(-1)).toBe("0024");
  for (const width of [1440, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    const slot = await page
      .getByLabel("Mapping position for Output 30")
      .boundingBox();
    const name = await page
      .getByLabel("Output column name", { exact: true })
      .last()
      .boundingBox();
    expect(slot && name && Math.abs(slot.y - name.y)).toBeLessThan(20);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("rapid edits debounce and never enable an old export", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, "ID,Name\n001234,Depot");
  await add(page, ["Reference"]);
  await map(page, "Reference", "id");
  await preview(page);
  const name = page.getByLabel("Output column name", { exact: true });
  await name.fill("Draft");
  await expect(
    page.getByRole("button", { name: "Download converted CSV" }),
  ).toBeDisabled();
  await name.fill("Final");
  await map(page, "Final", "name");
  await preview(page);
  expect((await download(page)).toString()).toBe("Final\r\nDepot\r\n");
});

test("edits during an older worker evaluation queue the latest draft", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      postMessage(
        message: unknown,
        options: Transferable[] | StructuredSerializeOptions = [],
      ) {
        // Delay delivery only; the production worker evaluates each real request.
        if ((message as { kind?: string }).kind === "run")
          setTimeout(() => {
            if (Array.isArray(options)) super.postMessage(message, options);
            else super.postMessage(message, options);
          }, 650);
        else if (Array.isArray(options)) super.postMessage(message, options);
        else super.postMessage(message, options);
      }
    };
  });
  await page.goto("/");
  await upload(page, "ID,Name\n001234,Depot");
  await add(page, ["Reference"]);
  await map(page, "Reference", "id");
  await expect(page.locator(".status-bar [role=status]")).toContainText(
    "Checking all rows",
  );
  await page.getByLabel("Output column name", { exact: true }).fill("Latest");
  await map(page, "Latest", "name");
  await expect(
    page.getByRole("button", { name: "Download converted CSV" }),
  ).toBeDisabled();
  await preview(page);
  expect((await download(page)).toString()).toBe("Latest\r\nDepot\r\n");
  await page
    .getByLabel("Output column name", { exact: true })
    .fill("Cancelled");
  await expect(page.locator(".status-bar [role=status]")).toContainText(
    "Checking all rows",
  );
  await page
    .getByLabel("Output column name", { exact: true })
    .fill("Recovered");
  await map(page, "Recovered", "id");
  await page.getByRole("button", { name: "Cancel processing" }).click();
  await page.getByRole("button", { name: "Retry active file" }).click();
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
  await expect(name).toHaveValue("Reference");
  expect((await download(page)).toString()).toBe("Reference\r\n001234\r\n");
  await template.setInputFiles({
    name: "synthetic-template.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Order,Receiver\n"),
  });
  await page.getByRole("button", { name: "Replace output columns" }).click();
  await expect(
    page.getByLabel("Output column name", { exact: true }),
  ).toHaveCount(2);
  await expect(
    page.getByLabel("Copy source for Order", { exact: true }),
  ).toHaveValue("");
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
  await page.getByLabel("Output column name", { exact: true }).fill("Final");
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
  await page.clock.install();
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
  await page
    .getByRole("button", { name: "Remove Reference", exact: true })
    .click();
  await expect(page.locator(".review")).toContainText(
    "Add an output column or import a template to start matching.",
  );
  await expect(
    page.getByRole("button", { name: "Download converted CSV" }),
  ).toBeDisabled();
});
