import { useState } from "react";
import { useData, COHORT_LABEL, navigate } from "../App.jsx";

const cellColor = (p) => {
  // green -> yellow -> red
  const hue = (1 - p) * 120;
  return `hsl(${hue}, 68%, ${88 - p * 40}%)`;
};

export default function Calendar() {
  const { calendar } = useData();
  const [cohort, setCohort] = useState("all");
  const rows = calendar.rows.filter((r) => cohort === "all" || r.etype === cohort).slice(0, 60);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
        <h2 className="font-bold text-navy">Liquidity calendar — P(cash deficit), next 6 months</h2>
        <span className="text-xs text-slate-400">top 60 by risk · click a row for detail</span>
        <select
          className="ml-auto border border-slate-300 rounded px-2 py-1 text-sm bg-white"
          value={cohort}
          onChange={(e) => setCohort(e.target.value)}
        >
          <option value="all">All cohorts</option>
          {Object.entries(COHORT_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div className="overflow-auto max-h-[calc(100vh-220px)] px-4 pb-4">
        <table className="w-full text-xs border-separate border-spacing-0.5">
          <thead className="sticky top-0 bg-white">
            <tr className="text-slate-500 uppercase tracking-wide">
              <th className="text-left py-2 pr-2 font-semibold">Enterprise</th>
              <th className="text-left py-2 pr-2 font-semibold">Cohort</th>
              {calendar.months.map((m) => (
                <th key={m} className="py-2 font-semibold text-center">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="cursor-pointer hover:opacity-80"
                  onClick={() => navigate(`#/enterprise/${r.id}`)}>
                <td className="pr-2 py-0.5 font-bold text-navy whitespace-nowrap">
                  E{r.id} <span className="font-normal text-slate-400">{r.district}</span>
                </td>
                <td className="pr-2 text-slate-500 whitespace-nowrap">{COHORT_LABEL[r.etype]}</td>
                {r.p.map((p, i) => (
                  <td key={i}
                      className="text-center font-semibold tabular-nums rounded"
                      style={{ background: cellColor(p), color: p > 0.65 ? "#fff" : "#1a2233", minWidth: 64 }}>
                    {Math.round(p * 100)}%
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
