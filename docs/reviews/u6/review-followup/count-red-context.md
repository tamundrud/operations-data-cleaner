# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: address-recipes.spec.ts >> reducing split count removes obsolete optional positions visibly and keeps the recipe usable
- Location: tests/e2e/address-recipes.spec.ts:102:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('status').filter({ hasText: 'Optional empty positions beyond the new segment count were removed.' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('status').filter({ hasText: 'Optional empty positions beyond the new segment count were removed.' }) with timeout 5000ms
  - waiting for getByRole('status').filter({ hasText: 'Optional empty positions beyond the new segment count were removed.' })

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
    - status
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
    - heading "Matched columns 1" [level=3]
    - text: Drag the grip to reorder a pair · Alt+↑ / Alt+↓
    - region "Matched columns":
      - button "Reorder pair Street": ⠿
      - button "Select paired source Address for Street":
        - strong: Address
        - text: a,b,c
      - button "Select output Street":
        - strong: 1 Street
        - text: Split · segment 1 of 3 · delimiter "," · trims segments
      - button "Unlink Street": ×
      - button "Edit Street": ⋯
    - heading "Still to match 0" [level=3]
    - text: Sources remain available for reuse
    - heading "Available sources" [level=3]
    - text: 1 columns Search source columns
    - searchbox "Search source columns"
    - region "Available source columns":
      - button "Select source Address":
        - strong: Address
        - text: a,b,c Used in 1 output
    - heading "Unmatched outputs" [level=3]
    - text: Drop a source here
    - paragraph: Or drag an output onto any source card.
    - region "Unmatched output columns":
      - paragraph: All outputs matched.
    - group:
      - text: Add several columns New column names (one per line)
      - textbox "New column names (one per line)"
      - button "Add columns" [disabled]
    - status: 1 of 1 outputs matched. No matches are guessed.
    - strong: Export order
    - text: 1 · Street
    - dialog "Street — column settings":
      - heading "Street — column settings" [level=2]
      - group:
        - text: Output column name
        - textbox "Output column name": Street
        - group "Output value":
          - text: Output value
          - radio "Copy a source column"
          - text: Copy a source column
          - radio "Use a fixed value"
          - text: Use a fixed value
          - radio "Split a source column" [checked]
          - text: Split a source column
          - radio "Combine sources and text"
          - text: Combine sources and text
        - group "Split a source into segments":
          - text: Split a source into segments Split source
          - combobox "Split source":
            - option "Choose a source"
            - option "Address" [selected]
          - text: Split delimiter
          - textbox "Split delimiter": ","
          - text: Expected segment count
          - spinbutton "Expected segment count": "3"
          - text: Use segment number
          - spinbutton "Use segment number": "1"
          - checkbox "Trim whitespace around each segment" [checked]
          - text: Trim whitespace around each segment
          - group "Allow empty positions (optional)":
            - text: Allow empty positions (optional)
            - checkbox "Segment 1 may be empty"
            - text: Segment 1 may be empty
            - checkbox "Segment 2 may be empty"
            - text: Segment 2 may be empty
            - checkbox "Segment 3 may be empty"
            - text: Segment 3 may be empty
          - paragraph: The count must match exactly. Keep delimiters for empty positions, such as a,,c,d. All other positions must contain text. Each output reads the original source independently.
        - checkbox "Remove leading and trailing whitespace"
        - text: Remove leading and trailing whitespace
        - paragraph: Changes update preview automatically. Trimming is off. Text keeps its original whitespace.
        - group: Validation (optional)
        - button "Move Street up" [disabled]: Move output up
        - button "Move Street down" [disabled]: Move output down
        - button "Remove Street": Remove output
      - button "Done"
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
    - strong: "0"
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
    - alert:
      - strong: Mapping needs attention
      - list:
        - listitem: Split positions must be unique and within the expected segment count. Correct the segment positions.
    - button "Download converted CSV" [disabled]
    - paragraph: Validation checks your chosen rules. Acceptance by your destination system depends on its import requirements.
  - text: U5 internal preview · Confirmable header suggestions and reusable local workflows. Data is cleared on reload or End session. Source data and file names are never saved. Static application assets are requested from the host; customer file processing stays local.
```

# Test source

```ts
  8   |   for (const [i, header] of ["Street", "City", "Province", "Postal"].entries()) await splitField(page, header, "address", i + 1);
  9   |   await edit(page, "Label");
  10  |   await page.getByLabel("Combine sources and text", { exact: true }).check();
  11  |   await page.getByLabel("Component 1 source", { exact: true }).selectOption("id");
  12  |   await page.getByLabel("Component 2 text", { exact: true }).fill("Dock");
  13  |   await page.getByRole("button", { name: "Add source component", exact: true }).click();
  14  |   await page.getByLabel("Component 3 source", { exact: true }).selectOption("empty");
  15  |   await page.getByLabel("Combination separator", { exact: true }).fill(" | ");
  16  |   await page.getByRole("button", { name: "Move component 2 up", exact: true }).click();
  17  |   await expect(page.getByLabel("Component 1 text", { exact: true })).toHaveValue("Dock");
  18  |   await page.getByRole("button", { name: "Move component 1 down", exact: true }).click();
  19  |   await closeSettings(page);
  20  |   await preview(page);
  21  | }
  22  | const expected = "Street,City,Province,Postal,Label\r\n123 Main St,Vancouver,BC,V5K 0A1,001234 | Dock | \r\n";
  23  | 
  24  | test("AC-03/04 contextual split/combine, saved reuse and fresh-context JSON preserve exact output", async ({ page, browser }) => {
  25  |   await page.goto("/");
  26  |   await upload(page, await readFile("tests/fixtures/addresses/source.csv", "utf8"));
  27  |   await configure(page);
  28  |   expect((await download(page)).toString()).toBe(expected);
  29  |   await expect(page.locator(".pair")).toHaveCount(5);
  30  |   await expect(page.locator(".source-grid [data-source-key=address]")).toContainText("Used in 4 outputs");
  31  |   await expect(page.locator(".source-grid [data-source-key=id]")).toContainText("Used in 1 output");
  32  |   await page.getByLabel("Workflow name", { exact: true }).fill("Synthetic address workflow");
  33  |   await page.getByRole("button", { name: "Save workflow", exact: true }).click();
  34  |   await expect(page.getByText("Saved in this browser.", { exact: true })).toBeVisible();
  35  |   const saved = await page.getByLabel("Saved workflows", { exact: true }).inputValue();
  36  |   const event = page.waitForEvent("download");
  37  |   await page.getByRole("button", { name: "Download workflow", exact: true }).click();
  38  |   const file = await event, json = await readFile((await file.path())!, "utf8");
  39  |   expect(json).not.toMatch(/123 Main St|001234|synthetic.csv/);
  40  |   expect(JSON.parse(json).source.referencedHeaders).toEqual(["address", "id", "empty"]);
  41  |   await page.reload();
  42  |   await page.getByLabel("Saved workflows", { exact: true }).selectOption(saved);
  43  |   await page.getByRole("button", { name: "Open workflow", exact: true }).click();
  44  |   const reordered = 'Empty,Extra, ADDRESS , ID \n,unused,"123 Main St, Vancouver, BC, V5K 0A1",001234';
  45  |   await upload(page, reordered);
  46  |   expect((await download(page)).toString()).toBe(expected);
  47  |   await expect(page.getByRole("heading", { name: "2. Match your columns", exact: true })).not.toBeVisible();
  48  |   const fresh = await browser.newContext({ baseURL: "http://127.0.0.1:4173", serviceWorkers: "block" });
  49  |   try {
  50  |     const next = await fresh.newPage(); await next.goto("/");
  51  |     await next.getByLabel("Import workflow", { exact: true }).setInputFiles({ name: "synthetic-u6.json", mimeType: "application/json", buffer: Buffer.from(json) });
  52  |     await upload(next, reordered);
  53  |     expect((await download(next)).toString()).toBe(expected);
  54  |     await upload(next, 'ID,Empty,Address renamed\n001234,,"a,b,c,d"');
  55  |     await expect(next.getByRole("alert")).toContainText("missing");
  56  |     await expect(next.getByRole("button", { name: "Download converted CSV", exact: true })).toBeDisabled();
  57  |   } finally { await fresh.close(); }
  58  | });
  59  | 
  60  | test("strict count and optional empty slots show row/field errors and block invalid download", async ({ page }) => {
  61  |   await page.goto("/");
  62  |   await upload(page, 'Address\n"123 Main St, Vancouver, BC, V5K 0A1, extra"\n"123 Main St, BC, V5K 0A1"\n"123 Main St,,BC,V5K 0A1"');
  63  |   await add(page, ["Street"]);
  64  |   await splitField(page, "Street", "address", 1);
  65  |   await page.getByLabel("Show only rows with exceptions").check();
  66  |   await expect(page.locator(".issues")).toContainText("Record 2, line 2: Street: expected 4 segments but found 5.");
  67  |   await expect(page.locator(".issues")).toContainText("Record 3, line 3: Street: expected 4 segments but found 3.");
  68  |   await expect(page.locator(".issues")).toContainText("Record 4, line 4: Street: required segment 2 is empty.");
  69  |   await expect(page.getByRole("button", { name: "Download converted CSV", exact: true })).toBeDisabled();
  70  |   await edit(page, "Street");
  71  |   await page.getByLabel("Segment 2 may be empty", { exact: true }).check();
  72  |   await closeSettings(page);
  73  |   await expect(page.getByLabel("Full dataset counts")).toContainText("Invalid");
  74  |   await upload(page, 'Address\n"123 Main St,,BC,V5K 0A1"');
  75  |   expect((await download(page)).toString()).toBe("Street\r\n123 Main St\r\n");
  76  | });
  77  | 
  78  | test("keyboard recipe controls retain paired-card ordering, literal-only combinations and mobile accessibility", async ({ page }) => {
  79  |   await page.setViewportSize({ width: 390, height: 844 });
  80  |   await page.goto("/"); await upload(page, "ID\n001234"); await add(page, ["Label"]);
  81  |   const editButton = page.getByRole("button", { name: "Edit Label", exact: true });
  82  |   await editButton.focus(); await page.keyboard.press("Enter");
  83  |   await page.getByLabel("Combine sources and text", { exact: true }).check();
  84  |   await page.getByLabel("Component 1 type", { exact: true }).selectOption("literal");
  85  |   await page.getByLabel("Component 1 text", { exact: true }).fill("0012");
  86  |   await page.getByLabel("Combination separator", { exact: true }).fill(";");
  87  |   await expect(page.getByRole("button", { name: "Remove component 1", exact: true })).toBeDisabled();
  88  |   await page.getByRole("button", { name: "Add literal component", exact: true }).click();
  89  |   await page.getByLabel("Component 3 text", { exact: true }).fill("tail");
  90  |   await page.getByRole("button", { name: "Move component 3 up", exact: true }).click();
  91  |   await expect(page.getByLabel("Component 2 text", { exact: true })).toHaveValue("tail");
  92  |   await page.getByRole("button", { name: "Remove component 2", exact: true }).click();
  93  |   await expect(page.getByLabel("Component 3 type", { exact: true })).toHaveCount(0);
  94  |   expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  95  |   await closeSettings(page); await expect(editButton).toBeFocused();
  96  |   expect((await download(page)).toString()).toBe("Label\r\n0012;\r\n");
  97  |   expect(await page.locator("html").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  98  |   await page.getByRole("button", { name: "Unlink Label", exact: true }).click();
  99  |   await expect(page.getByRole("button", { name: "Select output Label", exact: true })).toContainText("Unmatched");
  100 | });
  101 | 
  102 | test("reducing split count removes obsolete optional positions visibly and keeps the recipe usable", async ({ page }) => {
  103 |   await page.goto("/"); await upload(page, 'Address\n"a,b,c"');
  104 |   await add(page, ["Street"]); await splitField(page, "Street", "address", 1);
  105 |   await edit(page, "Street");
  106 |   await page.getByLabel("Segment 4 may be empty", { exact: true }).check();
  107 |   await page.getByLabel("Expected segment count", { exact: true }).fill("3");
> 108 |   await expect(page.getByRole("status").filter({ hasText: "Optional empty positions beyond the new segment count were removed." })).toBeVisible();
      |                                                                                                                                     ^ Error: expect(locator).toBeVisible() failed
  109 |   await closeSettings(page);
  110 |   expect((await download(page)).toString()).toBe("Street\r\na\r\n");
  111 |   const pending = page.waitForEvent("download");
  112 |   await page.getByRole("button", { name: "Download workflow", exact: true }).click();
  113 |   const file = await pending;
  114 |   expect(JSON.parse(await readFile((await file.path())!, "utf8")).fields[0].recipe.optionalEmpty).toEqual([]);
  115 | });
  116 | 
```