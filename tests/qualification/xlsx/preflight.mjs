// U1 qualification prototype only. Not a general ZIP API or production adapter.

const MiB = 1024 * 1024;
const fail = (message) => {
  throw new Error(message);
};
const decoder = new TextDecoder("utf-8", { fatal: true });
const crcTable = Uint32Array.from({ length: 256 }, (_, i) => {
  for (let j = 0; j < 8; j++) i = i & 1 ? 0xedb88320 ^ (i >>> 1) : i >>> 1;
  return i >>> 0;
});
function crcUpdate(crc, bytes) {
  for (const b of bytes) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8);
  return crc;
}
function rangeCells(ref) {
  const coords = ref.split(":").map((r) => {
    const m = /^([A-Z]{1,3})([1-9][0-9]{0,6})$/.exec(r);
    if (!m) fail("Invalid worksheet address");
    let col = 0;
    for (const c of m[1]) col = col * 26 + c.charCodeAt(0) - 64;
    const row = Number(m[2]);
    if (col > 16384 || row > 1048576) fail("Invalid worksheet address");
    return { col, row };
  });
  const a = coords[0],
    b = coords[1] || a;
  if (coords.length > 2 || b.col < a.col || b.row < a.row)
    fail("Invalid worksheet range");
  // Bound enumeration from A1 too: a far isolated cell must not create a giant sparse range.
  return b.col * b.row;
}
function inspectXml(name, bytes, metrics) {
  if (!/\.(xml|rels)$/.test(name)) return;
  const xml = decoder.decode(bytes);
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) fail("XML entities/DTD are unsupported");
  for (const m of xml.matchAll(/\bformatCode\s*=\s*["']([^"']*)["']/g))
    if (m[1].length > 256) fail("Excel number format exceeds 256 characters");
  // Package declarations must not route the XML parser to a member we skip.
  for (const match of xml.matchAll(
    /<(?:\w+:)?(?:Override|Default|Relationship)\b[^>]*>/g,
  )) {
    const tag = match[0];
    const attr = (key) =>
      new RegExp("\\b" + key + "\\s*=\\s*[\"']([^\"']+)[\"']").exec(tag)?.[1];
    const contentType = attr("ContentType");
    if (contentType && /(?:\+xml|\/xml)$/.test(contentType)) {
      const part = attr("PartName"),
        extension = attr("Extension");
      if (
        (part && !/\.(?:xml|rels)$/.test(part)) ||
        (extension && !/^(?:xml|rels)$/.test(extension))
      )
        fail("XML package part requires .xml/.rels path");
    }
    const type = attr("Type");
    if (
      type &&
      /\/(?:worksheet|styles|sharedStrings|theme|officeDocument)$/.test(type)
    ) {
      const target = attr("Target");
      if (
        !target ||
        target.includes("&") ||
        !/\.xml$/.test(target) ||
        attr("TargetMode") === "External"
      )
        fail("Unsupported XML relationship target");
    }
  }
  // Inspect all XML paths, including relationship-selected alternate worksheet locations.
  for (const m of xml.matchAll(/\b(?:ref|sqref)\s*=\s*["']([^"']+)["']/g))
    for (const ref of m[1].split(/\s+/))
      if (rangeCells(ref) > 2_000_000)
        fail("Worksheet reference exceeds 2 million inspected table cells");
  if (/<(?:\w+:)?(?:worksheet|sheetData|dimension|hyperlink)\b/.test(xml)) {
    for (const m of xml.matchAll(/<(?:\w+:)?(?:dimension|c|row)\b[^>]*>/g)) {
      if (/^<(?:\w+:)?row\b/.test(m[0])) continue;
      const ref = /\b(?:r|ref)\s*=\s*["']([^"']+)["']/.exec(m[0]);
      if (!ref) fail("Missing worksheet address");
      if (rangeCells(ref[1]) > 2_000_000)
        fail("Worksheet exceeds 2 million inspected table cells");
      if (/^<(?:\w+:)?c\b/.test(m[0]) && ++metrics.cells > 2_000_000)
        fail("Workbook exceeds 2 million physical cells");
    }
  }
}
export async function preflight(
  bytes,
  budget = 100 * MiB,
  implementation = "native",
) {
  if (bytes.length > 25 * MiB)
    fail("Source exceeds 25 MiB; reduce workbook size");
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const bounds = (p, n) => {
    if (p < 0 || n < 0 || p + n > bytes.length) fail("Truncated ZIP archive");
  };
  const u16 = (p) => {
      bounds(p, 2);
      return v.getUint16(p, true);
    },
    u32 = (p) => {
      bounds(p, 4);
      return v.getUint32(p, true);
    };
  let end = -1;
  for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65557); p--)
    if (u32(p) === 0x06054b50 && p + 22 + u16(p + 20) === bytes.length) {
      end = p;
      break;
    }
  if (end < 0) fail("Unreadable ZIP or encrypted/non-XLSX input");
  if (u16(end + 4) || u16(end + 6) || u16(end + 8) !== u16(end + 10))
    fail("Multi-disk ZIP unsupported");
  const count = u16(end + 10),
    size = u32(end + 12),
    offset = u32(end + 16);
  if (count === 65535 || size === 0xffffffff || offset === 0xffffffff)
    fail("ZIP64 unsupported within MVP resource profile");
  if (count > 4096) fail("Workbook exceeds 4096 ZIP entries");
  if (offset + size !== end) fail("Conflicting central directory bounds");
  const entries = [],
    names = new Set();
  let p = offset,
    declared = 0;
  for (let i = 0; i < count; i++) {
    bounds(p, 46);
    if (u32(p) !== 0x02014b50) fail("Malformed central directory");
    const flags = u16(p + 8),
      method = u16(p + 10),
      crc = u32(p + 16),
      compressed = u32(p + 20),
      expanded = u32(p + 24),
      nl = u16(p + 28),
      el = u16(p + 30),
      cl = u16(p + 32),
      local = u32(p + 42);
    if (
      u16(p + 34) ||
      compressed === 0xffffffff ||
      expanded === 0xffffffff ||
      local === 0xffffffff
    )
      fail("ZIP64/multi-disk unsupported");
    if (flags & ~0x0808) fail("Encrypted or unsupported ZIP flags");
    if (method !== 0 && method !== 8) fail("Unsupported ZIP compression");
    bounds(p + 46, nl + el + cl);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nl));
    if (
      !name ||
      /[^\x20-\x7e]/.test(name) ||
      name.startsWith("/") ||
      name.includes("\\") ||
      name.includes(":") ||
      name.split("/").some((x) => x === "." || x === ".." || x === "")
    )
      fail("Unsafe or unsupported ZIP path");
    // Case-fold conflicts are rejected rather than letting parser path matching choose one.
    const key = name.toLowerCase();
    if (names.has(key)) fail("Duplicate/conflicting ZIP member");
    names.add(key);
    bounds(local, 30);
    if (
      u32(local) !== 0x04034b50 ||
      u16(local + 6) !== flags ||
      u16(local + 8) !== method
    )
      fail("Conflicting local header");
    const lnl = u16(local + 26),
      lel = u16(local + 28);
    bounds(local + 30, lnl + lel);
    if (decoder.decode(bytes.subarray(local + 30, local + 30 + lnl)) !== name)
      fail("Conflicting local member name");
    // Reject ZIP64 extra fields even when 32-bit lengths look benign: the reader honors extras.
    for (const [ep, len] of [
      [p + 46 + nl, el],
      [local + 30 + lnl, lel],
    ]) {
      let q = ep;
      while (q < ep + len) {
        if (q + 4 > ep + len) fail("Malformed ZIP extra");
        const tag = u16(q),
          n = u16(q + 2);
        if (q + 4 + n > ep + len) fail("Malformed ZIP extra");
        if (tag === 1) fail("ZIP64 extra unsupported");
        q += 4 + n;
      }
    }
    const data = local + 30 + lnl + lel;
    bounds(data, compressed);
    let finish = data + compressed;
    if (flags & 8) {
      if (u32(finish) === 0x08074b50) finish += 4;
      if (
        u32(finish) !== crc ||
        u32(finish + 4) !== compressed ||
        u32(finish + 8) !== expanded
      )
        fail("Conflicting data descriptor");
      finish += 12;
      // SheetJS reads local sizes first. Zero streaming sizes are allowed only after verified decode.
      if (
        (u32(local + 18) !== 0 && u32(local + 18) !== compressed) ||
        (u32(local + 22) !== 0 && u32(local + 22) !== expanded)
      )
        fail("Conflicting streaming local sizes");
    } else if (
      u32(local + 14) !== crc ||
      u32(local + 18) !== compressed ||
      u32(local + 22) !== expanded
    )
      fail("Conflicting local sizes/checksum");
    declared += expanded;
    if (declared > budget) fail(`Declared expansion exceeds ${budget} bytes`);
    entries.push({
      name,
      method,
      crc,
      compressed,
      expanded,
      local,
      data,
      finish,
    });
    p += 46 + nl + el + cl;
  }
  if (p !== end) fail("Malformed directory length");
  let next = 0;
  for (const e of [...entries].sort((a, b) => a.local - b.local)) {
    if (e.local !== next || e.finish > offset)
      fail("Overlapping/unindexed ZIP bytes");
    next = e.finish;
  }
  if (next !== offset) fail("Unindexed ZIP payload");
  for (const name of names) {
    let slash = name.indexOf("/");
    while (slash !== -1) {
      if (names.has(name.slice(0, slash))) fail("File/directory path conflict");
      slash = name.indexOf("/", slash + 1);
    }
  }
  if (!names.has("[content_types].xml") || !names.has("xl/workbook.xml"))
    fail("Not an ordinary XLSX workbook");
  const metrics = {
    entries: entries.length,
    declaredBytes: declared,
    actualBytes: 0,
    maxOutputChunk: 0,
    cells: 0,
  };
  for (const e of entries) {
    let actual = 0,
      crc = 0xffffffff;
    const chunks = [];
    const xmlMember = /\.(xml|rels)$/.test(e.name);
    const accept = (chunk) => {
      metrics.maxOutputChunk = Math.max(metrics.maxOutputChunk, chunk.length);
      actual += chunk.length;
      metrics.actualBytes += chunk.length;
      if (metrics.actualBytes > budget || actual > e.expanded)
        fail(`Actual expansion exceeds verified size/budget (${budget} bytes)`);
      crc = crcUpdate(crc, chunk);
      if (xmlMember) chunks.push(chunk);
    };
    if (e.method === 0) accept(bytes.subarray(e.data, e.data + e.compressed));
    else if (implementation === "native") {
      let position = e.data;
      const source = new ReadableStream(
        {
          pull(controller) {
            const finish = Math.min(position + 1024, e.data + e.compressed);
            if (position === finish) {
              controller.close();
              return;
            }
            controller.enqueue(bytes.subarray(position, finish));
            position = finish;
          },
        },
        { highWaterMark: 1 },
      );
      const reader = source
        .pipeThrough(new DecompressionStream("deflate-raw"))
        .getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          accept(value);
        }
      } finally {
        await reader.cancel().catch(() => {});
      }
    } else {
      const { Inflate } = await import("./node_modules/fflate/esm/browser.js");
      const inflater = new Inflate(accept);
      // Whole-member push would allocate all expanded bytes before the first callback.
      // Fixed small input slices bound each DEFLATE expansion burst; do not trust originalSize.
      for (let j = 0; j < e.compressed; j += 1024)
        inflater.push(
          bytes.subarray(e.data + j, e.data + Math.min(j + 1024, e.compressed)),
          j + 1024 >= e.compressed,
        );
    }
    if (actual !== e.expanded || (crc ^ 0xffffffff) >>> 0 !== e.crc)
      fail("Corrupt ZIP length/checksum");
    if (xmlMember) {
      const content = new Uint8Array(actual);
      let n = 0;
      for (const c of chunks) {
        content.set(c, n);
        n += c.length;
      }
      inspectXml(e.name, content, metrics);
    }
    // Yield between members for cancellation; host also terminates synchronous parser work.
    await new Promise((r) => setTimeout(r, 0));
  }
  return metrics;
}
