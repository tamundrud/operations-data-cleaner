import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cpus, totalmem } from "node:os";
import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { unzipSync, strFromU8 } from "fflate";
import {
  fidelity,
  dates,
  hostile,
  representative,
  deflateBomb,
  alternateWorksheet,
} from "./fixtures.mjs";
const root = dirname(fileURLToPath(import.meta.url));
const allowed = new Map([
  ["/", "index.html"],
  ["/client.js", "client.js"],
  ["/worker.mjs", "worker.mjs"],
  ["/preflight.mjs", "preflight.mjs"],
  ["/node_modules/xlsx/xlsx.mjs", "node_modules/xlsx/xlsx.mjs"],
  ["/node_modules/fflate/esm/browser.js", "node_modules/fflate/esm/browser.js"],
]);
const server = createServer(async (req, res) => {
  const file = allowed.get(req.url);
  if (!file || req.method !== "GET") {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    const bytes = await readFile(resolve(root, file));
    res.writeHead(200, {
      "Content-Type": file.endsWith(".html") ? "text/html" : "text/javascript",
      "Cache-Control": "no-store",
      "Content-Security-Policy":
        "default-src 'none'; script-src 'self'; worker-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
    });
    res.end(bytes);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
const baseline = process.argv.includes("--baseline");
const fixtures = hostile(),
  large = representative();
const report = {
  date: new Date().toISOString(),
  baseline,
  node: process.version,
  platform: process.platform,
  cpu: cpus()[0].model,
  logicalCpus: cpus().length,
  ramBytes: totalmem(),
  fixtureBytes: { fidelity: fidelity.length, representative: large.length },
  browsers: [],
};
let failures = 0;
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const entry = { name, results: [], requests: [], diagnostics: [] };
    report.browsers.push(entry);
    let browser;
    try {
      browser = await engine.launch({
        headless: true,
        ...(name === "webkit" && process.env.ODC_WEBKIT_EXECUTABLE
          ? { executablePath: process.env.ODC_WEBKIT_EXECUTABLE }
          : {}),
      });
    } catch (e) {
      entry.unavailable = e.message;
      console.log(`${name}: unavailable`);
      continue;
    }
    entry.version = browser.version();
    let sampleTimer,
      cdp,
      sampling = false;
    if (name === "chromium") {
      cdp = await browser.newBrowserCDPSession();
      const sample = async () => {
        if (sampling) return;
        sampling = true;
        try {
          const { processInfo } = await cdp.send("SystemInfo.getProcessInfo");
          let rss = 0;
          for (const p of processInfo.filter((p) => p.type === "renderer"))
            try {
              const text = await readFile(`/proc/${p.id}/status`, "utf8");
              rss += Number(/VmRSS:\s+(\d+)/.exec(text)?.[1] || 0) * 1024;
            } catch {}
          entry.rendererRssPeakBytes = Math.max(
            entry.rendererRssPeakBytes || 0,
            rss,
          );
        } finally {
          sampling = false;
        }
      };
      await sample();
      entry.rendererRssBeforeBytes = entry.rendererRssPeakBytes;
      sampleTimer = setInterval(() => void sample().catch(() => {}), 100);
    }
    const context = await browser.newContext({
      serviceWorkers: "block",
      timezoneId: "America/Vancouver",
    });
    const intercept = (route) => {
      const req = route.request(),
        url = new URL(req.url());
      entry.requests.push({
        url: req.url(),
        headers: req.headers(),
        path: url.pathname,
        method: req.method(),
        body: req.postData(),
      });
      if (
        url.origin !== origin ||
        url.search ||
        JSON.stringify(req.headers()).includes("U1_PRIVATE_SENTINEL") ||
        !allowed.has(url.pathname) ||
        req.method() !== "GET" ||
        req.postData()
      ) {
        failures++;
        route.abort();
      } else route.continue();
    };
    await context.route("**/*", intercept);
    const page = await context.newPage();
    page.on("console", (m) => entry.diagnostics.push(m.text()));
    page.on("pageerror", (e) => entry.diagnostics.push(e.message));
    page.on("websocket", () => failures++);
    await page.goto(origin);
    const probe = (bytes, mode = "direct", extra = {}, timeout = 15000) =>
      page.evaluate(
        ({ bytes, mode, extra, timeout }) =>
          window.probe(
            {
              bytes: window.bytesFromBase64(bytes),
              mode,
              ...extra,
            },
            timeout,
          ),
        { bytes: Buffer.from(bytes).toString("base64"), mode, extra, timeout },
      );
    const check = async (label, fn) => {
      try {
        const observation = await fn();
        entry.results.push({ label, pass: true, observation });
        console.log(`${name}: PASS ${label}`);
      } catch (e) {
        failures++;
        entry.results.push({ label, pass: false, error: e.message });
        console.log(`${name}: FAIL ${label}: ${e.message.slice(0, 150)}`);
      }
    };
    await check("raw/display/type/format/formula metadata", async () => {
      const r = await probe(fidelity, baseline ? "direct" : "guard", {
        export: true,
      });
      assert.equal(r.ok, true, r.error);
      const c = r.cells;
      assert.equal(c.A2.t, "s");
      assert.equal(c.A2.v, "001234");
      assert.equal(c.B2.v, 1234);
      assert.equal(c.B2.w, "001234");
      assert.equal(c.B2.z, "000000");
      assert.equal(c.C2.v, 1234567890123456);
      assert.equal(c.D2.t, "b");
      assert.equal(c.E2.t, "e");
      assert.equal(c.F2.v, "  U1_PRIVATE_SENTINEL  ");
      assert.equal(c.G2.z, "[DBNum1]General");
      assert.equal(c.H2.v, 7);
      assert.ok(c.H2.f.includes("WEBSERVICE"));
      assert.ok(c.I2.f);
      assert.ok(c.J2.f);
      assert.equal(c.J2.t, "e");
      assert.equal(c.K2.v, "001234");
      assert.ok(c.N2.f);
      assert.equal(r.interpretation.I2.cacheUsable, false);
      assert.equal(r.interpretation.J2.cacheUsable, false);
      assert.equal(r.interpretation.K2.cacheUsable, true);
      assert.ok(r.interpretation.H2.warnings.includes("STALE_FORMULA_CACHE"));
      assert.ok(
        r.interpretation.C2.warnings.includes("NUMERIC_IDENTIFIER_PRECISION"),
      );
      assert.ok(
        r.interpretation.G2.warnings.includes("UNSUPPORTED_IDENTIFIER_FORMAT"),
      );
      assert.equal(r.sheets.length, 2);
      assert.equal(r.cells["!ref"], "A1:N2");
      assert.ok(
        !Object.hasOwn(c.I2, "v") || c.I2.t === "z",
        JSON.stringify(c.I2),
      );
      assert.deepEqual(
        r.decimals.map((x) => x.representable),
        [true, true, false, false, false],
      );
      const parts = unzipSync(new Uint8Array(r.output)),
        xml = strFromU8(parts["xl/worksheets/sheet1.xml"]);
      assert.match(xml, /<c r="A2" t="str"><v>001234<\/v><\/c>/);
      assert.match(xml, /<c r="B2" t="str">/);
      assert.ok(!xml.includes("<f>"));
      assert.match(xml, /<v>0.3<\/v>/);
      assert.match(xml, /<v>45352<\/v>/);
      assert.match(xml, /<dimension ref="A1:E2"/);
      assert.ok(!xml.includes('r="E2"'));
      assert.ok(
        !Object.keys(parts).some((k) =>
          /externalLinks|vbaProject|worksheets\/_rels/.test(k),
        ),
      );
      assert.ok(
        !Object.values(parts).some((v) =>
          strFromU8(v).includes("U1_PRIVATE_SENTINEL"),
        ),
      );
      entry.outputXml = xml;
      return {
        cells: c,
        interpretation: r.interpretation,
        resource: r.resource,
        ms: r.ms,
      };
    });
    for (const epoch of [false, true])
      await check(`date serial metadata epoch=${epoch}`, async () => {
        const r = await probe(dates(epoch), baseline ? "direct" : "guard", {
          full: true,
        });
        assert.equal(r.ok, true, r.error);
        assert.equal(r.epoch, epoch);
        assert.equal(r.cells.A5.v, 60);
        assert.equal(r.cells.A11.v, 61.5);
        assert.equal(r.cells.A12.v, -1);
        assert.equal(r.cells.A13.v, 2958466);
        assert.equal(r.cells.A2.t, "n");
        assert.equal(r.cells.A2.z, "yyyy-mm-dd");
        assert.deepEqual(
          r.interpretation.A6.date,
          epoch
            ? { year: 1904, month: 3, day: 2 }
            : { year: 1900, month: 3, day: 1 },
        );
        assert.equal(
          r.interpretation.A11.dateError,
          "UNSUPPORTED_TIME_COMPONENT",
        );
        assert.equal(r.interpretation.A12.dateError, "INVALID_EXCEL_DATE");
        assert.equal(r.interpretation.A13.dateError, "INVALID_EXCEL_DATE");
        if (epoch)
          assert.deepEqual(r.interpretation.A2.date, {
            year: 1904,
            month: 1,
            day: 1,
          });
        else assert.equal(r.interpretation.A5.dateError, "INVALID_EXCEL_DATE");
        assert.deepEqual(
          r.interpretation.A8.date,
          epoch
            ? { year: 2028, month: 3, day: 1 }
            : { year: 2024, month: 2, day: 29 },
        );
        return { cells: r.cells, interpretation: r.interpretation, ms: r.ms };
      });
    await check(
      "fflate whole-push vs 1 KiB push allocation characterization",
      async () => {
        const whole = await probe(deflateBomb, "inflate");
        const chunked = await probe(deflateBomb, "inflate", { step: 1024 });
        assert.equal(whole.actual, 8 * 1024 * 1024);
        assert.equal(chunked.actual, whole.actual);
        assert.ok(chunked.maxChunk < 2 * 1024 * 1024);
        return { whole, chunked };
      },
    );
    if (baseline) {
      for (const label of [
        "forged-small",
        "duplicate",
        "crc-corrupt",
        "dimensions",
      ])
        await check(`direct reader characterization ${label}`, async () =>
          probe(fixtures[label], "small"),
        );
      await check(
        "sheetRows is silent truncation, not a resource guard",
        async () => {
          const r = await probe(large, "direct", {
            options: { sheetRows: 10 },
          });
          assert.equal(r.ok, true);
          assert.equal(r.cells["!fullref"], "A1:T10001");
          assert.ok(r.count < 200020);
          return {
            count: r.count,
            ref: r.cells["!ref"],
            fullref: r.cells["!fullref"],
          };
        },
      );
    } else {
      for (const [label, bytes] of Object.entries(fixtures))
        await check(`guard rejects ${label}`, async () => {
          const r = await probe(bytes, "guard", {
            budget:
              label === "bomb" || label === "forged-small"
                ? 1024 * 1024
                : undefined,
          });
          assert.equal(r.ok, false);
          assert.notEqual(r.error, "WATCHDOG_CANCELLED");
          assert.notEqual(r.error, "WORKER_ERROR");
          assert.ok(!r.stages.includes("parse-start"));
          return r;
        });
    }
    if (!baseline) {
      await check(
        "alternate XML worksheet path remains supported",
        async () => {
          const r = await probe(
            alternateWorksheet("xl/custom.xml", "A1:A3"),
            "guard",
          );
          assert.equal(r.ok, true, r.error);
          assert.equal(r.count, 3);
          return { count: r.count, resource: r.resource };
        },
      );
      await check(
        "fflate preflight comparison on the same fixtures",
        async () => {
          const accepted = await probe(fidelity, "guard", {
            implementation: "fflate",
          });
          assert.equal(accepted.ok, true, accepted.error);
          const rejected = [];
          for (const [label, bytes] of Object.entries(fixtures)) {
            const r = await probe(bytes, "guard", {
              implementation: "fflate",
              budget:
                label === "bomb" || label === "forged-small"
                  ? 1024 * 1024
                  : undefined,
            });
            assert.equal(r.ok, false, label);
            assert.notEqual(r.error, "WATCHDOG_CANCELLED");
            assert.notEqual(r.error, "WORKER_ERROR");
            assert.ok(!r.stages.includes("parse-start"));
            rejected.push({ label, error: r.error });
          }
          return { accepted: accepted.resource, rejected };
        },
      );
      await check("date interpretation is timezone independent", async () => {
        const expected = await probe(dates(false), "guard", { full: true });
        const utc = await browser.newContext({
          serviceWorkers: "block",
          timezoneId: "Pacific/Kiritimati",
        });
        await utc.route("**/*", intercept);
        const p = await utc.newPage();
        await p.goto(origin);
        const actual = await p.evaluate(
          (bytes) =>
            window.probe({
              bytes: window.bytesFromBase64(bytes),
              mode: "guard",
              full: true,
            }),
          Buffer.from(dates(false)).toString("base64"),
        );
        assert.equal(actual.ok, true, actual.error);
        assert.deepEqual(actual.interpretation, expected.interpretation);
        await utc.close();
        return {
          timezones: ["America/Vancouver", "Pacific/Kiritimati"],
          equal: true,
        };
      });
      await check("cancel active workbook preflight", async () => {
        const r = await probe(large, "guard", {}, 150);
        assert.equal(r.error, "WATCHDOG_CANCELLED");
        assert.ok(r.stages.includes("preflight-start"));
        assert.ok(r.ticks >= 5);
        return r;
      });
    }
    await check(
      "watchdog cancellation leaves main thread responsive",
      async () => {
        const r = await probe(fidelity, "wait", {}, 250);
        assert.equal(r.error, "WATCHDOG_CANCELLED");
        assert.ok(r.ticks >= 5);
        return r;
      },
    );
    await check("10,000 x 20 completeness and timing", async () => {
      const runs = [];
      for (let i = 0; i < 6; i++) {
        const r = await probe(large, baseline ? "direct" : "guard");
        assert.equal(r.ok, true, r.error);
        assert.equal(r.count, 200020);
        assert.equal(r.cells["!ref"], "A1:T10001");
        assert.ok(r.ticks > 0);
        runs.push({
          ms: r.ms,
          wallMs: r.wallMs,
          ticks: r.ticks,
          resource: r.resource,
        });
      }
      return runs;
    });
    assert.ok(!JSON.stringify(entry.requests).includes("U1_PRIVATE_SENTINEL"));
    assert.ok(
      !JSON.stringify(entry.diagnostics).includes("U1_PRIVATE_SENTINEL"),
    );
    clearInterval(sampleTimer);
    await browser.close();
  }
} finally {
  await new Promise((r) => server.close(r));
}
if (!report.browsers.some((b) => b.version)) failures++;
report.failures = failures;
await writeFile(
  resolve(root, baseline ? "baseline-results.json" : "results.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(`Recorded ${failures} failures`);
if (failures) process.exitCode = 1;
