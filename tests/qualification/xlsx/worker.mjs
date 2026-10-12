import * as XLSX from "./node_modules/xlsx/xlsx.mjs";
import { Inflate } from "./node_modules/fflate/esm/browser.js";
const options = {
  type: "array",
  cellNF: true,
  cellText: true,
  cellFormula: true,
  cellDates: false,
  sheetStubs: true,
  cellHTML: false,
  sheets: ["Synthetic"],
};
self.onmessage = async ({ data }) => {
  const start = performance.now();
  try {
    const bytes = new Uint8Array(data.bytes);
    let resource;
    if (data.mode === "small" && bytes.length > 25 * 1024 * 1024)
      throw new Error("Source exceeds 25 MiB");
    if (data.mode === "guard") {
      const { preflight } = await import("./preflight.mjs");
      self.postMessage({ stage: "preflight-start" });
      resource = await preflight(bytes, data.budget, data.implementation);
    }
    if (data.mode === "inflate") {
      let actual = 0,
        maxChunk = 0;
      const stream = new Inflate((chunk) => {
        actual += chunk.length;
        maxChunk = Math.max(maxChunk, chunk.length);
      });
      const step = data.step || bytes.length;
      for (let i = 0; i < bytes.length; i += step)
        stream.push(bytes.subarray(i, i + step), i + step >= bytes.length);
      self.postMessage({
        ok: true,
        actual,
        maxChunk,
        ms: performance.now() - start,
      });
      return;
    }
    if (data.mode === "wait") {
      while (true) {}
    }
    self.postMessage({ stage: "parse-start" });
    const wb = XLSX.read(bytes, { ...options, ...data.options });
    const sheet = wb.Sheets.Synthetic;
    const interpretation = {};
    for (const [ref, c] of Object.entries(sheet)) {
      if (ref.startsWith("!") || (!data.full && !/^[A-N]2$/.test(ref)))
        continue;
      const warnings = [];
      if (c.f) warnings.push("STALE_FORMULA_CACHE");
      if (c.t === "n" && Number.isInteger(c.v) && Math.abs(c.v) >= 1e15)
        warnings.push("NUMERIC_IDENTIFIER_PRECISION");
      if (
        c.z &&
        c.z !== "General" &&
        !/^0+$/.test(c.z) &&
        !XLSX.SSF.is_date(c.z)
      )
        warnings.push("UNSUPPORTED_IDENTIFIER_FORMAT");
      const item = {
        warnings,
        cacheUsable:
          !c.f ||
          (c.t !== "z" &&
            c.t !== "e" &&
            c.v !== undefined &&
            (c.t !== "n" || Number.isFinite(c.v))),
      };
      if (c.t === "n" && XLSX.SSF.is_date(c.z)) {
        const epoch = wb.Workbook.WBProps.date1904;
        const d = XLSX.SSF.parse_date_code(c.v, { date1904: epoch });
        if (!Number.isInteger(c.v))
          item.dateError = "UNSUPPORTED_TIME_COMPONENT";
        else if (
          !d ||
          c.v < 0 ||
          (!epoch && c.v === 60) ||
          d.y > 9999 ||
          d.d < 1
        )
          item.dateError = "INVALID_EXCEL_DATE";
        else item.date = { year: d.y, month: d.m, day: d.d };
      }
      interpretation[ref] = item;
    }
    const count = Object.keys(sheet).filter((k) => !k.startsWith("!")).length;
    let output;
    const decimals = [
      "0.3",
      "12.5",
      "123456789012345.1",
      "12345678901234567",
      "0.30000000000000004",
    ].map((text) => ({
      text,
      representable:
        Number.isFinite(Number(text)) &&
        String(Number(text)) === text &&
        text.replace(/^[+-]?0*|\./g, "").replace(/0+$/, "").length <= 15,
    }));
    if (data.export) {
      const fresh = XLSX.utils.book_new();
      const out = XLSX.utils.aoa_to_sheet([
        ["Reference", "Formula-like", "Number", "Date", "Blank"],
        ["001234", '=WEBSERVICE("https://example.invalid")', 0.3, 45352, null],
      ]);
      out.D2.z = "yyyy-mm-dd";
      XLSX.utils.book_append_sheet(fresh, out, "Values");
      output = Array.from(
        new Uint8Array(
          XLSX.write(fresh, {
            type: "array",
            bookType: "xlsx",
            compression: true,
          }),
        ),
      );
    }
    self.postMessage({
      ok: true,
      resource,
      interpretation,
      decimals,
      sheets: wb.SheetNames,
      epoch: wb.Workbook.WBProps.date1904,
      cells: data.full
        ? sheet
        : Object.fromEntries(
            Object.entries(sheet).filter(
              ([k]) => k.startsWith("!") || /^[A-N]2$/.test(k),
            ),
          ),
      count,
      output,
      ms: performance.now() - start,
    });
  } catch (e) {
    self.postMessage({
      ok: false,
      error: e.message,
      ms: performance.now() - start,
    });
  }
};
