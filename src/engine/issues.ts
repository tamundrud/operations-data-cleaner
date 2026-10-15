export type Issue = {
  code: string;
  scope: "workflow" | "row";
  severity: "error" | "warning";
  field?: string;
  row?: string;
  record?: number;
  line?: number;
  source?: string;
  reason: string;
  action: string;
};
