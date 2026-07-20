"""GRAMEEN-CASH prototype — synthetic rural microenterprise panel.

Generates monthly cash-flow panels for three enterprise archetypes,
anchored to realistic Indian rural seasonality:
  - kharif_farmer : income spike post-harvest (Oct-Nov), input costs Jun-Jul
  - dairy_shg     : steady income, fodder cost spike in monsoon, flush season Dec-Feb
  - kirana_trader : festival demand spikes (Oct-Nov Diwali, Apr wedding season)

Signals emitted per enterprise-month:
  upi_inflow, upi_txn_count, upi_counterparties  (digital payment proxies)
  cash_sales_est                                  (voice-diary style estimate)
  input_cost, loan_emi, hh_expense
  mandi_price_idx                                 (AGMARKNET-style commodity index)
  rainfall_dev                                    (IMD-style rainfall deviation %)
  shg_deposit_missed                              (0/1 group discipline signal)
  net_cash_flow                                   (target)
"""
import numpy as np
import pandas as pd

rng = np.random.default_rng(42)

N_PER_TYPE = 60
MONTHS = 42  # 36 train + 6 holdout
START = pd.Timestamp("2023-01-01")

# month-of-year seasonal profiles (multiplier on base income)
SEASON = {
    "kharif_farmer": np.array([0.5,0.5,0.6,0.7,0.6,0.4,0.4,0.5,0.8,1.8,2.2,1.0]),
    "dairy_shg":     np.array([1.2,1.3,1.1,1.0,0.9,0.8,0.7,0.7,0.8,1.0,1.1,1.3]),
    "kirana_trader": np.array([0.9,0.8,1.0,1.3,1.1,0.9,0.9,1.0,1.1,1.5,1.6,1.0]),
}
COST_SEASON = {
    "kharif_farmer": np.array([0.6,0.6,0.7,0.8,0.9,1.8,1.9,1.2,0.9,0.7,0.6,0.6]),
    "dairy_shg":     np.array([0.9,0.9,1.0,1.0,1.1,1.4,1.6,1.5,1.2,1.0,0.9,0.9]),
    "kirana_trader": np.array([1.0,0.9,1.0,1.2,1.0,0.9,0.9,1.0,1.2,1.5,1.4,0.9]),
}
BASE_INCOME = {"kharif_farmer": 18000, "dairy_shg": 14000, "kirana_trader": 26000}
DIGITAL_SHARE = {"kharif_farmer": 0.25, "dairy_shg": 0.45, "kirana_trader": 0.65}

def simulate():
    rows = []
    ent_id = 0
    for etype in SEASON:
        for _ in range(N_PER_TYPE):
            ent_id += 1
            base = BASE_INCOME[etype] * rng.lognormal(0, 0.25)
            emi = base * rng.uniform(0.10, 0.30)
            dig = np.clip(DIGITAL_SHARE[etype] + rng.normal(0, 0.12), 0.05, 0.9)
            # enterprise-level persistent quality (management skill)
            skill = rng.normal(0, 0.10)
            # rainfall regime for this enterprise's district
            district_rain = rng.normal(0, 12, MONTHS)
            # one drought episode for ~30% of agri-linked enterprises
            drought = np.zeros(MONTHS)
            if etype != "kirana_trader" and rng.random() < 0.30:
                d0 = rng.integers(12, 30)
                drought[d0:d0+4] = -rng.uniform(20, 45)
            # mandi price index (random walk with seasonal harvest dip)
            price = 100 + np.cumsum(rng.normal(0.2, 2.0, MONTHS))
            fatigue = 0.0
            for m in range(MONTHS):
                date = START + pd.DateOffset(months=m)
                moy = date.month - 1
                rain_dev = district_rain[m] + drought[m]
                # rainfall shock hits agri income with a 1-2 month lag
                lag_rain = district_rain[max(0, m-1)] + drought[max(0, m-1)]
                rain_mult = 1.0
                if etype != "kirana_trader":
                    rain_mult = 1.0 + 0.008 * np.clip(lag_rain, -50, 15)
                price_mult = price[m] / 100 if etype == "kharif_farmer" else 1.0
                income = (base * SEASON[etype][moy] * rain_mult * price_mult
                          * (1 + skill) * rng.lognormal(0, 0.15))
                cost = (base * 0.55 * COST_SEASON[etype][moy]
                        * rng.lognormal(0, 0.12))
                hh = base * 0.30 * rng.lognormal(0, 0.08)
                net = income - cost - hh - emi
                # fatigue state: consecutive deficits compound (late fees, borrowing)
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

if __name__ == "__main__":
    df = simulate()
    df.to_csv("/home/claude/nabard/outputs/panel.csv", index=False)
    print(df.shape, df.etype.value_counts().to_dict())
    print(df.groupby([df.month.dt.month])["net_cash_flow"].mean().round(0).to_dict())
