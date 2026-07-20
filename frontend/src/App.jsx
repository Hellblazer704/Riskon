import { createContext, useContext, useEffect, useState } from "react";
import Overview from "./views/Overview.jsx";
import WatchList from "./views/WatchList.jsx";
import Detail from "./views/Detail.jsx";
import Calendar from "./views/Calendar.jsx";

export const DataCtx = createContext(null);
export const useData = () => useContext(DataCtx);

export const fmtINR = (v) =>
  (v < 0 ? "−₹" : "₹") + Math.abs(Math.round(v)).toLocaleString("en-IN");

export const COHORT_LABEL = {
  kharif_farmer: "Kharif farmer",
  dairy_shg: "Dairy SHG",
  kirana_trader: "Kirana trader",
};

export const riskColor = (p) =>
  p > 0.8 ? "#c0392b" : p > 0.6 ? "#e67e22" : p > 0.35 ? "#f1c40f" : "#27ae60";

export function RiskBadge({ p }) {
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-xs font-bold text-white tabular-nums"
      style={{ background: riskColor(p) }}
    >
      {Math.round(p * 100)}%
    </span>
  );
}

export const navigate = (hash) => (window.location.hash = hash);

function useRoute() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  useEffect(() => {
    const fn = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  return hash;
}

const TABS = [
  ["#/", "Overview"],
  ["#/watchlist", "Watch-list"],
  ["#/calendar", "Liquidity calendar"],
];

export default function App() {
  const [data, setData] = useState(null);
  const route = useRoute();

  useEffect(() => {
    const files = ["kpis", "enterprises", "flags", "calendar", "details", "stress"];
    Promise.all(files.map((f) => fetch(`/data/${f}.json`).then((r) => r.json())))
      .then((res) => setData(Object.fromEntries(files.map((f, i) => [f, res[i]]))));
  }, []);

  let view = <Overview />;
  if (route.startsWith("#/watchlist")) view = <WatchList />;
  else if (route.startsWith("#/calendar")) view = <Calendar />;
  else if (route.startsWith("#/enterprise/"))
    view = <Detail id={route.split("/")[2]} />;

  return (
    <DataCtx.Provider value={data}>
      <div className="min-h-screen flex flex-col">
        <header className="bg-navy text-white shadow-md sticky top-0 z-20">
          <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center gap-8">
            <div className="cursor-pointer" onClick={() => navigate("#/")}>
              <span className="text-xl font-extrabold tracking-wide">RISKON</span>
              <span className="ml-3 text-xs text-slate-300 hidden md:inline">
                AI cash-flow early warning for rural micro enterprises
              </span>
            </div>
            <nav className="flex gap-1 ml-auto">
              {TABS.map(([h, label]) => (
                <button
                  key={h}
                  onClick={() => navigate(h)}
                  className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                    route === h || (h === "#/" && route.startsWith("#/enterprise"))
                      ? "bg-white text-navy"
                      : "text-slate-200 hover:bg-navy-dark"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-[1800px] w-full mx-auto px-6 py-5">
          {data ? (
            view
          ) : (
            <div className="grid grid-cols-4 gap-4 mt-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-28 rounded-lg bg-slate-200 animate-pulse" />
              ))}
            </div>
          )}
        </main>

        <footer className="bg-navy-dark text-slate-300 text-xs text-center py-2">
          Calibrated synthetic data — Round 2 prototype · NABARD Hackathon @ GFF 2026
        </footer>
      </div>
    </DataCtx.Provider>
  );
}
