import { useState } from "react";
import { useData, fmtINR, COHORT_LABEL, navigate, RiskBadge } from "../App.jsx";

export default function WatchList() {
  const { flags } = useData();
  const [tier, setTier] = useState("all");
  const [cohort, setCohort] = useState("all");

  const rows = flags.filter(
    (f) => (tier === "all" || f.tier === tier) && (cohort === "all" || f.etype === cohort)
  );

  const sel =
    "border border-slate-300 rounded px-2 py-1 text-sm bg-white text-slate-700";

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
        <h2 className="font-bold text-navy">Watch-list — {rows.length} flags</h2>
        <div className="ml-auto flex gap-2">
          <select className={sel} value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="all">All tiers</option>
            <option value="field_visit">Field visit (&gt;80%)</option>
            <option value="watch">Watch (60–80%)</option>
          </select>
          <select className={sel} value={cohort} onChange={(e) => setCohort(e.target.value)}>
            <option value="all">All cohorts</option>
            {Object.entries(COHORT_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-auto max-h-[calc(100vh-220px)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {["Enterprise", "Cohort", "District", "Flag month", "P50 forecast", "P(deficit)", "Drivers", "Recommended action"].map((h) => (
                <th key={h} className="text-left px-4 py-2 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((f, i) => (
              <tr
                key={i}
                className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                onClick={() => navigate(`#/enterprise/${f.ent_id}`)}
              >
                <td className="px-4 py-2 font-bold text-navy">E{f.ent_id}</td>
                <td className="px-4 py-2">{COHORT_LABEL[f.etype]}</td>
                <td className="px-4 py-2 text-slate-500">{f.district}</td>
                <td className="px-4 py-2 whitespace-nowrap">{f.month}</td>
                <td className="px-4 py-2 tabular-nums font-medium text-brick">{fmtINR(f.p50)}</td>
                <td className="px-4 py-2"><RiskBadge p={f.p_deficit} /></td>
                <td className="px-4 py-2 text-slate-600 max-w-xs">{f.drivers}</td>
                <td className="px-4 py-2 text-slate-600 max-w-xs">{f.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
