import { DATE_PATTERNS, type DatePattern } from "../engine/dates";
import type { Field } from "../engine/workflow";
export function DateSettings({
  field,
  change,
}: {
  field: Field;
  change: (patch: Partial<Field>) => void;
}) {
  return (
    <fieldset className="recipe-settings">
      <legend>Date formats</legend>
      <p className="helper">
        Choose both formats explicitly. Dates are never guessed from your
        browser or locale. Use zero-padded day/month and a four-digit year;
        times are not supported.
      </p>
      {(["source", "target"] as const).map((side) => (
        <label key={side}>
          {side === "source" ? "Source date format" : "Output date format"}
          <select
            aria-label={
              side === "source" ? "Source date format" : "Output date format"
            }
            value={field.date?.[side] ?? ""}
            onChange={(e) =>
              change({
                date: {
                  source: field.date?.source ?? ("" as DatePattern),
                  target: field.date?.target ?? ("" as DatePattern),
                  [side]: e.target.value as DatePattern,
                },
              })
            }
          >
            <option value="">Choose a format</option>
            {DATE_PATTERNS.map((pattern) => (
              <option key={pattern} value={pattern}>
                {pattern}
              </option>
            ))}
          </select>
        </label>
      ))}
      <p className="helper">
        For example, 03/04/2026 means March 4 with MM/DD/YYYY, and April 3 with
        DD/MM/YYYY. Impossible dates fail validation. Empty optional dates stay
        blank.
      </p>
    </fieldset>
  );
}
