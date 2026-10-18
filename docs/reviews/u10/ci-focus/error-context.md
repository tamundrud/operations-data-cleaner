# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: privacy.spec.ts >> production journey sends no customer values, file names or IDs and stores no source data
- Location: tests/e2e/privacy.spec.ts:4:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('.source-grid [data-source-key="date"]')

```

# Page snapshot

```yaml
- main [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - paragraph [ref=e6]: OPERATIONS DATA CLEANER · EXCEL & CSV PREVIEW
      - heading "Match your columns." [level=1] [ref=e7]
      - paragraph [ref=e8]: Map a source table to the columns your import needs.
    - generic [ref=e9]:
      - strong [ref=e10]: Processed in your browser
      - generic [ref=e11]: No account. Files stay in memory.
  - navigation "Conversion steps" [ref=e12]:
    - generic [ref=e13]: 1 · Upload table
    - generic [ref=e14]: 2 · Map columns
    - generic [ref=e15]: 3 · Preview & download
  - region "Workflow configuration" [ref=e16]:
    - heading "Save & repeat" [level=2] [ref=e17]
    - paragraph [ref=e18]: Saved workflows belong to this browser and origin. Browser data can be cleared. Download a backup to recover or transfer your configuration.
    - generic [ref=e19]:
      - generic [ref=e20]:
        - text: Saved workflows
        - combobox "Saved workflows" [ref=e21]:
          - option "Choose a workflow" [selected]
      - button "Open workflow" [disabled] [ref=e22]
      - generic [ref=e23]:
        - text: Import workflow
        - button "Import workflow" [ref=e24]
      - button "New conversion" [ref=e25] [cursor=pointer]
    - generic [ref=e26]:
      - generic [ref=e27]:
        - text: Workflow name
        - textbox "Workflow name" [ref=e28]
      - button "Save workflow" [ref=e29] [cursor=pointer]
      - button "Download workflow" [ref=e30] [cursor=pointer]
      - generic [ref=e31]: Unsaved configuration
    - paragraph [ref=e32]: Workflow files contain field names and configured constants, which may reveal business information. Share them carefully. Source records and filenames are excluded.
    - status
    - button "Retry workflow storage" [ref=e33] [cursor=pointer]
  - region [ref=e34]:
    - generic [ref=e35]:
      - heading "1. Choose your source" [level=2] [ref=e36]
      - paragraph [ref=e37]: UTF-8 CSV or .xlsx with a header row. Choose one worksheet. Leading zeros and spaces are preserved.
    - generic [ref=e38]:
      - generic [ref=e39]:
        - text: Source delimiter (CSV)
        - combobox "Source delimiter (CSV)" [ref=e40]:
          - option "Detect automatically" [selected]
          - option "Comma"
          - option "Semicolon"
          - option "Tab"
      - generic [ref=e41]:
        - text: Upload source CSV or Excel
        - button "Upload source CSV" [ref=e42]
      - button "Try sample data" [ref=e43] [cursor=pointer]
      - button "Try fixed fields example" [ref=e44] [cursor=pointer]
      - button "End session" [ref=e45] [cursor=pointer]
  - status [ref=e47]: Source loaded · 1 candidate rows · comma delimiter detected. Verify the source columns below.
  - generic [ref=e48]:
    - group [ref=e49]:
      - generic "Inspect original source table" [ref=e50] [cursor=pointer]
    - region [ref=e51]:
      - generic [ref=e52]:
        - generic [ref=e53]:
          - heading "2. Match your columns" [level=2] [ref=e54]
          - paragraph [ref=e55]: Drag either card onto its counterpart, or select one and then the other.
        - generic [ref=e56]:
          - generic [ref=e57] [cursor=pointer]:
            - text: Import output template
            - button "Upload destination CSV template" [ref=e58]
          - button "+ Add output column" [ref=e59] [cursor=pointer]
          - button "Output order" [ref=e60] [cursor=pointer]
      - generic [ref=e61]:
        - generic [ref=e62]:
          - heading "Matched columns 7" [level=3] [ref=e63]
          - generic [ref=e64]: Drag the grip to reorder a pair · Alt+↑ / Alt+↓
        - paragraph [ref=e65]: Completed outputs include fixed values. Fixed values need no source match and can be reordered with the pairs.
        - generic [aria-hidden] [ref=e66]:
          - generic [ref=e67]: Source column
          - generic [ref=e68]: Output column · export position
        - region "Matched columns" [ref=e69]:
          - generic [ref=e70]:
            - button "Reorder pair Reference" [ref=e71]: ⠿
            - button "Select paired source ID for Reference" [ref=e72]:
              - strong [ref=e73]: ID
              - generic [ref=e74]: PRIVATE_U2_SENTINEL_9X
            - generic [aria-hidden] [ref=e75]: ↔
            - button "Select output Reference" [ref=e76]:
              - strong [ref=e77]:
                - generic [ref=e78]: "1"
                - text: Reference
              - generic [ref=e79]: Confirmed · copies ID
            - generic [ref=e80]:
              - button "Unlink Reference" [ref=e81] [cursor=pointer]: ×
              - button "Edit Reference" [ref=e82] [cursor=pointer]: ⋯
          - generic [ref=e83]:
            - button "Reorder pair PRIVATE_U2_HEADER_SENTINEL_Z7" [ref=e84]: ⠿
            - button "Select paired source Note for PRIVATE_U2_HEADER_SENTINEL_Z7" [ref=e85]:
              - strong [ref=e86]: Note
              - generic [ref=e87]: <img src=x onerror=alert(1)>
            - generic [aria-hidden] [ref=e88]: ↔
            - button "Select output PRIVATE_U2_HEADER_SENTINEL_Z7" [ref=e89]:
              - strong [ref=e90]:
                - generic [ref=e91]: "2"
                - text: PRIVATE_U2_HEADER_SENTINEL_Z7
              - generic [ref=e92]: Confirmed · copies Note
            - generic [ref=e93]:
              - button "Unlink PRIVATE_U2_HEADER_SENTINEL_Z7" [ref=e94] [cursor=pointer]: ×
              - button "Edit PRIVATE_U2_HEADER_SENTINEL_Z7" [ref=e95] [cursor=pointer]: ⋯
          - generic [ref=e96]:
            - button "Reorder pair CustomerCode" [ref=e97]: ⠿
            - generic [ref=e98]:
              - strong [ref=e99]: Fixed value
              - generic [ref=e100]: No source needed
            - button "Select output CustomerCode" [ref=e101]:
              - strong [ref=e102]:
                - generic [ref=e103]: "3"
                - text: CustomerCode
              - generic [ref=e104]: Fixed text · " PRIVATE_U3_FIXED_SENTINEL_Q82 " · trims boundary whitespace
            - generic [ref=e105]:
              - button "Clear fixed value for CustomerCode" [ref=e106] [cursor=pointer]: ×
              - button "Edit CustomerCode" [ref=e107] [cursor=pointer]: ⋯
          - generic [ref=e108]:
            - button "Reorder pair Split reference" [ref=e109]: ⠿
            - button "Select paired source ID for Split reference" [ref=e110]:
              - strong [ref=e111]: ID
              - generic [ref=e112]: PRIVATE_U2_SENTINEL_9X
            - generic [aria-hidden] [ref=e113]: ↔
            - button "Select output Split reference" [ref=e114]:
              - strong [ref=e115]:
                - generic [ref=e116]: "4"
                - text: Split reference
              - generic [ref=e117]: Split · segment 3 of 4 · delimiter "_" · trims segments
            - generic [ref=e118]:
              - button "Unlink Split reference" [ref=e119] [cursor=pointer]: ×
              - button "Edit Split reference" [ref=e120] [cursor=pointer]: ⋯
          - generic [ref=e121]:
            - button "Reorder pair Combined reference" [ref=e122]: ⠿
            - generic [ref=e123]:
              - strong [ref=e124]: Ordered combination
              - list [ref=e125]:
                - listitem [ref=e126]: ID
                - listitem [ref=e127]: Literal "PRIVATE_U3_FIXED_SENTINEL_Q82"
            - generic [aria-hidden] [ref=e128]: ↔
            - button "Select output Combined reference" [ref=e129]:
              - strong [ref=e130]:
                - generic [ref=e131]: "5"
                - text: Combined reference
              - generic [ref=e132]: Combine · 2 components · separator "|" · keeps empty positions
            - generic [ref=e133]:
              - button "Unlink Combined reference" [ref=e134] [cursor=pointer]: ×
              - button "Edit Combined reference" [ref=e135] [cursor=pointer]: ⋯
          - generic [ref=e136]:
            - button "Reorder pair Calculated cases" [ref=e137]: ⠿
            - generic [ref=e138]:
              - strong [ref=e139]: Calculation · divide
              - generic [ref=e140]: Quantity ÷ Factor
            - generic [aria-hidden] [ref=e141]: ↔
            - button "Select output Calculated cases" [ref=e142]:
              - strong [ref=e143]:
                - generic [ref=e144]: "6"
                - text: Calculated cases
              - generic [ref=e145]: Calculate · divide · half-even, 2 places
            - generic [ref=e146]:
              - button "Unlink Calculated cases" [ref=e147] [cursor=pointer]: ×
              - button "Edit Calculated cases" [ref=e148] [cursor=pointer]: ⋯
          - generic [ref=e149]:
            - button "Reorder pair Calculated weight" [ref=e150]: ⠿
            - generic [ref=e151]:
              - strong [ref=e152]: Calculation · multiply
              - generic [ref=e153]: Quantity × 12
            - generic [aria-hidden] [ref=e154]: ↔
            - button "Select output Calculated weight" [ref=e155]:
              - strong [ref=e156]:
                - generic [ref=e157]: "7"
                - text: Calculated weight
              - generic [ref=e158]: Calculate · multiply · exact, no rounding
            - generic [ref=e159]:
              - button "Unlink Calculated weight" [ref=e160] [cursor=pointer]: ×
              - button "Edit Calculated weight" [ref=e161] [cursor=pointer]: ⋯
      - generic [ref=e162]:
        - generic [ref=e163]:
          - heading "Still to match 1" [level=3] [ref=e164]
          - generic [ref=e165]: Sources remain available for reuse
        - generic [ref=e166]:
          - generic [ref=e167]:
            - generic [ref=e168]:
              - heading "Available sources" [level=3] [ref=e169]
              - generic [ref=e170]: 5 columns
            - generic [ref=e171]: Search source columns
            - searchbox "Search source columns" [ref=e172]: note
            - region "Available source columns" [ref=e173]:
              - button "Select source Note" [ref=e174]:
                - strong [ref=e175]: Note
                - generic [ref=e176]: <img src=x onerror=alert(1)>
                - generic [ref=e177]: Used in 1 output
          - generic [ref=e178]:
            - generic [ref=e179]:
              - heading "Unmatched outputs" [level=3] [ref=e180]
              - generic [ref=e181]: Drop a source here
            - paragraph [ref=e182]: Or drag an output onto any source card.
            - region "Unmatched output columns" [ref=e183]:
              - generic [ref=e184]:
                - button "Select output Delivery date" [ref=e185]:
                  - strong [ref=e186]:
                    - generic [ref=e187]: "8"
                    - text: Delivery date
                  - generic [ref=e188]: Unmatched · drop a source here
                - button "Edit Delivery date" [ref=e189] [cursor=pointer]: ⋯
        - group [ref=e190]:
          - generic "Add several columns" [ref=e191] [cursor=pointer]
          - generic [ref=e192]:
            - generic [ref=e193]:
              - text: New column names (one per line)
              - textbox "New column names (one per line)" [ref=e194]
            - button "Add columns" [disabled] [ref=e195]
      - status [ref=e196]: CustomerCode uses a fixed value. No source match needed.
      - generic [ref=e197]:
        - strong [ref=e198]: Export order
        - region "Output column order, scroll horizontally" [ref=e199]:
          - generic [ref=e200]: 1 · Reference
          - generic [ref=e201]: 2 · PRIVATE_U2_HEADER_SENTINEL_Z7
          - generic [ref=e202]: 3 · CustomerCode
          - generic [ref=e203]: 4 · Split reference
          - generic [ref=e204]: 5 · Combined reference
          - generic [ref=e205]: 6 · Calculated cases
          - generic [ref=e206]: 7 · Calculated weight
          - generic [ref=e207]: 8 · Delivery date
    - region [ref=e208]:
      - heading "3. Preview & download" [level=2] [ref=e209]
      - group "Output settings" [ref=e210]:
        - generic [ref=e212]:
          - generic [ref=e213]:
            - text: Output format
            - combobox "Output format" [ref=e214]:
              - option "CSV (.csv)" [selected]
              - option "Excel workbook (.xlsx)"
          - generic [ref=e215]:
            - text: CSV delimiter
            - combobox "CSV delimiter" [ref=e216]:
              - option "Comma"
              - option "Semicolon" [selected]
              - option "Tab"
          - generic [ref=e217]:
            - checkbox "Include UTF-8 BOM" [checked] [ref=e218]
            - text: Include UTF-8 BOM
          - generic [ref=e219]:
            - checkbox "Include header row" [ref=e220]
            - text: Include header row
        - paragraph [ref=e221]: UTF-8 encoding · CRLF line endings. Settings update preview automatically.
        - paragraph [ref=e222]: Column labels identify fields in preview only. The downloaded file has no header row.
      - generic "Full dataset counts" [ref=e223]:
        - generic [ref=e224]:
          - text: Input rows
          - strong [ref=e225]: "1"
        - generic [ref=e226]:
          - text: Skipped blanks
          - strong [ref=e227]: "0"
        - generic [ref=e228]:
          - text: Candidate rows
          - strong [ref=e229]: "1"
        - generic [ref=e230]:
          - text: Valid
          - strong [ref=e231]: "0"
        - generic [ref=e232]:
          - text: Warning rows
          - strong [ref=e233]: "0"
        - generic [ref=e234]:
          - text: Invalid
          - strong [ref=e235]: "0"
        - generic [ref=e236]:
          - text: Warning issues
          - strong [ref=e237]: "0"
        - generic [ref=e238]:
          - text: Error issues
          - strong [ref=e239]: "0"
        - generic [ref=e240]:
          - text: Corrected
          - strong [ref=e241]: "0"
        - generic [ref=e242]:
          - text: Excluded
          - strong [ref=e243]: "0"
      - alert [ref=e244]:
        - strong [ref=e245]: Mapping needs attention
        - list [ref=e246]:
          - listitem [ref=e247]: Delivery date is unmapped. Choose a source column or remove this output column.
      - button "Download converted CSV" [disabled] [ref=e248]
      - paragraph [ref=e249]: Validation checks your chosen rules. Acceptance by your destination system depends on its import requirements.
  - generic [ref=e250]: U10 internal preview · CSV and one-sheet Excel conversion with reusable local workflows. Data is cleared on reload or End session. Source data and file names are never saved. Static application assets are requested from the host; customer file processing stays local.
```

# Test source

```ts
  1   | import type { Field } from "../../src/engine/workflow";
  2   | import { expect, type Page } from "@playwright/test";
  3   | import { readFile } from "node:fs/promises";
  4   | export async function upload(page: Page, text: string, name = "synthetic.csv") {
  5   |   const source = page.getByLabel("Upload source CSV");
  6   |   await expect(source).toBeEnabled();
  7   |   await source.setInputFiles({ name, mimeType: "text/csv", buffer: Buffer.from(text) });
  8   |   await expect(
  9   |     page.locator(".workspace"),
  10  |   ).toBeVisible();
  11  |   await expect(source).toBeEnabled();
  12  | }
  13  | export async function add(page: Page, headers: string[]) {
  14  |   const bulk = page.locator("details.bulk-columns");
  15  |   if ((await bulk.getAttribute("open")) === null)
  16  |     await bulk.locator("summary").click();
  17  |   await page.getByLabel("New column names").fill(headers.join("\n"));
  18  |   await page.getByRole("button", { name: "Add columns", exact: true }).click();
  19  | }
  20  | export async function edit(page: Page, header: string) {
  21  |   await page
  22  |     .getByRole("button", { name: `Edit ${header}`, exact: true })
  23  |     .click();
  24  |   await expect(
  25  |     page.getByRole("dialog", { name: /column settings/ }),
  26  |   ).toBeVisible();
  27  | }
  28  | export async function closeSettings(page: Page) {
  29  |   await page
  30  |     .getByRole("dialog")
  31  |     .getByRole("button", { name: "Done", exact: true })
  32  |     .click();
  33  | }
  34  | export async function fixed(
  35  |   page: Page,
  36  |   header: string,
  37  |   type: "text" | "number" | "blank",
  38  |   value = "",
  39  | ) {
  40  |   await edit(page, header);
  41  |   await page.getByLabel("Use a fixed value", { exact: true }).check();
  42  |   await page.getByLabel("Fixed value type", { exact: true }).selectOption(type);
  43  |   if (type !== "blank")
  44  |     await page.getByLabel(type === "number" ? "Fixed number" : "Fixed text", { exact: true }).fill(value);
  45  |   await closeSettings(page);
  46  | }
  47  | export async function rename(page: Page, header: string, name: string) {
  48  |   await edit(page, header);
  49  |   await page.getByLabel("Output column name", { exact: true }).fill(name);
  50  |   await closeSettings(page);
  51  | }
  52  | export async function remove(page: Page, header: string) {
  53  |   await edit(page, header);
  54  |   await page
  55  |     .getByRole("button", { name: `Remove ${header}`, exact: true })
  56  |     .click();
  57  | }
  58  | export async function move(
  59  |   page: Page,
  60  |   header: string,
  61  |   direction: "up" | "down",
  62  | ) {
  63  |   await edit(page, header);
  64  |   await page
  65  |     .getByRole("button", { name: `Move ${header} ${direction}`, exact: true })
  66  |     .click();
  67  |   await closeSettings(page);
  68  | }
  69  | export async function map(page: Page, header: string, source: string) {
  70  |   await page
  71  |     .locator(`.source-grid [data-source-key=${JSON.stringify(source)}]`)
> 72  |     .click();
      |      ^ Error: locator.click: Test timeout of 30000ms exceeded.
  73  |   await page
  74  |     .getByRole("button", { name: `Select output ${header}`, exact: true })
  75  |     .click();
  76  | }
  77  | // Performance setup uses real card click handlers without pointer scrolling overhead.
  78  | // Pointer actionability, native dragging and keyboard focus are covered separately.
  79  | export async function mapForPerformance(
  80  |   page: Page,
  81  |   header: string,
  82  |   source: string,
  83  | ) {
  84  |   await page
  85  |     .locator(`.source-grid [data-source-key=${JSON.stringify(source)}]`)
  86  |     .dispatchEvent("click");
  87  |   await page
  88  |     .getByRole("button", { name: `Select output ${header}`, exact: true })
  89  |     .dispatchEvent("click");
  90  | }
  91  | export async function preview(page: Page) {
  92  |   await expect(page.getByLabel("Full dataset counts")).toBeVisible();
  93  | }
  94  | export async function download(page: Page) {
  95  |   const pending = page.waitForEvent("download");
  96  |   await page
  97  |     .getByRole("button", { name: "Download converted CSV", exact: true })
  98  |     .click();
  99  |   const result = await pending;
  100 |   expect(result.suggestedFilename()).toBe("converted.csv");
  101 |   const path = await result.path();
  102 |   expect(path).not.toBeNull();
  103 |   return readFile(path!);
  104 | }
  105 | 
  106 | export async function splitField(page: Page, header: string, source: string, position: number, trim = true) {
  107 |   await edit(page, header);
  108 |   await page.getByLabel("Split a source column", { exact: true }).check();
  109 |   await page.getByLabel("Split source", { exact: true }).selectOption(source);
  110 |   await page.getByLabel("Use segment number", { exact: true }).fill(String(position));
  111 |   if (trim) await page.getByLabel("Trim whitespace around each segment", { exact: true }).check();
  112 |   await closeSettings(page);
  113 | }
  114 | 
  115 | export async function calculation(page: Page, header: string, left: string, right: string, operation: Extract<NonNullable<Field["recipe"]>, {kind:"calculate"}>["operation"], constant = false) {
  116 |   await edit(page, header);
  117 |   await page.getByLabel('Calculate with numbers', { exact:true }).check();
  118 |   await page.getByLabel('First source', { exact:true }).selectOption(left);
  119 |   await page.getByLabel('Operation', { exact:true }).selectOption(operation);
  120 |   if (constant) {
  121 |     await page.getByLabel('Second operand type', { exact:true }).selectOption('number');
  122 |     await page.getByLabel('Second fixed number', { exact:true }).fill(right);
  123 |   } else await page.getByLabel('Second source', { exact:true }).selectOption(right);
  124 |   await closeSettings(page);
  125 | }
  126 | 
```