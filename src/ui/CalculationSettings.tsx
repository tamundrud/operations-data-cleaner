import { DECIMAL_INPUT_LIMIT } from "../engine/decimal";
import type { Field } from "../engine/workflow";
import type { SourceColumn } from "../engine/values";
type Calculation = Extract<NonNullable<Field["recipe"]>, { kind: "calculate" }>;
export function CalculationSettings({
  recipe,
  columns,
  change,
}: {
  recipe: Calculation;
  columns: SourceColumn[];
  change: (recipe: Calculation) => void;
}) {
  return (
    <fieldset className="recipe-settings">
      <legend>Calculation</legend>
      <p className="helper">
        Choose both operands explicitly. Constants are plain numbers; no units
        or conversion factors are inferred.
      </p>
      {(["left", "right"] as const).map((side) => {
        const operand = recipe[side],
          label = side === "left" ? "First" : "Second";
        return (
          <fieldset key={side}>
            <legend>{label} operand</legend>
            <label>
              {label} operand type
              <select
                aria-label={`${label} operand type`}
                value={operand.kind}
                onChange={(e) =>
                  change({
                    ...recipe,
                    [side]:
                      e.target.value === "source"
                        ? { kind: "source", source: "" }
                        : { kind: "number", decimal: "" },
                  })
                }
              >
                <option value="source">Source column</option>
                <option value="number">Fixed number</option>
              </select>
            </label>
            {operand.kind === "source" ? (
              <label>
                {label} source
                <select
                  aria-label={`${label} source`}
                  value={operand.source}
                  onChange={(e) =>
                    change({
                      ...recipe,
                      [side]: { kind: "source", source: e.target.value },
                    })
                  }
                >
                  <option value="">Choose a source</option>
                  {columns.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.header}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                {label} fixed number
                <input
                  type="text"
                  inputMode="decimal"
                  maxLength={DECIMAL_INPUT_LIMIT}
                  aria-label={`${label} fixed number`}
                  value={operand.decimal}
                  onChange={(e) =>
                    change({
                      ...recipe,
                      [side]: { kind: "number", decimal: e.target.value },
                    })
                  }
                />
              </label>
            )}
            {side === "left" && (
              <label>
                Operation
                <select
                  aria-label="Operation"
                  value={recipe.operation}
                  onChange={(e) =>
                    change({
                      ...recipe,
                      operation: e.target.value as Calculation["operation"],
                    })
                  }
                >
                  <option value="add">Add (+)</option>
                  <option value="subtract">Subtract (−)</option>
                  <option value="multiply">Multiply (×)</option>
                  <option value="divide">Divide (÷)</option>
                </select>
              </label>
            )}
          </fieldset>
        );
      })}
    </fieldset>
  );
}
export function NumericSettings({
  field,
  change,
}: {
  field: Field;
  change: (patch: Partial<Field>) => void;
}) {
  return (
    <fieldset className="recipe-settings">
      <legend>Numeric precision and validation</legend>
      <label className="check">
        <input
          type="checkbox"
          checked={field.wholeNumber ?? false}
          onChange={(e) => change({ wholeNumber: e.target.checked })}
        />
        Require whole numbers before rounding
      </label>
      <label>
        Maximum decimal places (optional)
        <input
          type="number"
          min="0"
          max="100"
          value={field.scale ?? ""}
          onChange={(e) =>
            change({
              scale: e.target.value === "" ? undefined : Number(e.target.value),
            })
          }
        />
      </label>
      <label>
        Rounding
        <select
          aria-label="Rounding"
          value={field.rounding?.mode ?? "none"}
          onChange={(e) =>
            change({
              rounding:
                e.target.value === "none"
                  ? undefined
                  : {
                      mode: e.target.value as NonNullable<
                        Field["rounding"]
                      >["mode"],
                      places: field.rounding?.places ?? field.scale ?? 2,
                    },
            })
          }
        >
          <option value="none">No rounding — require exact result</option>
          <option value="half-up">Round half up</option>
          <option value="half-even">Round half to even</option>
          <option value="truncate">Truncate toward zero</option>
        </select>
      </label>
      {field.rounding && (
        <>
          <label>
            Rounding decimal places
            <input
              type="number"
              min="0"
              max="100"
              value={field.rounding.places}
              onChange={(e) =>
                change({
                  rounding: {
                    ...field.rounding!,
                    places:
                      e.target.value === "" ? NaN : Number(e.target.value),
                  },
                })
              }
            />
          </label>
          <p className="helper">
            At 2 places:{" "}
            {field.rounding.mode === "half-up"
              ? "1.245 → 1.25; −1.245 → −1.25"
              : field.rounding.mode === "half-even"
                ? "1.245 → 1.24; −1.255 → −1.26"
                : "1.249 → 1.24; −1.249 → −1.24"}
            . The selected rule applies at your chosen decimal places.
          </p>
        </>
      )}
      <p className="helper">
        No rounding is applied unless selected. Recurring division and precision
        excess are errors without rounding. Whole-number validation always
        checks the exact result first. Plain decimals only (for example -12.50);
        no whitespace, units, commas, currency or exponents.
      </p>
    </fieldset>
  );
}
