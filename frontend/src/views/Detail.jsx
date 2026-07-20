import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceDot,
  ResponsiveContainer, CartesianGrid, LineChart,
} from "recharts";
import { useData, fmtINR, COHORT_LABEL, navigate, RiskBadge } from "../App.jsx";

function Spark({ title, data, dataKey, color, fmt }) {
  const last = data[data.length - 1][dataKey];
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-semibold text-slate-500">{title}</span>
        <span className="text-xs font-bold tabular-nums" style={{ color }}>
          {fmt ? fmt(last) : last}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={54}>
        <LineChart data={data} margin={{ top: 6, bottom: 0, left: 0, right: 0 }}>
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} />
          <Tooltip
            formatter={(v) => [fmt ? fmt(v) : v, title]}
            labelFormatter={(i) => data[i]?.month}
            contentStyle={{ fontSize: 11 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Detail({ id }) {
  const { details } = useData();
  const d = details[id];
  if (!d) return <div className="text-slate-500">Enterprise not found.</div>;

  const hist = d.history.map((h) => ({ month: h.month, actual: h.ncf }));
  const lastHist = d.history[d.history.length - 1];
  const fc = d.forecast.map((f) => ({
    month: f.month, p50: f.p50, band: [f.p10, f.p90],
  }));
  // stitch so the forecast line connects to the last actual point
  const chart = [
    ...hist.slice(0, -1),
    { month: lastHist.month, actual: lastHist.ncf, p50: lastHist.ncf, band: [lastHist.ncf, lastHist.ncf] },
    ...fc,
  ];

  const flagPoint = d.flag_month ? fc.find((f) => f.month === d.flag_month) : null;
  const isRisky = d.max_p_deficit > 0.6;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("#/watchlist")} className="text-sm text-slate-500 hover:text-navy">
          ← Watch-list
        </button>
        <h2 className="text-xl font-extrabold text-navy">Enterprise E{id}</h2>
        <span className="text-sm text-slate-600">
          {COHORT_LABEL[d.etype]} · {d.district}, {d.state}
        </span>
        <span className="ml-auto text-sm flex items-center gap-2">
          Max 6-month deficit risk <RiskBadge p={d.max_p_deficit} />
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3 bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="font-bold text-navy text-sm mb-2">
            Net cash flow — 24-month history &amp; 6-month probabilistic forecast
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={chart} margin={{ top: 10, right: 20, bottom: 0, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ebf0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={2} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v, n) =>
                  n === "band"
                    ? [`${fmtINR(v[0])} – ${fmtINR(v[1])}`, "P10–P90 band"]
                    : [fmtINR(v), n === "actual" ? "Actual" : "Forecast P50"]}
                contentStyle={{ fontSize: 12 }}
              />
              <Area dataKey="band" fill="#c0392b" fillOpacity={0.15} stroke="none" />
              <ReferenceLine y={0} stroke="#1a2233" strokeWidth={1} />
              <Line dataKey="actual" stroke="#1f3864" strokeWidth={2} dot={{ r: 2 }} />
              <Line dataKey="p50" stroke="#c0392b" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} />
              {flagPoint && (
                <ReferenceDot
                  x={flagPoint.month} y={flagPoint.p50} r={7}
                  fill="#c0392b" stroke="#fff" strokeWidth={2}
                  label={{ value: "⚑ FLAG", position: "top", fill: "#c0392b", fontSize: 12, fontWeight: 700 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex gap-5 text-xs text-slate-500 mt-1 pl-2">
            <span><span className="inline-block w-3 h-0.5 bg-navy align-middle mr-1" />Actual</span>
            <span><span className="inline-block w-3 h-0.5 bg-brick align-middle mr-1" />Forecast P50</span>
            <span><span className="inline-block w-3 h-2 bg-brick/15 align-middle mr-1" />P10–P90 band</span>
          </div>
        </div>

        <div className={`rounded-lg shadow-sm border p-4 ${isRisky ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
          <h3 className={`font-bold text-sm mb-2 ${isRisky ? "text-brick" : "text-emerald-700"}`}>
            {isRisky ? `⚑ Early-warning flag — ${d.flag_month}` : "No flag — routine monitoring"}
          </h3>
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Why (drivers)</div>
          <p className="text-sm text-slate-700 mb-3 capitalize">{d.drivers}.</p>
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Recommended action</div>
          <p className="text-sm font-semibold text-slate-800">{d.action}</p>
          {isRisky && (
            <p className="text-[11px] text-slate-500 mt-3">
              Tier: {d.max_p_deficit > 0.8 ? "Field visit (>80%)" : "Watch (60–80%)"} · issued 2–3 months before projected deficit
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Spark title="UPI inflow" data={d.history} dataKey="upi" color="#1f3864" fmt={fmtINR} />
        <Spark title="Rainfall deviation (%)" data={d.history} dataKey="rain" color="#2980b9" fmt={(v) => `${v > 0 ? "+" : ""}${v}%`} />
        <Spark title="Mandi price index" data={d.history} dataKey="mandi" color="#8e6c2f" fmt={(v) => v.toFixed(1)} />
        <Spark title="SHG deposit missed" data={d.history} dataKey="shg_missed" color="#c0392b" fmt={(v) => (v ? "Missed" : "Paid")} />
      </div>
    </div>
  );
}
