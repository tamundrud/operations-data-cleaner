import { useEffect, useRef, useState } from "react";
import { reviewIssues } from "../engine/issues";
import type { Session, SessionState } from "../session/controller";
import type { SourceFilter } from "../session/worker-protocol";
import SourceCorrection from "./SourceCorrection";

export default function SourceInspector({session,state,disabled,clearChoice}: {
  session: Session; state: SessionState; disabled: boolean; clearChoice: () => void;
}) {
  const details=useRef<HTMLDetailsElement>(null);
  const [open,setOpen]=useState(false);
  const view=state.view!;
  useEffect(()=>{
    if(view.sourceTarget && details.current) {details.current.open=true;setOpen(true);}
  },[view.sourceTarget,view.sourceNavigation]);
  const count=state.pendingCorrections.length;
  const pendingByCell=new Map(state.pendingCorrections.map(edit=>[JSON.stringify([edit.row,edit.column]),edit]));
  const results=new Map(view.sourceResults.map(r=>[r.id,r]));
  const apply=()=>{clearChoice();session.applyCorrections();};
  return <details ref={details} className="panel source-inspection" onToggle={event=>{
    if(event.target===event.currentTarget) setOpen(event.currentTarget.open);
  }}>
    <summary>Inspect original source table</summary>
    {open && <section aria-labelledby="source-title">
      <h2 id="source-title">Source table</h2>
      <p>Current source values · {view.sourceCount} matching rows across the full dataset. Corrections stay in this session; originals remain inspectable.</p>
      <p className="small">Resolved records stay here after Apply so you can confirm the result, until you change the source filter or page.</p>
      <div className="source-actions">
        <label>Source row filter <select aria-label="Source row filter" disabled={disabled} value={view.sourceFilter} onChange={e=>session.sourcePage({page:0,filter:e.target.value as SourceFilter})}>
          <option value="all">All source rows ({view.summary.candidates})</option>
          <option value="exceptions">Rows with exceptions ({view.summary.invalid+view.summary.warningOnly})</option>
          <option value="invalid">Invalid rows only ({view.summary.invalid})</option>
        </select></label>
        <button className="primary" disabled={disabled || !count} onClick={apply}>Apply {count} corrections</button>
        <button disabled={disabled || !count} onClick={()=>{if(window.confirm(`Discard ${count} pending changes?`)) session.discardPending();}}>Discard pending changes</button>
        <button disabled={disabled || !(view.summary.invalid+view.summary.warningOnly)} onClick={()=>session.sourcePage({page:0,filter:"all",nextAfter:view.sourceTarget ?? view.sourceRows.at(-1)?.id ?? ""})}>Next unresolved record</button>
      </div>
      <p role="status">{count ? `${count} pending corrections. Download is blocked until you apply or discard them.` : state.correctionMessage}</p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Source table, scroll horizontally">
        <table>
          <caption>{view.worksheet ? `Worksheet ${view.worksheet} · ` : ""}Uploaded source columns and original record references</caption>
          <thead><tr><th>Source record / line</th><th>Result</th>{view.columns.map(c=><th key={c.key}>{c.header}</th>)}</tr></thead>
          <tbody>{view.sourceRows.map(r=>{
            const result=results.get(r.id);
            const items=reviewIssues(result?.issues ?? []);
            return <tr key={r.id}>
              <th>{r.worksheet ? `${r.worksheet} · ` : ""}{r.record} / {r.line}</th>
              <td>{result?.status ?? "Mapping needs attention"}</td>
              {view.columns.map(c=>{
                const related=items.filter(item=>item.sources.some(s=>s.source===c.key));
                const severity=related.some(i=>i.issue.severity==="error") ? "error" : related.length ? "warning" : undefined;
                const pending=pendingByCell.get(JSON.stringify([r.id,c.key]));
                return <td key={c.key} className={[severity ? `source-${severity}` : "",pending ? "source-pending" : ""].join(" ")}>
                  {severity && <strong>{severity==="error" ? "Source error" : "Source warning"}</strong>}
                  <SourceCorrection cell={r.cells[c.position] ?? {kind:"text",raw:"",display:""}} header={c.header} record={r.record}
                    disabled={disabled} pending={pending} navigation={view.sourceNavigation} target={view.sourceTarget===r.id && (view.sourceColumn ? view.sourceColumn===c.key : items[0]?.sources[0]?.source===c.key)}
                    onSave={value=>{clearChoice();session.stageCorrection(r.id,c.key,value);}}
                    onRevert={()=>{clearChoice();session.stageCorrection(r.id,c.key,"",true);}} />
                </td>;
              })}
            </tr>;
          })}</tbody>
        </table>
      </div>
      <div className="pagination">
        <button disabled={disabled || view.sourcePage===0} onClick={()=>session.sourcePage({page:view.sourcePage-1,filter:view.sourceFilter})}>Previous source page</button>
        <span>Source page {view.sourcePage+1} of {view.sourceTotalPages}</span>
        <button disabled={disabled || view.sourcePage+1>=view.sourceTotalPages} onClick={()=>session.sourcePage({page:view.sourcePage+1,filter:view.sourceFilter})}>Next source page</button>
      </div>
      {view.sourceRows.length>10 && <button disabled={disabled || !count} onClick={apply}>Apply {count} corrections</button>}
    </section>}
  </details>;
}
