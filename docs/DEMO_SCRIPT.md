# RISKON — 3-minute demo video script

Record at 1920×1080, browser full-screen at `http://localhost:5173`.
Refresh the page before recording so all data is cached (no loading skeletons on camera).

| Time | Shot | Say |
|------|------|-----|
| 0:00–0:20 | **Overview page** (landing). Slowly move cursor across the 4 KPI cards. | "RISKON forecasts monthly cash flow for rural micro enterprises 1–6 months ahead. On a 6-month holdout it hits an MAE of ₹3,393 — 43% better than a naive baseline — and its deficit flags run at 88% precision, 79% recall across 180 enterprises." |
| 0:20–0:40 | Hover the **state stress index** bars, then the cohort donut. | "Three cohorts — kharif farmers, dairy SHG members, kirana traders — mapped to real drought-prone districts. The stress index aggregates deficit risk by state, so an RRB sees where its portfolio will hurt before it does." |
| 0:40–1:00 | Click **Watch-list** tab. Scroll slowly. Point at the P(deficit) badges and the drivers column. | "Every forecast is probabilistic — P10 to P90 bands — so we get a calibrated probability of deficit per future month. Above 80% is a field-visit tier; 60–80% is watch-tier. Each flag ships with plain-language drivers, not a black-box score." |
| 1:00–1:10 | Use the **tier filter** → "Field visit", then cohort filter → "Kharif farmer". | "Filters let a district coordinator cut the list to this fortnight's visits." |
| 1:10–2:10 | **Click the top row (E3)** — the money shot. Trace the history line, then the shaded band diving below zero. Point at the ⚑ FLAG marker, then the driver card. | "Enterprise 3, a kharif farmer in Bundelkhand. Two years of actual cash flow — you can see the post-harvest spikes. The forecast band collapses below zero in January: near-certain deficit, flagged 2–3 months in advance. And the *why* is right here…" |
| 2:10–2:30 | Point at the **four sparklines** one by one. | "…in the raw signals: UPI inflows sliding, rainfall deficit, mandi prices flat, missed SHG deposits. The recommended action — a field visit within two weeks to assess restructuring — goes straight to the field officer." |
| 2:30–2:50 | Click **Liquidity calendar** tab. Sweep cursor across a red band of months. Switch cohort filter once. | "Zooming back out: the liquidity calendar shows every enterprise × month as a probability heatmap. Lenders stop reacting to defaults and start scheduling interventions around the lean season." |
| 2:50–3:00 | Click any red row → back on a detail page. End on the fan chart. | "From portfolio to enterprise in one click. RISKON: early warning, explained, actionable. Built on calibrated synthetic data for Round 2 — the pipeline is signal-agnostic and ready for real UPI, AGMARKNET and SHG feeds." |

## Tips
- The hero enterprise **E3** is always the top row of the watch-list (100% P(deficit), Jan 2026 flag).
- Persistent footer already discloses the synthetic-data caveat — no need to over-explain.
- All transitions are instant client-side routing; no loading stutter.
