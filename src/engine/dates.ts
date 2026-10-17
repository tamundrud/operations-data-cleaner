export const DATE_PATTERNS = [
  "YYYY-MM-DD",
  "MM/DD/YYYY",
  "DD/MM/YYYY",
] as const;
export type DatePattern = (typeof DATE_PATTERNS)[number];
export type CalendarDate = { year: number; month: number; day: number };

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

// Calendar arithmetic only: no locale parser, Date object, or timezone conversion.
export function parseDate(
  text: string,
  pattern: DatePattern,
): CalendarDate | undefined {
  const match =
    pattern === "YYYY-MM-DD"
      ? /^(\d{4})-(\d{2})-(\d{2})$/u.exec(text)
      : /^(\d{2})\/(\d{2})\/(\d{4})$/u.exec(text);
  if (!match || match[0] !== text) return undefined;
  const year = Number(match[pattern === "YYYY-MM-DD" ? 1 : 3]);
  const month = Number(match[pattern === "MM/DD/YYYY" ? 1 : 2]);
  const day = Number(
    match[pattern === "YYYY-MM-DD" ? 3 : pattern === "DD/MM/YYYY" ? 1 : 2],
  );
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = month === 2 && leap ? 29 : DAYS_IN_MONTH[month - 1];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days)
    return undefined;
  return { year, month, day };
}

export function formatDate(date: CalendarDate, pattern: DatePattern): string {
  const year = String(date.year).padStart(4, "0"),
    month = String(date.month).padStart(2, "0"),
    day = String(date.day).padStart(2, "0");
  if (pattern === "YYYY-MM-DD") return `${year}-${month}-${day}`;
  return pattern === "MM/DD/YYYY"
    ? `${month}/${day}/${year}`
    : `${day}/${month}/${year}`;
}
