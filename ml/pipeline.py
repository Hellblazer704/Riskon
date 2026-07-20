"""RISKON pipeline — synthetic panel -> quantile forecasts -> risk flags -> JSON export.

Refactor of gen_data.py + forecast.py (NABARD Round 1). Seed and model
hyperparameters are unchanged so results match the Round 1 deck.

Usage:  python ml/pipeline.py            (writes frontend/public/data/*.json)
"""
import json
import os

import numpy as np
import pandas as pd
from scipy.stats import norm
from sklearn.ensemble import GradientBoostingRegressor

OUT = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "data")

rng = np.random.default_rng(42)

N_PER_TYPE = 60
MONTHS = 42  # 36 train + 6 holdout
START = pd.Timestamp("2023-01-01")

SEASON = {
    "kharif_farmer": np.array([0.5, 0.5, 0.6, 0.7, 0.6, 0.4, 0.4, 0.5, 0.8, 1.8, 2.2, 1.0]),
    "dairy_shg":     np.array([1.2, 1.3, 1.1, 1.0, 0.9, 0.8, 0.7, 0.7, 0.8, 1.0, 1.1, 1.3]),
    "kirana_trader": np.array([0.9, 0.8, 1.0, 1.3, 1.1, 0.9, 0.9, 1.0, 1.1, 1.5, 1.6, 1.0]),
}
COST_SEASON = {
    "kharif_farmer": np.array([0.6, 0.6, 0.7, 0.8, 0.9, 1.8, 1.9, 1.2, 0.9, 0.7, 0.6, 0.6]),
    "dairy_shg":     np.array([0.9, 0.9, 1.0, 1.0, 1.1, 1.4, 1.6, 1.5, 1.2, 1.0, 0.9, 0.9]),
    "kirana_trader": np.array([1.0, 0.9, 1.0, 1.2, 1.0, 0.9, 0.9, 1.0, 1.2, 1.5, 1.4, 0.9]),
}
BASE_INCOME = {"kharif_farmer": 18000, "dairy_shg": 14000, "kirana_trader": 26000}
DIGITAL_SHARE = {"kharif_farmer": 0.25, "dairy_shg": 0.45, "kirana_trader": 0.65}

DISTRICTS = [
    ("Vidarbha", "Maharashtra"), ("Marathwada", "Maharashtra"),
    ("Bundelkhand", "Uttar Pradesh"), ("Mahbubnagar", "Telangana"),
    ("Anantapur", "Andhra Pradesh"), ("Kalahandi", "Odisha"),
    ("Dharwad", "Karnataka"), ("Sabarkantha", "Gujarat"),
    ("Mandya", "Karnataka"), ("Nashik", "Maharashtra"),
]


def simulate():
    rows = []
    ent_id = 0
    for etype in SEASON:
        for _ in range(N_PER_TYPE):
            ent_id += 1
            base = BASE_INCOME[etype] * rng.lognormal(0, 0.25)
            emi = base * rng.uniform(0.10, 0.30)
            dig = np.clip(DIGITAL_SHARE[etype] + rng.normal(0, 0.12), 0.05, 0.9)
            skill = rng.normal(0, 0.10)
            district_rain = rng.normal(0, 12, MONTHS)
            drought = np.zeros(MONTHS)
            if etype != "kirana_trader" and rng.random() < 0.30:
                d0 = rng.integers(12, 30)
                drought[d0:d0 + 4] = -rng.uniform(20, 45)
            price = 100 + np.cumsum(rng.normal(0.2, 2.0, MONTHS))
            fatigue = 0.0
            for m in range(MONTHS):
                date = START + pd.DateOffset(months=m)
                moy = date.month - 1
                rain_dev = district_rain[m] + drought[m]
                lag_rain = district_rain[max(0, m - 1)] + drought[max(0, m - 1)]
                rain_mult = 1.0
                if etype != "kirana_trader":
                    rain_mult = 1.0 + 0.008 * np.clip(lag_rain, -50, 15)
                price_mult = price[m] / 100 if etype == "kharif_farmer" else 1.0
                income = (base * SEASON[etype][moy] * rain_mult * price_mult
                          * (1 + skill) * rng.lognormal(0, 0.15))
                cost = base * 0.55 * COST_SEASON[etype][moy] * rng.lognormal(0, 0.12)
                hh = base * 0.30 * rng.lognormal(0, 0.08)
                net = income - cost - hh - emi
                fatigue = max(0.0, fatigue * 0.7 + (1.0 if net < 0 else -0.3))
                net -= fatigue * 0.02 * base
                upi_in = income * dig * rng.uniform(0.85, 1.1)
                rows.append(dict(
                    ent_id=ent_id, etype=etype, month=date, m_idx=m,
                    income=round(income), input_cost=round(cost),
                    hh_expense=round(hh), loan_emi=round(emi),
                    upi_inflow=round(upi_in),
                    upi_txn_count=int(upi_in / rng.uniform(180, 450)) + 1,
                    upi_counterparties=max(1, int(rng.normal(14, 5) * dig)),
                    cash_sales_est=round(income * (1 - dig) * rng.uniform(0.7, 1.2)),
                    mandi_price_idx=round(price[m], 1),
                    rainfall_dev=round(rain_dev, 1),
                    shg_deposit_missed=int(net < -0.15 * base and rng.random() < 0.6),
                    fatigue=round(fatigue, 2),
                    net_cash_flow=round(net),
                ))
    return pd.DataFrame(rows)


