"""GRAMEEN-CASH prototype — cash-flow forecaster + early-warning layer.

Pipeline:
  1. Feature engineering: lags, rolling stats, seasonality, external signals
     (mandi price, rainfall deviation), fatigue/recovery states.
  2. Per-horizon gradient-boosted quantile models (h = 1..6 months) giving
     P10 / P50 / P90 net-cash-flow bands  -> probabilistic, not point.
  3. Risk flags: P(deficit) per future month + plain-language driver text.
  4. Outputs: liquidity calendar heatmap, sample enterprise fan chart,
     flag table for field officers.
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

OUT = "/home/claude/nabard"
df = pd.read_csv(f"{OUT}/outputs/panel.csv", parse_dates=["month"])
df = df.sort_values(["ent_id", "m_idx"]).reset_index(drop=True)

# ---------- 1. features ----------
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

TRAIN_END = 35  # months 0-35 train, 36-41 holdout
train = df[df.m_idx <= TRAIN_END].dropna(subset=FEATS)

# ---------- 2. per-horizon quantile models ----------
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

# ---------- 3. forecast from anchor month 35 for months 36..41 ----------
anchor = df[df.m_idx == TRAIN_END].dropna(subset=FEATS).set_index("ent_id")
fc = []
for h in range(1, 7):
    p10 = models[(h, "p10")].predict(anchor[FEATS])
    p50 = models[(h, "p50")].predict(anchor[FEATS])
    p90 = models[(h, "p90")].predict(anchor[FEATS])
    # P(deficit): normal approx from quantile band
    sd = np.maximum((p90 - p10) / 2.563, 1e3)
    from scipy.stats import norm
    p_def = norm.cdf(0, loc=p50, scale=sd)
    for i, ent in enumerate(anchor.index):
        fc.append(dict(ent_id=ent, h=h, m_idx=TRAIN_END + h,
                       p10=p10[i], p50=p50[i], p90=p90[i], p_deficit=p_def[i]))
fc = pd.DataFrame(fc)

# holdout accuracy
actual = df[df.m_idx > TRAIN_END][["ent_id", "m_idx", "net_cash_flow"]]
ev = fc.merge(actual, on=["ent_id", "m_idx"])
mae = (ev.p50 - ev.net_cash_flow).abs().mean()
naive = df[df.m_idx == TRAIN_END].set_index("ent_id")["ncf_roll6"]
ev["naive"] = ev.ent_id.map(naive)
mae_naive = (ev.naive - ev.net_cash_flow).abs().mean()
cover = ((ev.net_cash_flow >= ev.p10) & (ev.net_cash_flow <= ev.p90)).mean()
# deficit-flag skill
ev["flag"] = ev.p_deficit > 0.6
ev["is_def"] = ev.net_cash_flow < 0
tp = (ev.flag & ev.is_def).sum(); fp = (ev.flag & ~ev.is_def).sum()
fn = (~ev.flag & ev.is_def).sum()
prec = tp / (tp + fp); rec = tp / (tp + fn)
print(f"MAE model Rs{mae:,.0f} vs naive Rs{mae_naive:,.0f} "
      f"({(1-mae/mae_naive)*100:.0f}% better) | P10-P90 coverage {cover:.0%} | "
      f"deficit flags precision {prec:.0%} recall {rec:.0%}")

# ---------- 4. plain-language drivers ----------
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
flags = fc[fc.p_deficit > 0.6].copy()
flags["etype"] = flags.ent_id.map(meta["etype"])
flags["drivers"] = [
    drivers(meta.loc[e], pd.Timestamp(m).month)
    for e, m in zip(flags.ent_id, flags.month)]
flags["action"] = np.where(flags.p_deficit > 0.8,
    "Field visit within 2 weeks; assess restructuring / top-up need",
    "Watch-list; verify via next SHG meeting")
flag_out = flags[["ent_id", "etype", "month", "p50", "p_deficit",
                  "drivers", "action"]].sort_values("p_deficit", ascending=False)
flag_out.to_csv(f"{OUT}/outputs/risk_flags.csv", index=False)
print(f"{len(flag_out)} enterprise-month flags written; "
      f"{flag_out.ent_id.nunique()} enterprises flagged of {fc.ent_id.nunique()}")

# ---------- 5. figures ----------
plt.rcParams.update({"font.size": 9, "figure.dpi": 140})

# 5a. liquidity calendar heatmap (30 sample enterprises x 6 months)
sample = (flags.groupby("ent_id").p_deficit.max().sort_values(ascending=False)
          .head(18).index.tolist())
sample += [e for e in fc.ent_id.unique() if e not in sample][:12]
mat = fc[fc.ent_id.isin(sample)].pivot(index="ent_id", columns="h", values="p_deficit")
mat = mat.loc[sample]
fig, ax = plt.subplots(figsize=(7.2, 6))
im = ax.imshow(mat.values, cmap="RdYlGn_r", vmin=0, vmax=1, aspect="auto")
mlabels = [pd.Timestamp(fc[fc.h == h].month.iloc[0]).strftime("%b %y") for h in range(1, 7)]
ax.set_xticks(range(6), mlabels)
ax.set_yticks(range(len(sample)),
              [f"E{e} ({meta.loc[e,'etype'][:5]})" for e in sample], fontsize=6.5)
ax.set_title("Liquidity Calendar — P(cash deficit) next 6 months\n"
             "green = comfortable, red = intervene early")
for (i, j), v in np.ndenumerate(mat.values):
    ax.text(j, i, f"{v:.0%}", ha="center", va="center", fontsize=5.5,
            color="white" if v > .65 or v < .2 else "black")
fig.colorbar(im, shrink=0.7, label="P(deficit)")
fig.tight_layout(); fig.savefig(f"{OUT}/figs/liquidity_calendar.png"); plt.close()

# 5b. fan chart for the riskiest enterprise
e = flag_out.ent_id.iloc[0]
hist = df[(df.ent_id == e) & (df.m_idx >= 18)]
f_e = fc[fc.ent_id == e].sort_values("h")
fig, ax = plt.subplots(figsize=(7.2, 3.6))
ax.plot(hist.month, hist.net_cash_flow, "-o", ms=3, color="#1f4e79", label="Actual net cash flow")
ax.plot(pd.to_datetime(f_e.month), f_e.p50, "--s", ms=4, color="#c0392b", label="Forecast (P50)")
ax.fill_between(pd.to_datetime(f_e.month), f_e.p10, f_e.p90, alpha=.2,
                color="#c0392b", label="P10–P90 band")
ax.axhline(0, color="k", lw=.8)
first_flag = f_e[f_e.p_deficit > .6].iloc[0]
ax.annotate(f"FLAG: {first_flag.p_deficit:.0%} deficit risk",
            xy=(pd.to_datetime(first_flag.month), first_flag.p50),
            xytext=(10, -30), textcoords="offset points", fontsize=8,
            color="#c0392b", arrowprops=dict(arrowstyle="->", color="#c0392b"))
ax.set_title(f"Enterprise E{e} ({meta.loc[e,'etype']}) — 6-month cash-flow forecast")
ax.legend(fontsize=7); ax.set_ylabel("Rs / month")
fig.tight_layout(); fig.savefig(f"{OUT}/figs/fan_chart.png"); plt.close()

# 5c. what actually drives the model (top features, h=2 P50)
imp = pd.Series(models[(2, "p50")].feature_importances_, index=FEATS).nlargest(10)
fig, ax = plt.subplots(figsize=(7.2, 3.2))
imp.iloc[::-1].plot.barh(ax=ax, color="#1f4e79")
ax.set_title("Top drivers of 2-month-ahead forecast (feature importance)")
fig.tight_layout(); fig.savefig(f"{OUT}/figs/feature_importance.png"); plt.close()
print("figures written")
