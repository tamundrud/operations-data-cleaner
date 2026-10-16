# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calculations.spec.ts >> AC-05/06/10 contextual calculations export exact bytes, save/reopen and portable reuse
- Location: tests/e2e/calculations.spec.ts:14:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Saved in this browser.', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('Saved in this browser.', { exact: true }) with timeout 5000ms
  - waiting for getByText('Saved in this browser.', { exact: true })

```

```yaml
- main:
  - paragraph: OPERATIONS DATA CLEANER · CSV PREVIEW
  - heading "Match your columns." [level=1]
  - paragraph: Map a source table to the columns your import needs.
  - strong: Processed in your browser
  - text: No account. Files stay in memory.
  - navigation "Conversion steps": 1 · Upload CSV 2 · Map columns 3 · Preview & download
  - region "Workflow configuration":
    - heading "Save & repeat" [level=2]
    - paragraph: Saved workflows belong to this browser and origin. Browser data can be cleared. Download a backup to recover or transfer your configuration.
    - text: Saved workflows
    - combobox "Saved workflows":
      - option "Choose a workflow" [selected]
    - button "Open workflow" [disabled]
    - text: Import workflow
    - button "Import workflow"
    - button "New conversion"
    - text: Workflow name
    - textbox "Workflow name"
    - button "Save workflow"
    - button "Download workflow"
    - text: Unsaved configuration
    - paragraph: Workflow files contain field names and configured constants, which may reveal business information. Share them carefully. Source records and filenames are excluded.
    - status: Enter a nonblank workflow name before saving.
    - button "Retry workflow storage"
  - region "1. Choose your source":
    - heading "1. Choose your source" [level=2]
    - paragraph: UTF-8 CSV with a header row. Leading zeros and spaces are preserved.
    - text: Source delimiter
    - combobox "Source delimiter":
      - option "Detect automatically" [selected]
      - option "Comma"
      - option "Semicolon"
      - option "Tab"
    - text: Upload source CSV
    - button "Upload source CSV"
    - button "Try sample data"
    - button "Try fixed fields example"
    - button "End session"
  - status: Source loaded · 1 candidate rows · comma delimiter detected. Verify the source columns below.
  - group: Inspect original source table
  - region "2. Match your columns":
    - heading "2. Match your columns" [level=2]
    - paragraph: Drag either card onto its counterpart, or select one and then the other.
    - text: Import output template
    - button "Upload destination CSV template"
    - button "+ Add output column"
    - button "Output order"
    - heading "Matched columns 4" [level=3]
    - text: Drag the grip to reorder a pair · Alt+↑ / Alt+↓
    - region "Matched columns":
      - button "Reorder pair Reference": ⠿
      - button "Select paired source ID for Reference":
        - strong: ID
        - text: "001234"
      - button "Select output Reference":
        - strong: 1 Reference
        - text: Confirmed · copies ID
      - button "Unlink Reference": ×
      - button "Edit Reference": ⋯
      - button "Reorder pair Cases out": ⠿
      - strong: Calculation · divide
      - text: Units ÷ Factor
      - button "Select output Cases out":
        - strong: 2 Cases out
        - text: Calculate · divide · exact, no rounding · whole numbers required
      - button "Unlink Cases out": ×
      - button "Edit Cases out": ⋯
      - button "Reorder pair Weight": ⠿
      - strong: Calculation · multiply
      - text: Cases × 12
      - button "Select output Weight":
        - strong: 3 Weight
        - text: Calculate · multiply · exact, no rounding
      - button "Unlink Weight": ×
      - button "Edit Weight": ⋯
      - button "Reorder pair Sum": ⠿
      - strong: Calculation · add
      - text: A + B
      - button "Select output Sum":
        - strong: 4 Sum
        - text: Calculate · add · exact, no rounding
      - button "Unlink Sum": ×
      - button "Edit Sum": ⋯
    - heading "Still to match 0" [level=3]
    - text: Sources remain available for reuse
    - heading "Available sources" [level=3]
    - text: 6 columns Search source columns
    - searchbox "Search source columns"
    - region "Available source columns":
      - button "Select source ID":
        - strong: ID
        - text: 001234 Used in 1 output
      - button "Select source Units":
        - strong: Units
        - text: 24 Used in 1 output
      - button "Select source Factor":
        - strong: Factor
        - text: 4 Used in 1 output
      - button "Select source Cases":
        - strong: Cases
        - text: 15 Used in 1 output
      - button "Select source A":
        - strong: A
        - text: 0.1 Used in 1 output
      - button "Select source B":
        - strong: B
        - text: 0.2 Used in 1 output
    - heading "Unmatched outputs" [level=3]
    - text: Drop a source here
    - paragraph: Or drag an output onto any source card.
    - region "Unmatched output columns":
      - paragraph: All outputs matched.
    - group:
      - text: Add several columns New column names (one per line)
      - textbox "New column names (one per line)"
      - button "Add columns" [disabled]
    - status: Reference now copies ID. Export order unchanged.
    - strong: Export order
    - text: 1 · Reference 2 · Cases out 3 · Weight 4 · Sum
  - region "3. Preview & download":
    - heading "3. Preview & download" [level=2]
    - group "CSV export settings":
      - text: CSV export settings CSV delimiter
      - combobox "CSV delimiter":
        - option "Comma" [selected]
        - option "Semicolon"
        - option "Tab"
      - checkbox "Include UTF-8 BOM"
      - text: Include UTF-8 BOM
      - checkbox "Include header row" [checked]
      - text: Include header row
      - paragraph: UTF-8 encoding · CRLF line endings. Settings update preview automatically.
    - text: Input rows
    - strong: "1"
    - text: Skipped blanks
    - strong: "0"
    - text: Candidate rows
    - strong: "1"
    - text: Valid
    - strong: "1"
    - text: Warning rows
    - strong: "0"
    - text: Invalid
    - strong: "0"
    - text: Warning issues
    - strong: "0"
    - text: Error issues
    - strong: "0"
    - text: Corrected
    - strong: "0"
    - text: Excluded
    - strong: "0"
    - checkbox "Show only rows with exceptions (0)"
    - text: Show only rows with exceptions (0)
    - region "Output preview, scroll horizontally":
      - table "Output preview · page 1 of 1 · download representation":
        - caption: Output preview · page 1 of 1 · download representation
        - rowgroup:
          - row "Source record / line Status Reference Cases out Weight Sum":
            - columnheader "Source record / line"
            - columnheader "Status"
            - columnheader "Reference"
            - columnheader "Cases out"
            - columnheader "Weight"
            - columnheader "Sum"
        - rowgroup:
          - row "2 / 2 valid 001234 6 180 0.3":
            - rowheader "2 / 2"
            - cell "valid"
            - cell "001234"
            - cell "6"
            - cell "180"
            - cell "0.3"
    - button "Previous page" [disabled]
    - text: Page 1 of 1
    - button "Next page" [disabled]
    - button "Download converted CSV"
    - paragraph: Validation checks your chosen rules. Acceptance by your destination system depends on its import requirements.
  - text: U7 internal preview · Exact calculations, explicit numeric validation and reusable local workflows. Data is cleared on reload or End session. Source data and file names are never saved. Static application assets are requested from the host; customer file processing stays local.
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | import AxeBuilder from "@axe-core/playwright";
  3   | import { readFile } from "node:fs/promises";
  4   | import {
  5   |   add,
  6   |   calculation,
  7   |   closeSettings,
  8   |   download,
  9   |   edit,
  10  |   map,
  11  |   upload,
  12  | } from "./helpers";
  13  |
  14  | test("AC-05/06/10 contextual calculations export exact bytes, save/reopen and portable reuse", async ({
  15  |   page,
  16  |   browser,
  17  | }) => {
  18  |   await page.goto("/");
  19  |   await upload(page, "ID,Units,Factor,Cases,A,B\n001234,24,4,15,0.1,0.2");
  20  |   await add(page, ["Reference", "Cases out", "Weight", "Sum"]);
  21  |   await map(page, "Reference", "id");
  22  |   await calculation(page, "Cases out", "units", "factor", "divide");
  23  |   await calculation(page, "Weight", "cases", "12", "multiply", true);
  24  |   await calculation(page, "Sum", "a", "b", "add");
  25  |   const expected = "Reference,Cases out,Weight,Sum\r\n001234,6,180,0.3\r\n";
  26  |   expect((await download(page)).toString()).toBe(expected);
  27  |   await expect(page.locator(".pair")).toHaveCount(4);
  28  |   await edit(page, "Cases out");
  29  |   await page.getByLabel("Require whole numbers before rounding").check();
  30  |   expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  31  |   await closeSettings(page);
  32  |   await page.getByLabel("Workflow name", { exact: true }).fill("Synthetic U7");
  33  |   await page
  34  |     .getByRole("button", { name: "Save workflow", exact: true })
  35  |     .click();
  36  |   await expect(
  37  |     page.getByText("Saved in this browser.", { exact: true }),
> 38  |   ).toBeVisible();
      |     ^ Error: expect(locator).toBeVisible() failed
  39  |   const id = await page
  40  |     .getByLabel("Saved workflows", { exact: true })
  41  |     .inputValue();
  42  |   const event = page.waitForEvent("download");
  43  |   await page
  44  |     .getByRole("button", { name: "Download workflow", exact: true })
  45  |     .click();
  46  |   const json = await readFile((await (await event).path())!, "utf8");
  47  |   expect(json).not.toContain("001234");
  48  |   await page.reload();
  49  |   await page.getByLabel("Saved workflows", { exact: true }).selectOption(id);
  50  |   await page
  51  |     .getByRole("button", { name: "Open workflow", exact: true })
  52  |     .click();
  53  |   await upload(
  54  |     page,
  55  |     "B,Extra,Factor,ID,Cases,Units,A\n0.2,x,4,001234,15,24,0.1",
  56  |   );
  57  |   expect((await download(page)).toString()).toBe(expected);
  58  |   const fresh = await browser.newContext({
  59  |     baseURL: "http://127.0.0.1:4173",
  60  |     serviceWorkers: "block",
  61  |   });
  62  |   try {
  63  |     const next = await fresh.newPage();
  64  |     await next.goto("/");
  65  |     await next.getByLabel("Import workflow", { exact: true }).setInputFiles({
  66  |       name: "u7.json",
  67  |       mimeType: "application/json",
  68  |       buffer: Buffer.from(json),
  69  |     });
  70  |     await upload(next, "Units,Factor,Cases,A,B,ID\n24,4,15,0.1,0.2,001234");
  71  |     expect((await download(next)).toString()).toBe(expected);
  72  |   } finally {
  73  |     await fresh.close();
  74  |   }
  75  | });
  76  |
  77  | test("errors stay visible, rounding is explicit, and fractional cases fail before rounding", async ({
  78  |   page,
  79  | }) => {
  80  |   await page.goto("/");
  81  |   await upload(page, "Units,Factor\n1,3\n24,0\n24,\n24,4 kg");
  82  |   await add(page, ["Cases"]);
  83  |   await calculation(page, "Cases", "units", "factor", "divide");
  84  |   await page.getByLabel("Show only rows with exceptions").check();
  85  |   await expect(page.locator(".issues")).toContainText(
  86  |     "Nonterminating division",
  87  |   );
  88  |   await expect(page.locator(".issues")).toContainText("Cannot divide by zero");
  89  |   await expect(page.locator(".issues")).toContainText("operand is missing");
  90  |   await expect(page.locator(".issues")).toContainText("plain decimal");
  91  |   await expect(
  92  |     page.getByRole("button", { name: "Download converted CSV", exact: true }),
  93  |   ).toBeDisabled();
  94  |   await upload(page, "Units,Factor\n1,3");
  95  |   await edit(page, "Cases");
  96  |   await page.getByLabel("Rounding", { exact: true }).selectOption("half-even");
  97  |   await page.getByLabel("Rounding decimal places", { exact: true }).fill("2");
  98  |   await closeSettings(page);
  99  |   expect((await download(page)).toString()).toBe("Cases\r\n0.33\r\n");
  100 |   await edit(page, "Cases");
  101 |   await page.getByLabel("Require whole numbers before rounding").check();
  102 |   await page.getByLabel("Rounding decimal places", { exact: true }).fill("0");
  103 |   await closeSettings(page);
  104 |   await page.getByLabel("Show only rows with exceptions").check();
  105 |   await expect(page.locator(".issues")).toContainText(
  106 |     "whole number before rounding",
  107 |   );
  108 |   await expect(
  109 |     page.getByRole("button", { name: "Download converted CSV", exact: true }),
  110 |   ).toBeDisabled();
  111 | });
  112 |
  113 | test("mobile calculation settings, output type switches and keyboard focus preserve paired cards", async ({
  114 |   page,
  115 | }) => {
  116 |   await page.setViewportSize({ width: 390, height: 844 });
  117 |   await page.goto("/");
  118 |   await upload(page, "A,B\n-1.245,0");
  119 |   await add(page, ["Number"]);
  120 |   await calculation(page, "Number", "a", "b", "add");
  121 |   await edit(page, "Number");
  122 |   await page.getByLabel("Rounding", { exact: true }).selectOption("half-up");
  123 |   await page
  124 |     .getByLabel("Maximum decimal places (optional)", { exact: true })
  125 |     .fill("2");
  126 |   expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  127 |   await closeSettings(page);
  128 |   await expect(
  129 |     page.getByRole("button", { name: "Edit Number", exact: true }),
  130 |   ).toBeFocused();
  131 |   expect((await download(page)).toString()).toBe("Number\r\n-1.25\r\n");
  132 |   expect(
  133 |     await page
  134 |       .locator("html")
  135 |       .evaluate((el) => el.scrollWidth <= el.clientWidth),
  136 |   ).toBe(true);
  137 |   await edit(page, "Number");
  138 |   await page.getByLabel("Copy a source column", { exact: true }).check();
```
