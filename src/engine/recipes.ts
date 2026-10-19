import Big from "big.js";
import { parseDate } from "./dates";
import { calculateDecimal, validateDecimal, NumericError } from "./decimal";
import type { Workflow } from "./workflow";
import { displayValue, type SourceTable, type Value } from "./values";
import type { Issue } from "./issues";
import { validateWorkflow } from "./validation";
import { riskyText } from "../formats/spreadsheet-safety";
export type ResultRow = {
  id: string;
  record: number;
  line: number;
  values: Value[];
  provenance: ({
    corrected?: true;
    field: string;
    row: string;
    excel?: SourceTable["rows"][number]["cells"][number]["excel"];
    worksheet?: string;
    trim?: true;
    date?: NonNullable<Workflow["fields"][number]["date"]>;
    segment?: number;
    segmentTrim?: boolean;
  } & ({ source: string } | { constant: Value }))[];
  issues: Issue[];
  status: "valid" | "warning" | "invalid";
};
export type Run = {
  workflowIssues: Issue[];
  rows: ResultRow[];
  summary: {
    inputRows: number;
    skippedBlanks: number;
    candidates: number;
    valid: number;
    warningOnly: number;
    invalid: number;
    warningIssues: number;
    errorIssues: number;
    corrected: number;
    excluded: number;
  };
  riskyHeaders: string[];
  csvRisk: boolean;
};
export function evaluate(workflow: Workflow, source: SourceTable): Run {
  const workflowIssues = validateWorkflow(workflow, source);
  const run: Run = {
    workflowIssues,
    rows: [],
    summary: {
      inputRows: source.inputRows,
      skippedBlanks: source.skippedBlanks,
      candidates: source.rows.length,
      valid: 0,
      warningOnly: 0,
      invalid: 0,
      warningIssues: 0,
      errorIssues: 0,
      corrected: 0,
      excluded: 0,
    },
    csvRisk: false,
    riskyHeaders: workflow.fields
      .filter((f) => workflow.output.format === "csv" && workflow.output.header && riskyText(f.header))
      .map((f) => f.header),
  };
  if (workflowIssues.length) return run;
  const positions = new Map(source.columns.map((c) => [c.key, c.position]));
  for (const row of source.rows) {
    const issues: Issue[] = [],
      provenance: ResultRow["provenance"] = [];
    const values: Value[] = workflow.fields.map((f) => {
      const recipe = f.recipe;
      if (!recipe) throw new Error("Unvalidated recipe");
      const sourceKey =
        recipe.kind === "copy" || recipe.kind === "split"
          ? recipe.source
          : undefined;
      const add = (
        code: string,
        severity: "error" | "warning",
        reason: string,
        action: string,
        source = sourceKey,
      ) =>
        issues.push({
          code,
          scope: "row",
          severity,
          row: row.id,
          record: row.record,
          line: row.line,
          field: f.id,
          source,
          reason,
          action,
        });
      let unusableSource = false;
      const readSource = (source: string) => {
        const cell = row.cells[positions.get(source)!];
        const excel = cell?.excel;
        provenance.push({
          field: f.id,
          row: row.id,
          source,
          ...(cell?.original ? { corrected: true as const } : {}),
          ...(excel ? { excel: { ...excel } } : {}),
          ...(row.worksheet ? { worksheet: row.worksheet } : {}),
          ...(f.trim ? { trim: true as const } : {}),
          ...(f.date ? { date: { ...f.date } } : {}),
          ...(recipe.kind === "split"
            ? { segment: recipe.index, segmentTrim: recipe.trim }
            : {}),
        });
        const issue = (
          code: string,
          severity: "error" | "warning",
          reason: string,
          action: string,
        ) => {
          add(code, severity, `${f.header}: ${reason}`, action, source);
        };
        if (excel) {
          if (excel.type === "e") {
            unusableSource = true;
            issue(
              "excel-cell-error",
              "error",
              "the referenced Excel cell contains an error.",
              "Correct the source workbook and reupload.",
            );
            return "";
          }
          if (excel.formula !== undefined) {
            if (
              excel.value === undefined ||
              !["n", "s", "str", "b"].includes(excel.type) ||
              (typeof excel.value === "number" && !Number.isFinite(excel.value))
            ) {
              unusableSource = true;
              issue(
                "excel-cache-missing",
                "error",
                "the referenced formula has no usable cached result.",
                "Recalculate and save the workbook in a trusted spreadsheet application, then reupload; formulas are never evaluated here.",
              );
              return "";
            }
            issue(
              "excel-formula-cache",
              "warning",
              "a cached Excel formula result is used and may be stale.",
              "Verify the result, or recalculate and save the workbook in a trusted spreadsheet application before reuploading.",
            );
          }
          if (excel.unsupportedFormat)
            issue(
              "excel-format",
              "warning",
              "the Excel display format is unsupported; the raw value is retained.",
              "Check the source formatting or supply the intended identifier as literal text.",
            );
          if (excel.type === "n" && f.type === "text") {
            const significant = cell.raw
              .replace(/^[+-]/u, "")
              .split(/[eE]/u)[0]
              .replace(".", "")
              .replace(/^0+/u, "");
            if (
              Math.abs(Number(excel.value)) >= 1e15 ||
              significant.length > 15
            )
              issue(
                "excel-precision",
                "warning",
                "a numeric identifier may already have lost precision in Excel; lost digits cannot be recovered.",
                "Verify the identifier against its original source and store it as literal text.",
              );
          }
          if (excel.type === "n" && f.type === "number" && typeof excel.value === "number" && Number.isFinite(excel.value))
            return new Big(String(excel.value)).toFixed();
          if (excel.type === "b") return excel.value ? "TRUE" : "FALSE";
          if (
            excel.type === "n" &&
            f.type === "text" &&
            !excel.unsupportedFormat
          )
            return cell.display;
        }
        return cell?.raw ?? "";
      };
      const readConstant = (constant: Value) => {
        provenance.push({
          field: f.id,
          row: row.id,
          constant: { ...constant },
          ...(f.trim ? { trim: true as const } : {}),
          ...(f.date ? { date: { ...f.date } } : {}),
        });
        return { ...constant };
      };
      let value: Value;
      switch (recipe.kind) {
        case "calculate": {
          const operand = (o: typeof recipe.left) =>
            o.kind === "source"
              ? readSource(o.source)
              : displayValue(readConstant(o));
          const left = operand(recipe.left),
            right = operand(recipe.right);
          try {
            value = {
              kind: "number",
              decimal: calculateDecimal(left, right, recipe.operation, f),
            };
          } catch (error) {
            if (!(error instanceof NumericError)) throw error;
            add(
              error.code,
              "error",
              `${f.header}: ${error.message}`,
              "Correct the operands or explicitly change numeric validation / rounding settings.",
            );
            value = { kind: "blank" };
          }
          break;
        }
        case "copy":
          value = { kind: "text", text: readSource(recipe.source) };
          break;
        case "constant":
          value = readConstant(recipe.value);
          break;
        case "combine":
          value = {
            kind: "text",
            text: recipe.components
              .map((c) =>
                c.kind === "source"
                  ? readSource(c.source)
                  : displayValue(readConstant({ kind: "text", text: c.text })),
              )
              .join(recipe.separator),
          };
          break;
        case "split": {
          const parts = readSource(recipe.source).split(recipe.delimiter);
          value = { kind: "blank" };
          if (parts.length !== recipe.segments) {
            add(
              "split-count",
              "error",
              `${f.header}: expected ${recipe.segments} segments but found ${parts.length}.`,
              "Correct the source delimiter positions or change the expected segment count.",
            );
            break;
          }
          const segments = recipe.trim
            ? parts.map((part) => part.trim())
            : parts;
          const empty = segments.flatMap((part, index) =>
            part === "" && !recipe.optionalEmpty.includes(index)
              ? [index + 1]
              : [],
          );
          if (empty.length) {
            add(
              "split-empty",
              "error",
              `${f.header}: required segment ${empty.join(", ")} is empty.`,
              "Correct the source or explicitly mark that empty position optional; retain its delimiters.",
            );
            break;
          }
          value = { kind: "text", text: segments[recipe.index] };
          break;
        }
      }
      if (unusableSource) value = { kind: "blank" };
      if (f.trim && value.kind === "text")
        value = { kind: "text", text: value.text.trim() };
      if (
        f.type === "number" &&
        recipe.kind !== "calculate" &&
        displayValue(value) !== ""
      ) {
        try {
          const decimal = validateDecimal(displayValue(value), f);
          // Preserve approved typed fixed literals byte-for-byte when no precision policy changes them.
          value = {
            kind: "number",
            decimal:
              recipe.kind === "constant" && !f.rounding
                ? displayValue(value)
                : decimal,
          };
        } catch (error) {
          if (!(error instanceof NumericError)) throw error;
          add(
            error.code,
            "error",
            `${f.header}: ${error.message}`,
            "Correct the numeric value or change the explicit numeric settings.",
          );
          value = { kind: "blank" };
        }
      }
      if (f.date && displayValue(value) !== "") {
        const sourceCell = recipe.kind === "copy" ? row.cells[positions.get(recipe.source)!] : undefined;
        const excel = sourceCell?.excel;
        let date;
        if (f.date.source !== "excel") date = parseDate(displayValue(value), f.date.source);
        else if (sourceCell?.original) date = parseDate(displayValue(value), "YYYY-MM-DD");
        else if (excel?.type === "n" && !excel.dateInvalid) date = excel.date;
        if (date) value = { kind: "date", ...date, format: f.date.target };
        else {
          add(
            "date-input",
            "error",
            `${f.header}: expected a real calendar date in ${f.date.source} format.`,
            "Correct the source date or choose its exact format. Use zero-padded dates, years 0001–9999, and no time component; whitespace is preserved unless trimming is enabled.",
          );
          value = { kind: "blank" };
        }
      }
      const text = displayValue(value);
      if (f.required && text.trim() === "")
        add(
          "required",
          "error",
          `${f.header} is required but blank.`,
          "Correct the source file and reupload, or change the field rule.",
        );
      if (f.maxLength && [...text].length > f.maxLength)
        add(
          "max-length",
          "error",
          `${f.header} exceeds ${f.maxLength} characters.`,
          "Correct the source file or increase the maximum length.",
        );
      if (workflow.output.format === "csv" && value.kind === "text" && riskyText(text))
        add(
          "csv-risk",
          "warning",
          `${f.header} may be interpreted as a spreadsheet formula.`,
          "Choose escaped output or raw TMS text before download.",
        );
      return value.kind === "text" && text === "" ? { kind: "blank" } : value;
    });
    const status = issues.some((i) => i.severity === "error")
      ? "invalid"
      : issues.length ? "warning" : "valid";
    countResult(run, { status, issues });
    run.rows.push({
      id: row.id,
      record: row.record,
      line: row.line,
      values,
      provenance,
      issues,
      status,
    });
  }
  return run;
}

export function countResult(run: Run, row: Pick<ResultRow, "status" | "issues">) {
  run.summary[row.status === "warning" ? "warningOnly" : row.status]++;
  run.summary.warningIssues += row.issues.filter(i => i.severity === "warning").length;
  run.summary.errorIssues += row.issues.filter(i => i.severity === "error").length;
  if (row.issues.some(i => i.code === "csv-risk")) run.csvRisk = true;
}
