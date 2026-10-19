import type { Run } from './recipes';

/** Serializers share the same gate; permission belongs to the current request, never the workflow. */
export function exportRows(run: Run, partialAcknowledged = false) {
  if (run.workflowIssues.length)
    throw new Error('Export blocked. Map every field and resolve workflow errors.');
  const eligible = run.rows.filter(row => row.status !== 'invalid');
  if (!eligible.length)
    throw new Error('Export blocked. Include at least one eligible data row; correct source cells or update validation.');
  if (eligible.length !== run.rows.length && !partialAcknowledged)
    throw new Error('Export blocked. Review and acknowledge the exact excluded rows before partial export.');
  return eligible;
}
