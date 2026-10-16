import { normalizeHeader } from "../engine/workflow";
import { logisticsEquivalents } from "./dictionary";

// Headers only: return every candidate in source order, without choosing or creating a recipe.
export function suggestMatches(sourceHeaders: readonly string[], outputHeader: string): string[] {
  const output = normalizeHeader(outputHeader);
  if (!output) return [];
  const equivalents = logisticsEquivalents.find((group) => group.includes(output));
  return sourceHeaders.filter((header) => {
    const source = normalizeHeader(header);
    return source === output || Boolean(equivalents?.includes(source));
  });
}
