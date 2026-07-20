import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useData, fmtINR, COHORT_LABEL, riskColor, navigate, RiskBadge } from "../App.jsx";

const DONUT_COLORS = ["#1f3864", "#c0392b", "#6b8cba"];

function Stat({ label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-3xl font-extrabold mt-1" style={{ color: accent || "#1f3864" }}>
        {value}
      </div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </div>
  );
}

export default function Overview() {
  const { kpis, stress, enterprises } = useData();
  const donut = Object.entries(kpis.cohorts).map(([k, v]) => ({
    name: COHORT_LABEL[k],
    value: v,
  }));
  const top = enterprises.slice(0, 8);
  const maxStress = Math.max(...stress.map((s) => s.stress));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Forecast MAE"
          value={fmtINR(kpis.mae)}
          sub={`vs ${fmtINR(kpis.mae_naive)} naive baseline — ${kpis.mae_improvement_pct}% better`}
        />
        <Stat
          label="Flag precision"
          value={`${Math.round(kpis.precision * 100)}%`}
          sub="of deficit flags were real deficits (6-month holdout)"
          accent="#c0392b"
        />
        <Stat
          label="Flag recall"
          value={`${Math.round(kpis.recall * 100)}%`}
          sub="of actual deficits caught in advance"
          accent="#c0392b"
        />
        <Stat
          label="Enterprises monitored"
          value={kpis.n_enterprises}
          sub={`${kpis.n_flagged} flagged · ${kpis.n_flags} enterprise-month flags`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="font-bold text-navy text-sm mb-3">
            State stress index — mean P(deficit), next 6 months
          </h3>
          {stress.map((s) => (
            <div key={s.state} className="flex items-center gap-2 mb-2">
              <div className="w-36 text-xs text-slate-600 truncate">{s.state}</div>
              <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${(s.stress / maxStress) * 100}%`,
                    background: riskColor(s.stress + 0.25),
                  }}
                />
              </div>
              <div className="w-10 text-xs font-bold tabular-nums text-right">
                {Math.round(s.stress * 100)}%
              </div>
            </div>
          ))}
          <p className="text-[11px] text-slate-400 mt-2">
            District-mapped synthetic cohorts; drought regimes drive divergence.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="font-bold text-navy text-sm mb-1">Cohort breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={donut} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {donut.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-xs">
            {donut.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: DONUT_COLORS[i] }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="font-bold text-navy text-sm mb-2">Highest-risk enterprises</h3>
          <table className="w-full text-xs">
            <tbody>
              {top.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate(`#/enterprise/${e.id}`)}
                >
                  <td className="py-1.5 font-bold text-navy">E{e.id}</td>
                  <td className="text-slate-600">{COHORT_LABEL[e.etype]}</td>
                  <td className="text-slate-500">{e.district}</td>
                  <td className="text-right">
                    <RiskBadge p={e.max_p_deficit} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => navigate("#/watchlist")}
            className="mt-3 w-full text-xs font-semibold text-brick hover:underline text-left"
          >
            Full watch-list →
          </button>
        </div>
      </div>
    </div>
  );
}
