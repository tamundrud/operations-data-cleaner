// All data in this module is invented. Workbooks are generated from OOXML, not by the reader.
import { zipSync, strToU8, deflateSync, unzipSync, strFromU8 } from "fflate";
const enc = strToU8;
const ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
export function workbook(
  cells,
  { epoch = false, dimension = "A1:N2", extra = {} } = {},
) {
  const parts = {
    "[Content_Types].xml": `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    "_rels/.rels":
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml": `<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr date1904="${epoch ? 1 : 0}"/><sheets><sheet name="Synthetic" sheetId="1" r:id="rId1"/><sheet name="Other" sheetId="2" r:id="rId2"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels":
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>',
    "xl/styles.xml": `<styleSheet xmlns="${ns}"><numFmts count="3"><numFmt numFmtId="164" formatCode="000000"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd"/><numFmt numFmtId="166" formatCode="[DBNum1]General"/></numFmts><fonts count="1"><font/></fonts><fills count="1"><fill/></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0"/><xf numFmtId="164"/><xf numFmtId="165"/><xf numFmtId="22"/><xf numFmtId="166"/></cellXfs></styleSheet>`,
    "xl/worksheets/sheet1.xml": `<worksheet xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="${dimension}"/><sheetData>${cells}</sheetData><hyperlinks><hyperlink ref="A2" r:id="external"/></hyperlinks></worksheet>`,
    "xl/worksheets/sheet2.xml": `<worksheet xmlns="${ns}"><dimension ref="A1:A2"/><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Other</t></is></c></row><row r="2"><c r="A2"><v>99</v></c></row></sheetData></worksheet>`,
    "xl/worksheets/_rels/sheet1.xml.rels":
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="external" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.invalid/U1_PRIVATE_SENTINEL" TargetMode="External"/></Relationships>',
    ...extra,
  };
  return zipSync(
    Object.fromEntries(
      Object.entries(parts).map(([k, v]) => [
        k,
        typeof v === "string" ? enc(v) : v,
      ]),
    ),
    { level: 6 },
  );
}
const cell = (ref, body, attrs = "") => `<c r="${ref}" ${attrs}>${body}</c>`;
export const fidelity = workbook(
  `<row r="1">${cell("A1", "<is><t>Reference</t></is>", 't="inlineStr"')}</row><row r="2">` +
    [
      cell("A2", "<is><t>001234</t></is>", 't="inlineStr"'),
      cell("B2", "<v>1234</v>", 's="1"'),
      cell("C2", "<v>1234567890123456</v>"),
      cell("D2", "<v>1</v>", 't="b"'),
      cell("E2", "<v>#DIV/0!</v>", 't="e"'),
      cell("F2", "<is><t>  U1_PRIVATE_SENTINEL  </t></is>", 't="inlineStr"'),
      cell("G2", "<v>1234</v>", 's="4"'),
      cell(
        "H2",
        '<f>WEBSERVICE("https://example.invalid/U1_PRIVATE_SENTINEL")</f><v>7</v>',
      ),
      cell("I2", "<f>1+2</f>"),
      cell("J2", "<f>1/0</f><v>#DIV/0!</v>", 't="e"'),
      cell("K2", '<f>"001234"</f><v>001234</v>', 't="str"'),
      cell("L2", "<v>0.1</v>"),
      cell("M2", '<f t="shared" si="0" ref="M2:N2">1+1</f><v>2</v>'),
      cell("N2", '<f t="shared" si="0"/><v>2</v>'),
    ].join("") +
    "</row>",
);
export function dates(epoch) {
  return workbook(
    '<row r="1"><c r="A1" t="inlineStr"><is><t>Date</t></is></c></row>' +
      [0, 1, 59, 60, 61, 1462, 45351, 45352, 45353, 61.5, -1, 2958466]
        .map(
          (v, i) =>
            `<row r="${i + 2}"><c r="A${i + 2}" s="2"><v>${v}</v></c></row>`,
        )
        .join(""),
    { epoch, dimension: "A1:A13" },
  );
}
export function representative() {
  let rows =
    '<row r="1">' +
    Array.from({ length: 20 }, (_, j) =>
      cell(
        `${String.fromCharCode(65 + j)}1`,
        `<is><t>Field ${j}</t></is>`,
        't="inlineStr"',
      ),
    ).join("") +
    "</row>";
  for (let i = 2; i <= 10001; i++)
    rows +=
      `<row r="${i}">` +
      Array.from({ length: 20 }, (_, j) =>
        cell(
          `${String.fromCharCode(65 + j)}${i}`,
          j % 3 === 0
            ? `<is><t>SYN-${String(i).padStart(6, "0")}-${j}</t></is>`
            : `<v>${i + j}</v>`,
          j % 3 === 0 ? 't="inlineStr"' : "",
        ),
      ).join("") +
      "</row>";
  return workbook(rows, { dimension: "A1:T10001" });
}
export function centralEntries(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    result = [];
  for (let i = 0; i < bytes.length - 46; i++)
    if (v.getUint32(i, true) === 0x02014b50) {
      const nl = v.getUint16(i + 28, true),
        el = v.getUint16(i + 30, true),
        cl = v.getUint16(i + 32, true);
      result.push({
        cd: i,
        local: v.getUint32(i + 42, true),
        name: new TextDecoder().decode(bytes.subarray(i + 46, i + 46 + nl)),
        nl,
      });
      i += 45 + nl + el + cl;
    }
  return result;
}
export function mutate(bytes, fn) {
  const b = bytes.slice();
  fn(new DataView(b.buffer), centralEntries(b), b);
  return b;
}
export function alternateWorksheet(
  path = "xl/custom.xml",
  ref = "A1:XFD1048576",
) {
  const parts = unzipSync(
    workbook('<row r="1"><c r="A1"><v>1</v></c></row>', { dimension: "A1:A1" }),
  );
  parts["xl/_rels/workbook.xml.rels"] = enc(
    strFromU8(parts["xl/_rels/workbook.xml.rels"]).replace(
      "worksheets/sheet1.xml",
      path.slice(3),
    ),
  );
  parts["[Content_Types].xml"] = enc(
    strFromU8(parts["[Content_Types].xml"]).replace(
      "/xl/worksheets/sheet1.xml",
      "/" + path,
    ),
  );
  delete parts["xl/worksheets/sheet1.xml"];
  parts[path] = enc(
    `<worksheet xmlns="${ns}"><dimension ref="A1:A1"/><sheetData><row r="1"><c r="A1"><v>1</v></c></row></sheetData><hyperlinks><hyperlink ref="${ref}" location="Synthetic!A1"/></hyperlinks></worksheet>`,
  );
  return zipSync(parts, { level: 6 });
}
export function hostile() {
  const small = workbook(
    '<row r="1"><c r="A1" t="inlineStr"><is><t>Synthetic</t></is></c></row>',
    { dimension: "A1:A1" },
  );
  const bomb = workbook("", {
    extra: { "bomb.bin": new Uint8Array(8 * 1024 * 1024) },
  });
  return {
    "alternate-worksheet-range": alternateWorksheet(),
    "alternate-binary-worksheet": alternateWorksheet("xl/custom.bin", "A1:A3"),
    malformed: new Uint8Array([80, 75, 3, 4, 0]),
    encrypted: mutate(small, (v, es) => {
      for (const e of es) {
        v.setUint16(e.cd + 8, 1, true);
        v.setUint16(e.local + 6, 1, true);
      }
    }),
    "huge-declared": mutate(small, (v, es) => {
      v.setUint32(es[0].cd + 24, 0x70000000, true);
      v.setUint32(es[0].local + 22, 0x70000000, true);
    }),
    "forged-small": mutate(bomb, (v, es) => {
      const e = es.find((x) => x.name === "bomb.bin");
      v.setUint32(e.cd + 24, 1, true);
      v.setUint32(e.local + 22, 1, true);
    }),
    bomb,
    "crc-corrupt": mutate(small, (v, es) => {
      const e = es[0];
      v.setUint32(e.cd + 16, 0, true);
      v.setUint32(e.local + 14, 0, true);
    }),
    duplicate: mutate(small, (v, es, b) => {
      const e = es.find((x) => x.name.endsWith("sheet2.xml"));
      const n = enc("xl/worksheets/sheet1.xml");
      b.set(n, e.cd + 46);
      b.set(n, e.local + 30);
    }),
    "path-conflict": workbook("", {
      extra: { "xl/worksheets/../workbook.xml": "<synthetic/>" },
    }),
    "local-name-conflict": mutate(small, (v, es, b) => {
      b[es[0].local + 30] = 120;
    }),
    truncated: small.slice(0, -5),
    "zip64-sentinel": mutate(small, (v, es) =>
      v.setUint32(es[0].cd + 20, 0xffffffff, true),
    ),
    dimensions: workbook('<row r="1"><c r="A1"><v>1</v></c></row>', {
      dimension: "A1:XFD1048576",
    }),
    "far-cell": workbook(
      '<row r="1048576"><c r="XFD1048576"><v>1</v></c></row>',
      { dimension: "A1:A1" },
    ),
    "hyperlink-range": workbook("", {
      extra: {
        "xl/worksheets/sheet1.xml": `<worksheet xmlns="${ns}"><dimension ref="A1:A1"/><sheetData/><hyperlinks><hyperlink ref="A1:XFD1048576" location="Synthetic!A1"/></hyperlinks></worksheet>`,
      },
    }),
    oversized: new Uint8Array(25 * 1024 * 1024 + 1),
    "huge-format": workbook("", {
      extra: {
        "xl/styles.xml": `<styleSheet xmlns="${ns}"><numFmts><numFmt numFmtId="164" formatCode="${"0".repeat(257)}"/></numFmts></styleSheet>`,
      },
    }),
    entities: workbook("", {
      extra: {
        "xl/sharedStrings.xml":
          '<!DOCTYPE sst [<!ENTITY x "synthetic">]><sst/>',
      },
    }),
  };
}
export const deflateBomb = deflateSync(new Uint8Array(8 * 1024 * 1024));
