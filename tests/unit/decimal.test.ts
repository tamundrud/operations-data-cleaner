import { expect, test } from "vitest";
import { calculateDecimal } from "../../src/engine/decimal";

test.each([
  ["24", "4", "divide", "6"],
  ["15", "12", "multiply", "180"],
  ["0.1", "0.2", "add", "0.3"],
  ["0.1", "0.2", "subtract", "-0.1"],
  ["-15", "12", "multiply", "-180"],
  ["0", "4", "divide", "0"],
  ["0", "0", "add", "0"],
  ["1", "8", "divide", "0.125"],
  ["1", "0.0002", "divide", "5000"],
  [".5", "+2.", "multiply", "1"],
] as const)("%s %s %s is exact", (a, b, op, result) =>
  expect(calculateDecimal(a, b, op, {})).toBe(result),
);

test.each([
  "",
  " ",
  " 2",
  "2 ",
  "1e3",
  "1,000",
  "12 kg/case",
  "$12",
  "NaN",
  "Infinity",
  "0x12",
  "2\n",
])("rejects strict input %j", (input) => {
  expect(() => calculateDecimal(input, "1", "add", {})).toThrow(
    /operand|decimal/i,
  );
});
test("zero divisor, recurring division and precision excess are explicit errors", () => {
  expect(() => calculateDecimal("1", "0", "divide", {})).toThrow(/zero/i);
  expect(() => calculateDecimal("1", "3", "divide", {})).toThrow(
    /nonterminating/i,
  );
  expect(() => calculateDecimal("1", "8", "divide", { scale: 2 })).toThrow(
    /precision/i,
  );
});
test.each([
  ["half-up", "1.245", "1.25"],
  ["half-even", "1.245", "1.24"],
  ["truncate", "1.249", "1.24"],
  ["half-up", "-1.245", "-1.25"],
  ["half-even", "-1.255", "-1.26"],
  ["truncate", "-1.249", "-1.24"],
] as const)("%s rounds %s explicitly", (mode, a, result) => {
  expect(
    calculateDecimal(a, "0", "add", { rounding: { mode, places: 2 } }),
  ).toBe(result);
});
test("whole numbers are tested before rounding, including recurring fractions", () => {
  for (const [a, b] of [
    ["5", "2"],
    ["1", "3"],
  ])
    expect(() =>
      calculateDecimal(a, b, "divide", {
        wholeNumber: true,
        rounding: { mode: "half-up", places: 0 },
      }),
    ).toThrow(/whole/i);
  expect(calculateDecimal("24", "4", "divide", { wholeNumber: true })).toBe(
    "6",
  );
});
test("resource limits are checked before computation; large identifiers need no numeric conversion", () => {
  expect(() => calculateDecimal("1".repeat(1001), "1", "add", {})).toThrow(
    /limit|precision/i,
  );
  expect(() =>
    calculateDecimal("1", (2n ** 3000n).toString(), "divide", {}),
  ).toThrow(/limit|precision/i);
  expect(calculateDecimal("9".repeat(999), "1", "add", {})).toBe(
    "1" + "0".repeat(999),
  );
});

test.each([
  ["half-up", "1245", "1000", "1.25"],
  ["half-even", "1245", "1000", "1.24"],
  ["truncate", "-1249", "1000", "-1.24"],
  ["half-up", "-1245", "1000", "-1.25"],
  ["half-even", "-1255", "1000", "-1.26"],
  ["half-even", "1", "3", "0.33"],
  ["half-up", "2", "3", "0.67"],
  ["truncate", "-2", "3", "-0.66"],
] as const)("division %s: %s / %s = %s", (mode, a, b, expected) => {
  expect(
    calculateDecimal(a, b, "divide", { rounding: { mode, places: 2 } }),
  ).toBe(expected);
  expect(calculateDecimal("1", "8", "divide", {})).toBe("0.125");
});

test.each([
  ["3", "6", "0.5"],
  ["3", "-6", "-0.5"],
] as const)("division reduces non-2/5 factors: %s / %s", (a, b, expected) => {
  expect(calculateDecimal(a, b, "divide", {})).toBe(expected);
});

test("result expansion accepts 2000 digits but rejects extra rounding padding", () => {
  const operand = "9".repeat(1000);
  const expected = (BigInt(operand) * BigInt(operand)).toString();
  expect(expected).toHaveLength(2000);
  expect(calculateDecimal(operand, operand, "multiply", {})).toBe(expected);
  expect(
    calculateDecimal(operand, operand, "multiply", {
      rounding: { mode: "half-up", places: 0 },
    }),
  ).toBe(expected);
  try {
    calculateDecimal(operand, operand, "multiply", {
      rounding: { mode: "half-up", places: 1 },
    });
    expect.fail("Expected explicit result precision limit");
  } catch (error) {
    expect(error).toMatchObject({ code: "numeric-limit" });
  }
});
