import Big from "big.js";
import type { Field } from "./workflow";

// Bound plain-decimal input before Big/BigInt parsing, and expansion before formatting.
export const DECIMAL_INPUT_LIMIT = 1000;
export const DECIMAL_RESULT_LIMIT = 2000;
export const DECIMAL_GRAMMAR = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/u;
type Policy = Pick<Field, "wholeNumber" | "scale" | "rounding">;
type Operation = Extract<
  NonNullable<Field["recipe"]>,
  { kind: "calculate" }
>["operation"];
function roundingMode(
  mode: NonNullable<Field["rounding"]>["mode"],
): Big.RoundingMode {
  return mode === "half-up" ? 1 : mode === "half-even" ? 2 : 0;
}
export class NumericError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
function fail(code: string, message: string): never {
  throw new NumericError(code, message);
}
function parse(text: string): Big {
  if (text === "") fail("missing-operand", "A numeric operand is missing.");
  if (text.length > DECIMAL_INPUT_LIMIT)
    fail(
      "numeric-limit",
      "Numeric input exceeds the 1000-character precision limit.",
    );
  if (!DECIMAL_GRAMMAR.test(text))
    fail(
      "numeric-input",
      "Use a plain decimal operand without whitespace, units, separators or exponents.",
    );
  return new Big(text.startsWith("+") ? text.slice(1) : text);
}
function integerRatio(a: Big, b: Big): [bigint, bigint] {
  const scale = Math.max(0, a.c.length - a.e - 1, b.c.length - b.e - 1);
  return [
    BigInt(a.times(new Big(10).pow(scale)).toFixed(0)),
    BigInt(b.times(new Big(10).pow(scale)).toFixed(0)),
  ];
}
function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
}
function checkSize(value: Big, places: number) {
  if (Math.max(1, value.e + 1) + places > DECIMAL_RESULT_LIMIT)
    fail(
      "numeric-limit",
      "Result exceeds the 2000-digit precision limit. Reduce the operands or choose fewer decimal places.",
    );
}
function finish(value: Big, policy: Policy): string {
  if (policy.wholeNumber && !value.eq(value.round(0, 0)))
    fail(
      "whole-number",
      "The exact result must be a whole number before rounding.",
    );
  if (policy.rounding) {
    const { mode, places } = policy.rounding;
    value = value.round(places, roundingMode(mode));
    checkSize(value, places);
    return value.toFixed(places);
  }
  const places = Math.max(0, value.c.length - value.e - 1);
  checkSize(value, places);
  if (policy.scale !== undefined && places > policy.scale)
    fail(
      "numeric-precision",
      `Exact result exceeds the maximum of ${policy.scale} decimal places. Choose an explicit rounding rule or increase precision.`,
    );
  return value.toFixed();
}
export function validateDecimal(text: string, policy: Policy): string {
  return finish(parse(text), policy);
}
export function calculateDecimal(
  left: string,
  right: string,
  operation: Operation,
  policy: Policy,
): string {
  const a = parse(left),
    b = parse(right);
  if (operation !== "divide")
    return finish(
      operation === "add"
        ? a.plus(b)
        : operation === "subtract"
          ? a.minus(b)
          : a.times(b),
      policy,
    );
  if (b.eq(0))
    fail("division-zero", "Cannot divide by zero. Choose a nonzero divisor.");
  let places = policy.rounding?.places ?? 0;
  if (policy.wholeNumber || !policy.rounding) {
    const [numerator, denominator] = integerRatio(a, b);
    if (policy.wholeNumber && numerator % denominator !== 0n)
      fail(
        "whole-number",
        "The exact result must be a whole number before rounding.",
      );
    if (!policy.rounding) {
      let reduced = denominator / gcd(numerator, denominator);
      if (reduced < 0n) reduced = -reduced;
      let twos = 0,
        fives = 0;
      while (reduced % 2n === 0n) {
        reduced /= 2n;
        twos++;
      }
      while (reduced % 5n === 0n) {
        reduced /= 5n;
        fives++;
      }
      if (reduced !== 1n)
        fail(
          "nonterminating-division",
          "Nonterminating division requires an explicit rounding mode and decimal places.",
        );
      places = Math.max(twos, fives);
    }
  }
  // Division uses an isolated constructor: no shared DP/RM or library-default rounding.
  const Decimal = Big();
  Decimal.DP = places;
  Decimal.RM = policy.rounding ? roundingMode(policy.rounding.mode) : 0;
  if (places > DECIMAL_RESULT_LIMIT)
    fail(
      "numeric-limit",
      "Exact division exceeds the 2000-digit precision limit. Choose explicit rounding.",
    );
  const result = new Decimal(a).div(b);
  return finish(result, { ...policy, wholeNumber: false });
}
