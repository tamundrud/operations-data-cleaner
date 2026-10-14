import { test, expect } from "@playwright/test";
import { readdir } from "node:fs/promises";
import { upload, add, map, preview, download } from "./helpers";
test("production journey sends no customer values, file names or IDs and stores no source data", async ({
  context,
  page,
}) => {
  const sentinel = "PRIVATE_U2_SENTINEL_9X";
  const unexpected: string[] = [];
  const seen: string[] = [];
  const diagnostics: string[] = [];
  const assets = new Set(
    (await readdir("dist/assets")).map((f) => "/assets/" + f),
  );
  assets.add("/");
  assets.add("/index.html");
  await context.route("**/*", async (route) => {
    const r = route.request(),
      url = new URL(r.url()),
      payload = JSON.stringify([r.url(), r.headers(), r.postData()]);
    seen.push(r.url());
    if (
      payload.includes(sentinel) ||
      url.origin !== "http://127.0.0.1:4173" ||
      r.method() !== "GET" ||
      !assets.has(url.pathname) ||
      url.search
    ) {
      unexpected.push(payload);
      await route.abort();
    } else await route.continue();
  });
  await context.routeWebSocket(/.*/, (ws) => {
    unexpected.push("WebSocket " + ws.url());
    ws.close();
  });
  page.on("console", (m) => diagnostics.push(m.text()));
  page.on("pageerror", (e) => diagnostics.push(e.message));
  const response = await page.goto("/");
  expect(response!.headers()["content-security-policy"]).toContain(
    "connect-src 'none'",
  );
  expect(response!.headers()["content-security-policy"]).toContain(
    "style-src 'self'",
  );
  await upload(
    page,
    `ID,Note\n${sentinel},"<img src=x onerror=alert(1)>"`,
    `${sentinel}.csv`,
  );
  await add(page, ["Reference", "Note"]);
  await map(page, "Reference", "id");
  await page.getByLabel("Search source columns").fill("note");
  await page
    .getByRole("button", { name: "Select source Note", exact: true })
    .dragTo(page.getByLabel("Mapping position for Note"));
  await page.getByLabel("Search source columns").fill("");
  await page.getByRole("button", { name: "Unlink Note", exact: true }).click();
  await map(page, "Note", "note");
  await page.getByRole("button", { name: "Move Note up", exact: true }).click();
  await page
    .getByRole("button", { name: "Move Note down", exact: true })
    .click();
  await preview(page);
  expect((await download(page)).toString()).toContain(sentinel);
  await page
    .getByLabel("Output column name", { exact: true })
    .first()
    .fill(`${sentinel}_Header`);
  await preview(page);
  await download(page);
  await page.getByLabel("Show only rows with exceptions").check();
  await expect(page.getByLabel("Full dataset counts")).toBeVisible();
  const storage = await page.evaluate(async () => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
    dbs: await indexedDB.databases(),
    caches: await caches.keys(),
  }));
  expect(storage).toEqual({ local: [], session: [], dbs: [], caches: [] });
  expect(await page.locator("img").count()).toBe(0);
  expect(unexpected).toEqual([]);
  expect(diagnostics.filter((s) => s.includes(sentinel))).toEqual([]);
  // WebKit emits this exact blocked-style diagnostic during native file/form
  // interaction under our strict CSP. It does not correspond to an application
  // inline stylesheet (verified below); all other diagnostics remain failures.
  const webkitBlockedStyle =
    "Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' does not appear in the style-src directive of the Content Security Policy.";
  expect(
    diagnostics.filter(
      (message) =>
        !(test.info().project.name === "webkit" && message === webkitBlockedStyle),
    ),
  ).toEqual([]);
  // Preserve a positive style check so the WebKit exception cannot silently
  // hide loss of the actual external application stylesheet.
  expect(await page.locator("style, [style]").count()).toBe(0);
  expect(
    await page.locator(".matching").evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(255, 255, 255)");
  expect(seen.some((s) => s.includes("processing.worker"))).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Source table", exact: true }),
  ).not.toBeVisible();
  expect(unexpected).toEqual([]);
});
