import { afterEach, expect, test, vi } from "vitest";
import { zipSync, unzipSync } from "fflate";
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
import { preflight } from "../../src/formats/archive-budget";
// @ts-expect-error U1's independent synthetic OOXML generator is JavaScript.
import { workbook, hostile, representative } from "../qualification/xlsx/fixtures.mjs";

test("accepts the verified archive unchanged and counts actual expansion", async () => {
  const bytes: Uint8Array = workbook("");
  const original = bytes.slice();
  const result = await preflight(bytes);
  expect(result.actualBytes).toBe(result.declaredBytes);
  expect(result.entries).toBe(8);
  expect(bytes).toEqual(original);
});

const attacks = hostile() as Record<string, Uint8Array>;
for (const [name, bytes] of Object.entries(attacks)) {
  test(`rejects U1 hostile workbook: ${name}`, async () => {
    await expect(preflight(bytes, name === "bomb" ? 1024 * 1024 : undefined)).rejects.toThrow();
  });
}

test("accepts the 10,000-row, 20-column workbook without truncation", async () => {
  const result = await preflight(representative());
  expect(result.cells).toBe(200022);
  expect(result.actualBytes).toBeGreaterThan(8_000_000);
});

test("aborts before expansion and while streaming", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(preflight(workbook(""), undefined, controller.signal)).rejects.toThrow(/cancel/i);
  const during = new AbortController();
  const pending = preflight(representative(), undefined, during.signal);
  setTimeout(() => during.abort(), 0);
  await expect(pending).rejects.toThrow(/cancel/i);
});


test("rejects cancellation during the final member yield", async () => {
  const bytes = zipSync(unzipSync(workbook("")), { level: 0 });
  const controller = new AbortController();
  const realTimeout = setTimeout;
  let yields = 0;
  vi.stubGlobal("setTimeout", (callback: () => void, delay: number) =>
    realTimeout(() => {
      if (++yields === 8) controller.abort();
      callback();
    }, delay),
  );
  await expect(preflight(bytes, undefined, controller.signal)).rejects.toThrow(/cancel/i);
  expect(yields).toBe(8);
});

test.each([['"', "'"], ["'", '"']])("bounds the whole %s-quoted format containing the opposite quote", async (quote, opposite) => {
  const format = `0${opposite}${"0".repeat(300)}`;
  const bytes = workbook("", { extra: { "xl/styles.xml": `<styleSheet><numFmt formatCode=${quote}${format}${quote}/></styleSheet>` } });
  await expect(preflight(bytes)).rejects.toThrow(/256/);
});

test("treats reference-like cell text, comments, CDATA and processing instructions as data", async () => {
  const bytes = workbook(`<row r="1"><c r="A1" t="inlineStr"><is><t>ref="ORDER-123" sqref='not-a-range'</t></is></c></row><!-- ref="OTHER" --><?test ref="OTHER"?><![CDATA[<c r="XFD1048576"/>]]>`, { dimension: "A1:A1" });
  await expect(preflight(bytes)).resolves.toMatchObject({ cells: 3 });
  await expect(preflight(workbook("", { dimension: "ORDER-123" }))).rejects.toThrow(/address/);
});

test.each(["xl/worksheets/sheet1.xml", "xl/_rels/workbook.xml.rels"])("rejects repeated unterminated tags in %s", async (path) => {
  const tag = path.endsWith("rels") ? "<Relationship " : '<c r="A1" ';
  const bytes = workbook("", { extra: { [path]: `<worksheet>${tag.repeat(10000)}</worksheet>` } });
  await expect(preflight(bytes)).rejects.toThrow(/XML/);
});

test("interrupts a pending stream read without waiting for another chunk", async () => {
  const cancel = vi.fn();
  let reading!: () => void;
  const started = new Promise<void>((resolve) => { reading = resolve; });
  vi.stubGlobal("DecompressionStream", class {
    readable = new ReadableStream({ pull() { reading(); }, cancel });
    writable = new WritableStream();
  });
  const controller = new AbortController();
  const remove = vi.spyOn(controller.signal, "removeEventListener");
  const pending = preflight(workbook(""), undefined, controller.signal);
  await started;
  controller.abort();
  await expect(pending).rejects.toThrow(/cancel/i);
  expect(cancel).toHaveBeenCalledOnce();
  expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
});

test.each([false, true])("removes the stream abort listener on decompression failure=%s", async (failure) => {
  const controller = new AbortController();
  const add = vi.spyOn(controller.signal, "addEventListener");
  const remove = vi.spyOn(controller.signal, "removeEventListener");
  if (failure) vi.stubGlobal("DecompressionStream", class {
    readable = new ReadableStream({ start(c) { c.error(new Error("synthetic decode failure")); } });
    writable = new WritableStream();
  });
  const pending = preflight(workbook(""), undefined, controller.signal);
  if (failure) await expect(pending).rejects.toThrow(/synthetic decode failure/);
  else await pending;
  for (const [event, listener] of add.mock.calls)
    if (event === "abort") expect(remove).toHaveBeenCalledWith("abort", listener);
});

test("checks decoded attributes and ignores metadata-like text inside another attribute", async () => {
  const styles = (format: string) => workbook("", { extra: { "xl/styles.xml": `<styleSheet><numFmt formatCode="${format}"/></styleSheet>` } });
  await expect(preflight(styles("&#48;".repeat(256)))).resolves.toBeDefined();
  await expect(preflight(styles("&#48;".repeat(257)))).rejects.toThrow(/256/);
  await expect(preflight(styles("0' > ref='ORDER-123'"))).resolves.toBeDefined();
  await expect(preflight(workbook("", { dimension: "A1&#58;XFD1048576" }))).rejects.toThrow(/2 million/);
  await expect(preflight(styles("&constructor;"))).rejects.toThrow(/XML entity/);
});

test("preserves U1 bounds for namespace-prefixed structural attributes", async () => {
  const bytes = workbook("", { extra: { "xl/worksheets/sheet1.xml": '<worksheet xmlns:x="urn:synthetic"><dimension ref="A1:A1"/><hyperlinks><hyperlink x:ref="A1:XFD1048576"/></hyperlinks></worksheet>' } });
  await expect(preflight(bytes)).rejects.toThrow(/2 million/);
  const styles = workbook("", { extra: { "xl/styles.xml": `<styleSheet xmlns:x="urn:synthetic"><numFmt x:formatCode="${"0".repeat(257)}"/></styleSheet>` } });
  await expect(preflight(styles)).rejects.toThrow(/256/);
});
