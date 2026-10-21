export type IssueSource = { source: string; operand?: "left" | "right" };
export type IssueCause = { key: string; sources: IssueSource[]; rule?: string };
export type Issue = {
  code: string;
  scope: "workflow" | "row";
  severity: "error" | "warning";
  field?: string;
  row?: string;
  record?: number;
  line?: number;
  source?: string;
  cause?: IssueCause;
  causedBy?: string[];
  reason: string;
  action: string;
};

export type ReviewItem = { key: string; issue: Issue; fields: string[]; sources: IssueSource[]; rule?: string };
// Presentation only: raw diagnostics continue to determine validity and totals.
export function reviewIssues(issues: Issue[]): ReviewItem[] {
  const errors = new Set(issues.filter(i => i.severity === "error" && i.cause).map(i => i.cause!.key));
  const items = new Map<string, ReviewItem>();
  issues.forEach((issue, index) => {
    if (issue.code === "required" && issue.causedBy?.some(key => errors.has(key))) return;
    const key = issue.cause?.key ?? `diagnostic-${index}`;
    const existing = items.get(key);
    if (existing) {
      if (issue.field && !existing.fields.includes(issue.field)) existing.fields.push(issue.field);
    } else items.set(key, {key, issue, fields: issue.field ? [issue.field] : [], sources: issue.cause?.sources ?? (issue.source ? [{source:issue.source}] : []), rule:issue.cause?.rule});
  });
  return [...items.values()];
}