def run():
    df = simulate()
    df = df.sort_values(["ent_id", "m_idx"]).reset_index(drop=True)

    # ---------- features ----------
    g = df.groupby("ent_id")
    for lag in (1, 2, 3, 6, 12):
        df[f"ncf_lag{lag}"] = g["net_cash_flow"].shift(lag)
    df["ncf_roll3"] = g["net_cash_flow"].transform(lambda s: s.shift(1).rolling(3).mean())
    df["ncf_roll6"] = g["net_cash_flow"].transform(lambda s: s.shift(1).rolling(6).mean())
    df["ncf_vol6"] = g["net_cash_flow"].transform(lambda s: s.shift(1).rolling(6).std())
    df["upi_roll3"] = g["upi_inflow"].transform(lambda s: s.shift(1).rolling(3).mean())
    df["upi_trend"] = g["upi_inflow"].transform(lambda s: s.shift(1).pct_change(3))
    df["rain_lag1"] = g["rainfall_dev"].shift(1)
    df["price_chg3"] = g["mandi_price_idx"].transform(lambda s: s.shift(1).pct_change(3))
    df["missed_roll6"] = g["shg_deposit_missed"].transform(lambda s: s.shift(1).rolling(6).sum())
    df["fatigue_l1"] = g["fatigue"].shift(1)
    df["moy"] = df.month.dt.month
    df["moy_sin"] = np.sin(2 * np.pi * df.moy / 12)
    df["moy_cos"] = np.cos(2 * np.pi * df.moy / 12)
    df = pd.get_dummies(df, columns=["etype"], prefix="t")

    FEATS = [c for c in df.columns if c.startswith(("ncf_", "upi_", "rain_", "price_",
             "missed_", "fatigue_", "moy_", "t_"))] + ["loan_emi", "upi_counterparties"]

    TRAIN_END = 35

    # ---------- per-horizon quantile models ----------
    models = {}
    for h in range(1, 7):
        dft = df.copy()
        dft["y"] = dft.groupby("ent_id")["net_cash_flow"].shift(-h)
        tr = dft[(dft.m_idx <= TRAIN_END - h)].dropna(subset=FEATS + ["y"])
        for q, alpha in (("p10", .10), ("p50", .50), ("p90", .90)):
            m = GradientBoostingRegressor(loss="quantile", alpha=alpha,
                                          n_estimators=150, max_depth=3,
                                          learning_rate=0.07, random_state=0)
            m.fit(tr[FEATS], tr["y"])
            models[(h, q)] = m

    # ---------- forecast months 36..41 ----------
    anchor = df[df.m_idx == TRAIN_END].dropna(subset=FEATS).set_index("ent_id")
    fc = []
    for h in range(1, 7):
        p10 = models[(h, "p10")].predict(anchor[FEATS])
        p50 = models[(h, "p50")].predict(anchor[FEATS])
        p90 = models[(h, "p90")].predict(anchor[FEATS])
        sd = np.maximum((p90 - p10) / 2.563, 1e3)
        p_def = norm.cdf(0, loc=p50, scale=sd)
        for i, ent in enumerate(anchor.index):
            fc.append(dict(ent_id=ent, h=h, m_idx=TRAIN_END + h,
                           p10=p10[i], p50=p50[i], p90=p90[i], p_deficit=p_def[i]))
    fc = pd.DataFrame(fc)

    # ---------- holdout KPIs ----------
    actual = df[df.m_idx > TRAIN_END][["ent_id", "m_idx", "net_cash_flow"]]
    ev = fc.merge(actual, on=["ent_id", "m_idx"])
    mae = (ev.p50 - ev.net_cash_flow).abs().mean()
    naive = df[df.m_idx == TRAIN_END].set_index("ent_id")["ncf_roll6"]
    ev["naive"] = ev.ent_id.map(naive)
    mae_naive = (ev.naive - ev.net_cash_flow).abs().mean()
    cover = ((ev.net_cash_flow >= ev.p10) & (ev.net_cash_flow <= ev.p90)).mean()
    ev["flag"] = ev.p_deficit > 0.6
    ev["is_def"] = ev.net_cash_flow < 0
    tp = (ev.flag & ev.is_def).sum()
    fp = (ev.flag & ~ev.is_def).sum()
    fn = (~ev.flag & ev.is_def).sum()
    prec, rec = tp / (tp + fp), tp / (tp + fn)
    print(f"MAE Rs{mae:,.0f} vs naive Rs{mae_naive:,.0f} | coverage {cover:.0%} | "
          f"precision {prec:.0%} recall {rec:.0%}")

    # ---------- drivers & flags ----------
    def drivers(row_anchor, moy):
        out = []
        if row_anchor["rain_lag1"] < -15: out.append("rainfall deficit last month")
        if row_anchor["price_chg3"] < -0.05: out.append("mandi price falling")
        if row_anchor["upi_trend"] < -0.15: out.append("UPI inflows declining")
        if row_anchor["missed_roll6"] >= 2: out.append("missed SHG deposits")
        if row_anchor["fatigue_l1"] > 1.5: out.append("repeated recent deficits")
        if moy in (6, 7, 8): out.append("monsoon input-cost season")
        return "; ".join(out) if out else "seasonal pattern"

    meta = df[df.m_idx == TRAIN_END].set_index("ent_id")
    etype_cols = [c for c in df.columns if c.startswith("t_")]
    meta["etype"] = meta[etype_cols].idxmax(axis=1).str[2:]
    fc["month"] = fc.m_idx.map(dict(zip(df.m_idx, df.month)))
    fc["etype"] = fc.ent_id.map(meta["etype"])
    fc["drivers"] = [drivers(meta.loc[e], pd.Timestamp(m).month)
                     for e, m in zip(fc.ent_id, fc.month)]

    flags = fc[fc.p_deficit > 0.6].copy()
    flags["action"] = np.where(flags.p_deficit > 0.8,
        "Field visit within 2 weeks; assess restructuring / top-up need",
        "Watch-list; verify via next SHG meeting")
    flags["tier"] = np.where(flags.p_deficit > 0.8, "field_visit", "watch")
    flags = flags.sort_values("p_deficit", ascending=False)

    # ---------- JSON export ----------
    os.makedirs(OUT, exist_ok=True)
    fmt_m = lambda ts: pd.Timestamp(ts).strftime("%b %Y")

    dist_of = lambda e: DISTRICTS[(e - 1) % len(DISTRICTS)]

    json.dump({
        "mae": round(mae), "mae_naive": round(mae_naive),
        "mae_improvement_pct": round((1 - mae / mae_naive) * 100),
        "coverage": round(float(cover), 2),
        "precision": round(float(prec), 2), "recall": round(float(rec), 2),
        "n_enterprises": int(fc.ent_id.nunique()),
        "n_flagged": int(flags.ent_id.nunique()),
        "n_flags": len(flags),
        "cohorts": fc.drop_duplicates("ent_id").etype.value_counts().to_dict(),
    }, open(f"{OUT}/kpis.json", "w"))

    max_risk = fc.groupby("ent_id").p_deficit.max()
    first_flag = flags.sort_values("h").groupby("ent_id").first()
    ents = []
    for e in sorted(fc.ent_id.unique()):
        d, st = dist_of(e)
        ents.append(dict(
            id=int(e), etype=meta.loc[e, "etype"], district=d, state=st,
            max_p_deficit=round(float(max_risk[e]), 3),
            flag_month=fmt_m(first_flag.loc[e, "month"]) if e in first_flag.index else None,
        ))
    ents.sort(key=lambda r: -r["max_p_deficit"])
    json.dump(ents, open(f"{OUT}/enterprises.json", "w"))

    json.dump([dict(
        ent_id=int(r.ent_id), etype=r.etype, district=dist_of(int(r.ent_id))[0],
        month=fmt_m(r.month), p50=round(r.p50), p_deficit=round(float(r.p_deficit), 3),
        drivers=r.drivers, action=r.action, tier=r.tier,
    ) for r in flags.itertuples()], open(f"{OUT}/flags.json", "w"))

    cal_months = [fmt_m(fc[fc.h == h].month.iloc[0]) for h in range(1, 7)]
    cal = {"months": cal_months, "rows": []}
    for e in max_risk.sort_values(ascending=False).index:
        row = fc[fc.ent_id == e].sort_values("h")
        cal["rows"].append(dict(id=int(e), etype=meta.loc[e, "etype"],
                                district=dist_of(int(e))[0],
                                p=[round(float(v), 3) for v in row.p_deficit]))
    json.dump(cal, open(f"{OUT}/calendar.json", "w"))

    # per-enterprise detail: 24m history + signals + forecast
    details = {}
    hist_df = df[df.m_idx >= MONTHS - 24 - 6]
    for e in fc.ent_id.unique():
        h_e = hist_df[(hist_df.ent_id == e) & (hist_df.m_idx <= TRAIN_END)]
        f_e = fc[fc.ent_id == e].sort_values("h")
        fl_e = flags[flags.ent_id == e].sort_values("h")
        details[str(int(e))] = dict(
            etype=meta.loc[e, "etype"], district=dist_of(int(e))[0],
            state=dist_of(int(e))[1],
            history=[dict(month=fmt_m(r.month), ncf=int(r.net_cash_flow),
                          upi=int(r.upi_inflow), rain=float(r.rainfall_dev),
                          mandi=float(r.mandi_price_idx),
                          shg_missed=int(r.shg_deposit_missed))
                     for r in h_e.itertuples()],
            forecast=[dict(month=fmt_m(r.month), p10=round(r.p10), p50=round(r.p50),
                           p90=round(r.p90), p_deficit=round(float(r.p_deficit), 3))
                      for r in f_e.itertuples()],
            drivers=fl_e.drivers.iloc[0] if len(fl_e) else "seasonal pattern",
            action=fl_e.action.iloc[0] if len(fl_e) else "No action needed; routine monitoring",
            flag_month=fmt_m(fl_e.month.iloc[0]) if len(fl_e) else None,
            max_p_deficit=round(float(max_risk[e]), 3),
        )
    json.dump(details, open(f"{OUT}/details.json", "w"))

    # state-level stress index (mean of enterprise max P(deficit) per state)
    stress = {}
    for e in fc.ent_id.unique():
        st = dist_of(int(e))[1]
        stress.setdefault(st, []).append(float(max_risk[e]))
    json.dump([dict(state=s, stress=round(float(np.mean(v)), 3), n=len(v))
               for s, v in sorted(stress.items(), key=lambda kv: -np.mean(kv[1]))],
              open(f"{OUT}/stress.json", "w"))

    hero = flags[flags.etype == "kharif_farmer"].iloc[0]
    print(f"hero enterprise: E{int(hero.ent_id)} p_deficit {hero.p_deficit:.0%}")
    print(f"exported JSON -> {os.path.abspath(OUT)}")


if __name__ == "__main__":
    run()
