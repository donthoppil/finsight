"""
Finsight math service — yfinance proxy.

Run:
    cd apps/math-service
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Endpoints:
    POST /prices    body: { "symbols": ["AAPL","MSFT"] }
    POST /history   body: { "symbol": "AAPL", "period": "1mo" }
    GET  /health
"""

import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import numpy as np
import yfinance as yf
from cachetools import TTLCache
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Finsight math service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 5-minute cache to avoid hammering Yahoo on rapid-fire requests.
price_cache: TTLCache = TTLCache(maxsize=200, ttl=300)


class PriceRequest(BaseModel):
    symbols: List[str]


def _classify_asset(symbol: str, info: dict) -> str:
    """Heuristic asset-class tagging."""
    quote_type = info.get("quoteType", "EQUITY")
    if quote_type != "ETF":
        return "equity"

    long_name = (info.get("longName") or "").lower()
    bond_set = {"BND", "AGG", "TLT", "IEF", "SHY", "TIP", "LQD", "HYG"}
    gold_set = {"GLD", "IAU", "GDX", "SGOL"}
    if symbol in bond_set or "bond" in long_name or "treasury" in long_name:
        return "bond"
    if symbol in gold_set or "gold" in long_name:
        return "gold"
    return "etf"


@app.post("/prices")
def get_prices(req: PriceRequest):
    cache_key = ",".join(sorted(req.symbols))
    if cache_key in price_cache:
        return price_cache[cache_key]

    if not req.symbols:
        return []

    tickers = yf.Tickers(" ".join(req.symbols))
    result = []
    for sym in req.symbols:
        try:
            ticker = tickers.tickers[sym]
            info = ticker.info or {}
            hist = ticker.history(period="2d")
            if hist.empty:
                result.append({"symbol": sym, "price": None, "error": "no history"})
                continue

            current_raw = info.get("currentPrice") or info.get("regularMarketPrice")
            current = float(current_raw) if current_raw is not None else float(hist["Close"].iloc[-1])
            prev_close = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else current
            change_pct = ((current - prev_close) / prev_close * 100) if prev_close else 0.0

            result.append(
                {
                    "symbol": sym,
                    "name": info.get("shortName") or info.get("longName") or sym,
                    "price": round(current, 2),
                    "change_pct": round(change_pct, 2),
                    "asset_class": _classify_asset(sym, info),
                    "currency": info.get("currency", "USD"),
                }
            )
        except Exception as e:  # noqa: BLE001
            result.append({"symbol": sym, "price": None, "error": str(e)})

    price_cache[cache_key] = result
    return result


class HistoryRequest(BaseModel):
    symbol: str
    period: Optional[str] = "1mo"  # 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y


@app.post("/history")
def get_history(req: HistoryRequest):
    ticker = yf.Ticker(req.symbol)
    hist = ticker.history(period=req.period or "1mo")
    if hist.empty:
        return []
    return [
        {"date": str(d.date()), "close": round(float(c), 2)}
        for d, c in hist["Close"].items()
    ]


# ===========================================================
# Risk snapshot — Phase 2.6
# ===========================================================

# Tickers we treat as "diversified funds" rather than individual-stock concentration.
# A sector ETF (XLV, XLF, etc.) holds 30–80 companies inside it — still concentrated
# at the *sector* level, but absolutely not "one company" risk like NVDA or AAPL.
DIVERSIFIED_FUNDS = {
    # Total market
    "VTI", "VTSAX", "ITOT", "SCHB",
    # S&P 500
    "VOO", "SPY", "IVV", "VFIAX", "FXAIX",
    # Nasdaq
    "QQQ", "QQQM", "ONEQ",
    # Other broad indices
    "DIA", "IWM", "VTV", "VUG", "VEA", "VXUS", "VWO",
    # Dividend ETFs
    "SCHD", "VYM", "DVY", "HDV", "NOBL",
    # Sector SPDRs — each holds 30+ companies in one sector
    "XLV", "XLF", "XLK", "XLE", "XLP", "XLU", "XLY", "XLB", "XLI", "XLC", "XLRE",
    # Other common sector / thematic ETFs
    "VHT", "VFH", "VGT", "VDE", "VDC", "VPU", "VCR", "VAW", "VIS", "VOX", "VNQ",
    # Factor / smart-beta
    "MTUM", "USMV", "QUAL", "VLUE",
    # Bond ETFs (still diversifying even if nominally outside our scope)
    "BND", "AGG", "IEF", "TLT", "SHY", "TIP", "LQD", "HYG", "BSV", "VBIRX", "VBTLX",
    # Gold (diversifier)
    "GLD", "IAU", "SGOL",
}


class HoldingIn(BaseModel):
    symbol: str
    shares: float


class RiskRequest(BaseModel):
    holdings: List[HoldingIn]
    risk_feel: Optional[str] = None  # 'fine' | 'nervous' | 'panic' | 'sell'


def _empty_snapshot():
    return {
        "overall_score": 0,
        "overall_label": "empty",
        "components": None,
        "concentration_alert": None,
        "estimates": {"bad_month_loss": 0, "crash_loss": 0},
        "mismatch": None,
        "portfolio_value": 0,
    }


@app.post("/risk-snapshot")
def risk_snapshot(req: RiskRequest):
    """Compute a comprehensive risk snapshot for the portfolio."""
    if not req.holdings:
        return _empty_snapshot()

    symbols = [h.symbol for h in req.holdings]
    tickers = yf.Tickers(" ".join(symbols))

    holdings_data = []
    portfolio_value = 0.0

    for h in req.holdings:
        try:
            ticker = tickers.tickers[h.symbol]
            info = ticker.info or {}

            hist = ticker.history(period="1y")
            current_raw = info.get("currentPrice") or info.get("regularMarketPrice")
            if current_raw is not None:
                current_price = float(current_raw)
            elif not hist.empty:
                current_price = float(hist["Close"].iloc[-1])
            else:
                current_price = 0.0

            value = h.shares * current_price
            portfolio_value += value

            # Annualized volatility from 1-year daily returns
            if not hist.empty and len(hist) > 5:
                daily_returns = hist["Close"].pct_change().dropna()
                vol_annualized = float(daily_returns.std() * np.sqrt(252)) if len(daily_returns) > 1 else 0.20
            else:
                vol_annualized = 0.20

            # Max drawdown — try 3y, fall back to 1y, fall back to a market-average assumption
            try:
                hist_3y = ticker.history(period="3y")
                if not hist_3y.empty:
                    peaks = hist_3y["Close"].cummax()
                    drawdowns = (hist_3y["Close"] - peaks) / peaks
                    max_dd = float(abs(drawdowns.min()))
                elif not hist.empty:
                    peaks = hist["Close"].cummax()
                    drawdowns = (hist["Close"] - peaks) / peaks
                    max_dd = float(abs(drawdowns.min()))
                else:
                    max_dd = 0.30
            except Exception:
                max_dd = 0.30

            holdings_data.append(
                {
                    "symbol": h.symbol,
                    "shares": h.shares,
                    "price": current_price,
                    "value": value,
                    "volatility": vol_annualized,
                    "max_drawdown": max_dd,
                }
            )
        except Exception:  # noqa: BLE001
            holdings_data.append(
                {
                    "symbol": h.symbol,
                    "shares": h.shares,
                    "price": 0.0,
                    "value": 0.0,
                    "volatility": 0.20,
                    "max_drawdown": 0.30,
                }
            )

    if portfolio_value <= 0:
        return {**_empty_snapshot(), "error": "Could not fetch live prices for any holdings"}

    # ---------- Component 1: concentration ----------
    holdings_data.sort(key=lambda h: -h["value"])
    top_holding = holdings_data[0]
    top_holding_pct = (top_holding["value"] / portfolio_value) * 100
    top_3_pct = sum(h["value"] for h in holdings_data[:3]) / portfolio_value * 100

    if top_holding_pct >= 50:
        concentration_score, concentration_label = 95, "very high"
    elif top_holding_pct >= 35:
        concentration_score, concentration_label = 80, "high"
    elif top_holding_pct >= 25:
        concentration_score, concentration_label = 60, "elevated"
    elif top_holding_pct >= 15:
        concentration_score, concentration_label = 40, "moderate"
    else:
        concentration_score, concentration_label = 20, "low"

    concentration_alert = None
    if top_holding_pct >= 25:
        concentration_alert = {
            "symbol": top_holding["symbol"],
            "pct_of_portfolio": round(top_holding_pct, 1),
            "value": round(top_holding["value"], 2),
            "is_fund": top_holding["symbol"].upper() in DIVERSIFIED_FUNDS,
        }

    # ---------- Component 2: stock heaviness ----------
    individual_stock_value = sum(
        h["value"] for h in holdings_data if h["symbol"].upper() not in DIVERSIFIED_FUNDS
    )
    individual_stock_pct = (individual_stock_value / portfolio_value) * 100

    if individual_stock_pct >= 80:
        heaviness_score, heaviness_label = 90, "very heavy"
    elif individual_stock_pct >= 60:
        heaviness_score, heaviness_label = 70, "heavy"
    elif individual_stock_pct >= 40:
        heaviness_score, heaviness_label = 50, "moderate"
    elif individual_stock_pct >= 20:
        heaviness_score, heaviness_label = 30, "light"
    else:
        heaviness_score, heaviness_label = 15, "very light"

    # ---------- Component 3: volatility ----------
    weighted_vol = sum(
        h["volatility"] * (h["value"] / portfolio_value) for h in holdings_data
    )

    if weighted_vol >= 0.40:
        vol_score, vol_label = 95, "very high"
    elif weighted_vol >= 0.30:
        vol_score, vol_label = 80, "high"
    elif weighted_vol >= 0.20:
        vol_score, vol_label = 60, "moderate"
    elif weighted_vol >= 0.12:
        vol_score, vol_label = 40, "low"
    else:
        vol_score, vol_label = 20, "very low"

    # ---------- Overall score ----------
    overall_score = round(
        concentration_score * 0.40 + heaviness_score * 0.30 + vol_score * 0.30
    )

    if overall_score >= 80:
        overall_label = "stormy"
    elif overall_score >= 60:
        overall_label = "wobbly"
    elif overall_score >= 40:
        overall_label = "moderate"
    elif overall_score >= 20:
        overall_label = "steady"
    else:
        overall_label = "calm"

    # ---------- Dollar-loss estimates ----------
    monthly_vol = weighted_vol / np.sqrt(12)
    bad_month_loss = round(portfolio_value * monthly_vol * 1.645, 2)

    weighted_max_dd = sum(
        h["max_drawdown"] * (h["value"] / portfolio_value) for h in holdings_data
    )
    crash_loss = round(portfolio_value * weighted_max_dd, 2)

    # ---------- Mismatch detection ----------
    mismatch = None
    if req.risk_feel:
        risk_feel_max = {"fine": 95, "nervous": 60, "panic": 40, "sell": 20}
        max_acceptable = risk_feel_max.get(req.risk_feel, 95)
        if overall_score > max_acceptable:
            risk_feel_label_map = {
                "fine": "comfortable with market ups and downs",
                "nervous": "nervous if your portfolio dropped 20%",
                "panic": "panic if your portfolio dropped 20%",
                "sell": "want to sell if your portfolio dropped 20%",
            }
            mismatch = {
                "user_says": risk_feel_label_map.get(req.risk_feel, req.risk_feel),
                "portfolio_is": overall_label,
                "severity": "high" if (overall_score - max_acceptable) > 20 else "medium",
            }

    return {
        "overall_score": overall_score,
        "overall_label": overall_label,
        "components": {
            "concentration": {
                "score": concentration_score,
                "label": concentration_label,
                "top_holding": top_holding["symbol"],
                "top_holding_pct": round(top_holding_pct, 1),
                "top_3_pct": round(top_3_pct, 1),
            },
            "stock_heaviness": {
                "score": heaviness_score,
                "label": heaviness_label,
                "individual_stock_pct": round(individual_stock_pct, 1),
            },
            "volatility": {
                "score": vol_score,
                "label": vol_label,
                "annualized_vol_pct": round(weighted_vol * 100, 1),
            },
        },
        "concentration_alert": concentration_alert,
        "estimates": {"bad_month_loss": bad_month_loss, "crash_loss": crash_loss},
        "mismatch": mismatch,
        "portfolio_value": round(portfolio_value, 2),
    }


# ===========================================================
# Recommendations — Phase 2.8
# ===========================================================

WHITELIST_PATH = Path(__file__).parent / "data" / "fund_whitelist.json"
with open(WHITELIST_PATH) as _f:
    FUND_WHITELIST = json.load(_f)

fund_metrics_cache: TTLCache = TTLCache(maxsize=50, ttl=3600)

# Reasonable defaults for whitelisted funds (publicly known expense ratios as of 2026).
_DEFAULT_EXPENSE_RATIO = {
    "BSV": 0.0004,
    "VBIRX": 0.0007,
    "BND": 0.0003,
    "VBTLX": 0.0005,
    "VTI": 0.0003,
    "VTSAX": 0.0004,
    "QQQ": 0.002,
    "VFIAX": 0.0004,
}


def pick_slot(timeline_years: float) -> str:
    """Map user's goal timeline to the appropriate fund category."""
    if timeline_years < 2:
        return "short_term"
    if timeline_years <= 5:
        return "medium_term"
    if timeline_years <= 15:
        return "long_term"
    return "growth"


def get_fund_metrics(ticker: str) -> Optional[dict]:
    """Fetch live 3y metrics for a single fund. Cached for 1 hour."""
    if ticker in fund_metrics_cache:
        return fund_metrics_cache[ticker]

    try:
        t = yf.Ticker(ticker)
        hist = t.history(period="3y")
        if hist.empty or len(hist) < 30:
            return None

        daily_returns = hist["Close"].pct_change().dropna()
        vol = float(daily_returns.std() * np.sqrt(252)) if len(daily_returns) > 1 else 0.20

        peaks = hist["Close"].cummax()
        drawdown = (hist["Close"] - peaks) / peaks
        max_dd = float(abs(drawdown.min())) if len(drawdown) > 0 else 0.30

        if len(hist) >= 252:
            return_1y = float(hist["Close"].iloc[-1] / hist["Close"].iloc[-252] - 1)
        else:
            return_1y = float(hist["Close"].iloc[-1] / hist["Close"].iloc[0] - 1)

        avg_dollar_volume = float((hist["Volume"] * hist["Close"]).mean())

        info = t.info or {}
        current_price_raw = info.get("currentPrice") or info.get("regularMarketPrice")
        if current_price_raw is not None:
            current_price = float(current_price_raw)
        else:
            current_price = float(hist["Close"].iloc[-1])

        expense_ratio = float(info.get("annualReportExpenseRatio") or 0)
        if expense_ratio == 0:
            expense_ratio = _DEFAULT_EXPENSE_RATIO.get(ticker, 0.001)

        metrics = {
            "ticker": ticker,
            "current_price": round(current_price, 2),
            "expense_ratio": expense_ratio,
            "volatility": vol,
            "max_drawdown": max_dd,
            "return_1y": return_1y,
            "avg_dollar_volume": avg_dollar_volume,
        }
        fund_metrics_cache[ticker] = metrics
        return metrics
    except Exception as e:  # noqa: BLE001
        print(f"[recommend] error fetching metrics for {ticker}: {e}")
        return None


def score_fund_for_user(metrics: dict, user_profile: dict) -> dict:
    vol = metrics["volatility"]
    if vol < 0.05:
        stability = 95
    elif vol < 0.10:
        stability = 80
    elif vol < 0.15:
        stability = 65
    elif vol < 0.25:
        stability = 45
    elif vol < 0.40:
        stability = 25
    else:
        stability = 10

    dd = metrics["max_drawdown"]
    if dd < 0.05:
        resilience = 95
    elif dd < 0.15:
        resilience = 75
    elif dd < 0.30:
        resilience = 55
    elif dd < 0.50:
        resilience = 30
    else:
        resilience = 10

    er = metrics["expense_ratio"]
    if er < 0.0005:
        cost = 100
    elif er < 0.001:
        cost = 90
    elif er < 0.005:
        cost = 75
    elif er < 0.01:
        cost = 55
    elif er < 0.02:
        cost = 35
    else:
        cost = 15

    vol_dollars = metrics["avg_dollar_volume"]
    if vol_dollars > 1e9:
        liquidity = 100
    elif vol_dollars > 1e8:
        liquidity = 80
    elif vol_dollars > 1e7:
        liquidity = 60
    elif vol_dollars > 1e6:
        liquidity = 40
    else:
        liquidity = 20

    timeline = user_profile.get("goal_timeline_years", 10)
    risk_feel = user_profile.get("risk_feel", "nervous")

    if timeline < 2:
        weights = {"stability": 0.40, "resilience": 0.35, "cost": 0.15, "liquidity": 0.10}
    elif risk_feel in ("panic", "sell"):
        weights = {"stability": 0.30, "resilience": 0.35, "cost": 0.20, "liquidity": 0.15}
    elif timeline > 15 and risk_feel == "fine":
        weights = {"stability": 0.15, "resilience": 0.20, "cost": 0.35, "liquidity": 0.30}
    else:
        weights = {"stability": 0.25, "resilience": 0.25, "cost": 0.30, "liquidity": 0.20}

    fit_score = (
        stability * weights["stability"]
        + resilience * weights["resilience"]
        + cost * weights["cost"]
        + liquidity * weights["liquidity"]
    )

    return {
        **metrics,
        "stability_score": int(stability),
        "resilience_score": int(resilience),
        "cost_score": int(cost),
        "liquidity_score": int(liquidity),
        "fit_score": round(fit_score, 1),
    }


def behavior_summary(metrics: dict) -> dict:
    vol = metrics["volatility"]
    if vol < 0.07:
        swings = "very small swings"
    elif vol < 0.15:
        swings = "small swings"
    elif vol < 0.25:
        swings = "moderate swings"
    elif vol < 0.40:
        swings = "big swings"
    else:
        swings = "very big swings"

    dd_pct = round(metrics["max_drawdown"] * 100)
    cost_per_10k_per_year = round(metrics["expense_ratio"] * 10000)

    return {
        "swings_label": swings,
        "swings_pct": round(vol * 100, 1),
        "worst_drop_label": f"−{dd_pct}%",
        "worst_drop_3y": dd_pct,
        "annual_cost_per_10k": cost_per_10k_per_year,
    }


class RecommendRequest(BaseModel):
    timeline_years: float
    risk_feel: str
    account_type: Optional[str] = None
    fund_preference: Optional[str] = None  # 'etf' | 'mutual_fund' | 'either'


@app.post("/recommend-funds")
def recommend_funds(req: RecommendRequest):
    """Return funds matched to the user's profile, sorted by fit score."""
    slot = pick_slot(req.timeline_years)
    candidates = list(FUND_WHITELIST[slot])

    if req.fund_preference == "etf":
        candidates = [c for c in candidates if c["type"] == "etf"]
    elif req.fund_preference == "mutual_fund":
        candidates = [c for c in candidates if c["type"] == "mutual_fund"]

    if not candidates:
        candidates = list(FUND_WHITELIST[slot])

    user_profile = {
        "goal_timeline_years": req.timeline_years,
        "risk_feel": req.risk_feel,
    }

    scored = []
    for fund_meta in candidates:
        metrics = get_fund_metrics(fund_meta["ticker"])
        if metrics is None:
            continue
        scored_metrics = score_fund_for_user(metrics, user_profile)
        scored.append(
            {
                **fund_meta,
                **scored_metrics,
                "behavior": behavior_summary(scored_metrics),
            }
        )

    scored.sort(key=lambda f: -f["fit_score"])

    return {
        "slot": slot,
        "user_timeline_years": req.timeline_years,
        "user_risk_feel": req.risk_feel,
        "options": scored[:3],
        "disclaimer": "Educational only. Past performance doesn't guarantee future returns. Multiple options shown — pick what fits you.",
    }


# ===========================================================
# Rebalance — Phase 2.9
# ===========================================================

sector_cache: TTLCache = TTLCache(maxsize=200, ttl=86400)  # 24h

# Manual mapping for known tickers — yfinance can be inconsistent.
KNOWN_SECTORS = {
    # Sector ETFs
    "XLV": "healthcare",
    "XLF": "financials",
    "XLP": "staples",
    "XLE": "energy",
    "XLU": "utilities",
    "VXUS": "international",
    # Diversified funds
    "VTI": "diversified",
    "VOO": "diversified",
    "SPY": "diversified",
    "VTSAX": "diversified",
    "VFIAX": "diversified",
    "FXAIX": "diversified",
    "DIA": "diversified",
    "IWM": "diversified",
    "ITOT": "diversified",
    "SCHB": "diversified",
    # Nasdaq is meaningfully tech-heavy
    "QQQ": "tech",
    "QQQM": "tech",
    # Bond funds
    "BND": "bonds",
    "BSV": "bonds",
    "AGG": "bonds",
    "VBTLX": "bonds",
    "VBIRX": "bonds",
    "TLT": "bonds",
    "IEF": "bonds",
    "SHY": "bonds",
    # Dividend funds — partly diversified, partly defensive; bucket as diversified for sizing
    "SCHD": "diversified",
    "VYM": "diversified",
    # Common stocks (best-effort)
    "AAPL": "tech",
    "MSFT": "tech",
    "NVDA": "tech",
    "GOOGL": "tech",
    "GOOG": "tech",
    "META": "tech",
    "AMZN": "tech",
    "TSLA": "tech",
    "JPM": "financials",
    "BAC": "financials",
    "WFC": "financials",
    "GS": "financials",
    "JNJ": "healthcare",
    "PFE": "healthcare",
    "UNH": "healthcare",
    "LLY": "healthcare",
    "WMT": "staples",
    "PG": "staples",
    "KO": "staples",
    "PEP": "staples",
    "XOM": "energy",
    "CVX": "energy",
    "NEE": "utilities",
    "DUK": "utilities",
    # Gold ETFs
    "GLD": "diversified",
    "IAU": "diversified",
}


def classify_sector(ticker: str) -> str:
    if ticker in sector_cache:
        return sector_cache[ticker]
    if ticker in KNOWN_SECTORS:
        sector_cache[ticker] = KNOWN_SECTORS[ticker]
        return KNOWN_SECTORS[ticker]
    try:
        info = yf.Ticker(ticker).info or {}
        sector = (info.get("sector") or "").lower()
        if "technology" in sector:
            result = "tech"
        elif "health" in sector:
            result = "healthcare"
        elif "financ" in sector:
            result = "financials"
        elif "consumer defensive" in sector:
            result = "staples"
        elif "consumer cyclical" in sector:
            result = "consumer_cyclical"
        elif "energy" in sector:
            result = "energy"
        elif "utilities" in sector:
            result = "utilities"
        elif "industrials" in sector:
            result = "industrials"
        elif "communication" in sector:
            result = "communication"
        elif "real estate" in sector:
            result = "real_estate"
        elif "basic materials" in sector:
            result = "materials"
        else:
            quote_type = info.get("quoteType", "")
            if quote_type == "ETF":
                result = "diversified"
            else:
                result = "unknown"
        sector_cache[ticker] = result
        return result
    except Exception:  # noqa: BLE001
        return "unknown"


def _format_sector(sector: str) -> str:
    return {
        "tech": "tech",
        "healthcare": "healthcare",
        "financials": "financials",
        "staples": "consumer staples",
        "energy": "energy",
        "utilities": "utilities",
        "international": "international stocks",
        "diversified": "broad-market funds",
        "bonds": "bonds",
        "consumer_cyclical": "consumer cyclical",
        "industrials": "industrials",
        "communication": "communication",
        "real_estate": "real estate",
        "materials": "materials",
    }.get(sector, sector)


def _generate_plan_summary(issues: list, phases: list) -> str:
    if not issues:
        return "Your portfolio looks balanced. No major rebalance needed right now."
    if len(phases) == 1:
        return phases[0]["title"]
    return f"{len(phases)} steps to spread your money sensibly."


def _compute_expected_after(holdings_data: list, phases: list, portfolio_value: float):
    """Estimate what the portfolio looks like after the plan executes."""
    new_total = portfolio_value
    new_sector_value: dict = {}
    for h in holdings_data:
        new_sector_value[h["sector"]] = new_sector_value.get(h["sector"], 0) + h["value"]
    for phase in phases:
        for item in phase.get("items", []):
            new_total += item["amount_usd"]
            new_sector_value[item["sector"]] = (
                new_sector_value.get(item["sector"], 0) + item["amount_usd"]
            )

    new_top_holding = holdings_data[0]
    new_concentration = round(new_top_holding["value"] / new_total * 100, 1)
    sectors_count_after = len(
        [s for s, v in new_sector_value.items() if v / new_total >= 0.05]
    )

    return {
        "new_portfolio_value": round(new_total, 2),
        "new_top_concentration_pct": new_concentration,
        "new_top_holding": new_top_holding["symbol"],
        "sectors_count_after": sectors_count_after,
        "estimated_risk_improvement": "from wobbly toward moderate",
    }


class RebalanceHolding(BaseModel):
    symbol: str
    shares: float


class RebalanceRequest(BaseModel):
    holdings: List[RebalanceHolding]
    timeline_years: float
    risk_feel: str
    monthly_contribution: float = 0


@app.post("/rebalance-suggest")
def rebalance_suggest(req: RebalanceRequest):
    if not req.holdings:
        return {
            "diagnosis": {"primary_issue": "empty_portfolio"},
            "plan_summary": "Your portfolio is empty. Start by adding what you own through the chat.",
            "phases": [],
        }

    symbols = [h.symbol for h in req.holdings]
    tickers = yf.Tickers(" ".join(symbols))

    holdings_data = []
    portfolio_value = 0.0
    sector_breakdown: dict = {}
    asset_class_breakdown = {"equity": 0.0, "bond": 0.0, "diversified_equity": 0.0}

    for h in req.holdings:
        try:
            ticker = tickers.tickers[h.symbol]
            info = ticker.info or {}
            current_raw = info.get("currentPrice") or info.get("regularMarketPrice")
            current_price = float(current_raw) if current_raw is not None else 0.0
            value = h.shares * current_price
            portfolio_value += value

            sector = classify_sector(h.symbol)
            sector_breakdown[sector] = sector_breakdown.get(sector, 0) + value

            if sector == "bonds":
                asset_class_breakdown["bond"] += value
            elif sector == "diversified":
                asset_class_breakdown["diversified_equity"] += value
            else:
                asset_class_breakdown["equity"] += value

            holdings_data.append(
                {
                    "symbol": h.symbol,
                    "shares": h.shares,
                    "price": current_price,
                    "value": value,
                    "sector": sector,
                    "name": info.get("shortName") or h.symbol,
                }
            )
        except Exception:  # noqa: BLE001
            continue

    if portfolio_value <= 0:
        return {"error": "Could not fetch portfolio prices"}

    sector_pct = {k: round(v / portfolio_value * 100, 1) for k, v in sector_breakdown.items()}
    asset_class_pct = {
        k: round(v / portfolio_value * 100, 1) for k, v in asset_class_breakdown.items()
    }

    holdings_data.sort(key=lambda h: -h["value"])
    top_holding = holdings_data[0]
    top_holding_pct = round(top_holding["value"] / portfolio_value * 100, 1)

    issues = []

    concentration_issue = None
    if top_holding_pct >= 25:
        concentration_issue = {
            "type": "concentration",
            "severity": "high" if top_holding_pct >= 50 else "medium",
            "holding": top_holding["symbol"],
            "current_pct": top_holding_pct,
            "target_pct": 25,
            "amount_to_balance": round(top_holding["value"] - portfolio_value * 0.25, 2),
        }
        issues.append(concentration_issue)

    sector_issue = None
    dominant_sector = max(sector_pct.items(), key=lambda x: x[1]) if sector_pct else None
    if (
        dominant_sector
        and dominant_sector[1] >= 60
        and dominant_sector[0] not in ("diversified", "bonds")
    ):
        sector_issue = {
            "type": "sector_concentration",
            "severity": "high" if dominant_sector[1] >= 80 else "medium",
            "sector": dominant_sector[0],
            "current_pct": dominant_sector[1],
        }
        issues.append(sector_issue)

    all_sectors = ["healthcare", "financials", "staples", "energy", "utilities", "international"]
    missing_sectors = [s for s in all_sectors if sector_pct.get(s, 0) < 5]

    asset_class_issue = None
    if req.timeline_years <= 5 and asset_class_pct.get("bond", 0) < 10:
        asset_class_issue = {
            "type": "missing_bonds",
            "severity": "high" if req.timeline_years <= 2 else "medium",
            "current_bond_pct": asset_class_pct.get("bond", 0),
            "recommended_bond_pct": 30 if req.timeline_years <= 2 else 20,
        }
        issues.append(asset_class_issue)

    phases = []
    monthly_budget = req.monthly_contribution if req.monthly_contribution > 0 else portfolio_value * 0.05

    # Phase 1 — concentration. Two flavors:
    #   - severity high (>=50%): trim some now, because new-money-flow alone would
    #     take literal years to fix it (e.g. 80% AAPL → 25% with $500/mo of new
    #     money is over a decade). Suggest a partial sell to a softer interim
    #     target (50%), then let new money handle the rest.
    #   - severity medium (25-50%): the original "stop buying more, let new money
    #     flow" approach works in a reasonable timeframe and avoids the tax hit.
    if concentration_issue:
        if concentration_issue["severity"] == "high":
            interim_target_pct = 50  # trim down to here, new money handles the rest
            top_price = top_holding.get("price") or 0
            trim_amount = max(
                0, round(top_holding["value"] - portfolio_value * (interim_target_pct / 100), 0)
            )
            trim_shares = round(trim_amount / top_price, 2) if top_price > 0 else 0
            phases.append(
                {
                    "id": "phase_1_trim",
                    "phase_number": 1,
                    "type": "trim_concentration",
                    "title": f"Trim some {top_holding['symbol']} to bring concentration down faster",
                    "explanation": (
                        f"{top_holding['symbol']} is {concentration_issue['current_pct']}% of your money. "
                        "New contributions alone would take years to get this to a healthy level, so a "
                        "partial sell now is the practical move. We're suggesting a softer interim "
                        f"target (~{interim_target_pct}%) — not a full exit — to soften the tax hit. "
                        "Reinvest the proceeds into the funds in the next phase."
                    ),
                    "current_state": f"{top_holding['symbol']}: {concentration_issue['current_pct']}%",
                    "target_state": (
                        f"{top_holding['symbol']}: ~{interim_target_pct}% after trim, "
                        "drifting toward ~25% over time"
                    ),
                    "items": [
                        {
                            "id": f"item_{top_holding['symbol']}_trim",
                            "ticker": top_holding["symbol"],
                            "name": top_holding.get("name") or top_holding["symbol"],
                            "sector": top_holding.get("sector") or "equity",
                            "description": (
                                f"Sell ~{trim_shares} shares of {top_holding['symbol']} (~${trim_amount:,.0f}) "
                                "to free up cash for the diversifying buys below."
                            ),
                            "amount_usd": trim_amount,
                            "current_price": top_price,
                            "estimated_shares": trim_shares,
                            "behavior": None,
                            "action": "trim",
                            "status": "pending",
                        }
                    ],
                    "expected_impact": (
                        f"After this trim, concentration drops from {concentration_issue['current_pct']}% "
                        f"to ~{interim_target_pct}%. Heads-up: selling at a profit triggers capital "
                        "gains tax — long-term gains (held > 1 year) are taxed at a lower rate."
                    ),
                }
            )
        else:
            phases.append(
                {
                    "id": "phase_1_concentration",
                    "phase_number": 1,
                    "type": "stop_buying_more",
                    "title": f"Reduce {concentration_issue['holding']} concentration",
                    "explanation": (
                        f"{concentration_issue['holding']} is {concentration_issue['current_pct']}% of "
                        "your money — too much in one company. Instead of selling (which has tax "
                        "implications), let new money flow to other holdings. Over time, your "
                        "concentration drops naturally."
                    ),
                    "current_state": f"{concentration_issue['holding']}: {concentration_issue['current_pct']}%",
                    "target_state": f"{concentration_issue['holding']}: ~25%",
                    "items": [],
                    "expected_impact": (
                        f"Concentration drops from {concentration_issue['current_pct']}% to ~25% "
                        "over 6–12 months as you add other positions."
                    ),
                }
            )

    # Phase 2 — sector diversity
    if sector_issue or missing_sectors:
        priority_sectors = ["healthcare", "financials", "international", "staples", "energy", "utilities"]
        sectors_to_add = [s for s in priority_sectors if s in missing_sectors][:3]

        if sectors_to_add:
            sector_funds = {f["sector"]: f for f in FUND_WHITELIST.get("sectors", [])}
            allocation_per_sector = round(max(monthly_budget * 3, 500), 0)

            items = []
            for s in sectors_to_add:
                fund = sector_funds.get(s)
                if not fund:
                    continue
                metrics = get_fund_metrics(fund["ticker"])
                price = metrics["current_price"] if metrics else 0
                items.append(
                    {
                        "id": f"item_{fund['ticker']}",
                        "ticker": fund["ticker"],
                        "name": fund["name"],
                        "sector": fund["sector"],
                        "description": fund["description"],
                        "amount_usd": allocation_per_sector,
                        "current_price": price,
                        "estimated_shares": round(allocation_per_sector / price, 2) if price else 0,
                        "behavior": behavior_summary(metrics) if metrics else None,
                        "status": "pending",
                    }
                )

            if items:
                dominant_label = (
                    _format_sector(dominant_sector[0]) if dominant_sector else "one area"
                )
                dominant_pct = dominant_sector[1] if dominant_sector else 0
                phases.append(
                    {
                        "id": "phase_2_sectors",
                        "phase_number": len(phases) + 1,
                        "type": "add_sector_diversity",
                        "title": "Add sectors you're missing",
                        "explanation": (
                            f"You're {dominant_pct}% in {dominant_label}. These funds add "
                            f"coverage in {', '.join([_format_sector(s) for s in sectors_to_add])} — "
                            "when one sector struggles, others can hold steady."
                        ),
                        "current_state": f"{dominant_label}: {dominant_pct}% / Other sectors: low",
                        "target_state": "Spread across 4+ sectors",
                        "items": items,
                        "expected_impact": "Your portfolio becomes less dependent on any single industry.",
                    }
                )

    # Phase 3 — bonds for short timelines
    if asset_class_issue:
        bond_slot = "short_term" if req.timeline_years <= 2 else "medium_term"
        bond_funds = FUND_WHITELIST.get(bond_slot, [])
        allocation = round(portfolio_value * 0.10, 0)

        items = []
        for fund in bond_funds[:1]:
            metrics = get_fund_metrics(fund["ticker"])
            price = metrics["current_price"] if metrics else 0
            items.append(
                {
                    "id": f"item_{fund['ticker']}",
                    "ticker": fund["ticker"],
                    "name": fund["name"],
                    "sector": "bonds",
                    "description": fund["description"],
                    "amount_usd": allocation,
                    "current_price": price,
                    "estimated_shares": round(allocation / price, 2) if price else 0,
                    "behavior": behavior_summary(metrics) if metrics else None,
                    "status": "pending",
                }
            )

        if items:
            phases.append(
                {
                    "id": "phase_3_bonds",
                    "phase_number": len(phases) + 1,
                    "type": "add_stability",
                    "title": f"Add stability for your {int(req.timeline_years)}-year goal",
                    "explanation": (
                        f"Stocks can drop 20% in a bad month. With your goal {int(req.timeline_years)} "
                        "years away, a drop right before you need the money would hurt. Bonds give up "
                        "some upside to protect against that."
                    ),
                    "current_state": f"Bonds: {asset_class_pct.get('bond', 0)}%",
                    "target_state": f"Bonds: ~{asset_class_issue['recommended_bond_pct']}%",
                    "items": items,
                    "expected_impact": (
                        "Your portfolio's worst-case loss shrinks. Less dramatic ups, but less "
                        "dramatic downs."
                    ),
                }
            )

    expected_after = _compute_expected_after(holdings_data, phases, portfolio_value)

    return {
        "diagnosis": {
            "issues": issues,
            "current_top_holding": {"symbol": top_holding["symbol"], "pct": top_holding_pct},
            "sector_breakdown": sector_pct,
            "asset_class_breakdown": asset_class_pct,
            "missing_sectors": missing_sectors,
        },
        "plan_summary": _generate_plan_summary(issues, phases),
        "phases": phases,
        "expected_after": expected_after,
        "disclaimer": (
            "Educational only. Past performance doesn't guarantee future returns. "
            "You execute trades in your own brokerage account."
        ),
    }


# ===========================================================
# What-If Scenarios — Phase 3
# Each endpoint takes the user's holdings + a scenario param,
# computes per-holding impact, and returns suggestions tied
# to the actual portfolio (no generic advice).
# ===========================================================


def _live_price(symbol: str) -> float:
    try:
        info = yf.Ticker(symbol).info or {}
        raw = info.get("currentPrice") or info.get("regularMarketPrice")
        return float(raw) if raw is not None else 0.0
    except Exception:
        return 0.0


def _portfolio_breakdown(holdings: List["ScenarioHolding"]):
    """Return holdings_data + portfolio_value + sector_breakdown."""
    holdings_data = []
    portfolio_value = 0.0
    sector_breakdown: dict = {}

    for h in holdings:
        try:
            price = _live_price(h.symbol)
            sector = classify_sector(h.symbol)
            value = h.shares * price
            portfolio_value += value
            sector_breakdown[sector] = sector_breakdown.get(sector, 0) + value
            holdings_data.append(
                {
                    "symbol": h.symbol,
                    "shares": h.shares,
                    "price": price,
                    "value": value,
                    "sector": sector,
                }
            )
        except Exception:
            continue
    return holdings_data, portfolio_value, sector_breakdown


class ScenarioHolding(BaseModel):
    symbol: str
    shares: float


# === SCENARIO 1: MARKET MOVES ===
class MarketMoveRequest(BaseModel):
    holdings: List[ScenarioHolding]
    timeline_years: float = 5
    risk_feel: str = "nervous"
    direction: str = "drops"  # 'drops' | 'rises'
    magnitude_pct: float = 20


@app.post("/scenario/market-moves")
def scenario_market_moves(req: MarketMoveRequest):
    holdings_data, portfolio_today, sector_breakdown = _portfolio_breakdown(req.holdings)

    if portfolio_today <= 0:
        return {"error": "empty_portfolio"}

    sign = -1 if req.direction == "drops" else 1
    equity_impact = sign * req.magnitude_pct / 100
    bond_impact = sign * req.magnitude_pct / 100 * 0.10
    diversified_impact = sign * req.magnitude_pct / 100 * 0.85

    portfolio_after = 0.0
    for h in holdings_data:
        if h["sector"] == "bonds":
            mult = 1 + bond_impact
        elif h["sector"] == "diversified":
            mult = 1 + diversified_impact
        else:
            mult = 1 + equity_impact
        h["value_after"] = round(h["value"] * mult, 2)
        h["change_pct"] = round((mult - 1) * 100, 2)
        portfolio_after += h["value_after"]

    change = portfolio_after - portfolio_today
    change_pct = (change / portfolio_today * 100) if portfolio_today else 0

    suggestions = []
    if req.direction == "drops":
        equity_holdings = [h for h in holdings_data if h["sector"] not in ("bonds", "diversified")]
        if equity_holdings and req.timeline_years <= 5:
            top_equity = max(equity_holdings, key=lambda h: h["value"])
            shift = round(top_equity["value"] * 0.20, 0)
            suggestions.append(
                {
                    "type": "shift",
                    "text": f"Move ~${shift:,.0f} from {top_equity['symbol']} into VOO or VTI before any drop",
                }
            )
        if req.timeline_years <= 5:
            buffer_amount = round(min(portfolio_today * 0.05, 12000), 0)
            suggestions.append(
                {
                    "type": "cash",
                    "text": f"Hold cash equal to 3 months of expenses — about ${buffer_amount:,.0f}",
                }
            )
        diversified = [h for h in holdings_data if h["sector"] == "diversified"]
        if diversified:
            suggestions.append(
                {
                    "type": "hold",
                    "text": f"Keep {diversified[0]['symbol']} as your long-term core holding",
                }
            )
        if not suggestions:
            suggestions.append(
                {
                    "type": "hold",
                    "text": "You're well-diversified — riding it out is reasonable.",
                }
            )
    else:
        suggestions.append(
            {
                "type": "hold",
                "text": "Markets rallying — resist FOMO. Stick to your plan.",
            }
        )
        # Find any holding > 25% of portfolio after the rise
        top = max(holdings_data, key=lambda h: h["value_after"])
        top_pct_after = top["value_after"] / portfolio_after * 100
        if top_pct_after > 25:
            trim = round(top["value_after"] * 0.10, 0)
            suggestions.append(
                {
                    "type": "trim",
                    "text": f"{top['symbol']} would be {top_pct_after:.0f}% — trim ~${trim:,.0f} to keep balance",
                }
            )

    rationale = (
        f"Based on a {req.magnitude_pct}% market {req.direction[:-1]}. "
        "Equity holdings absorb most of the move; bonds and broad-market funds buffer it."
    )
    return {
        "scenario_id": "market_moves",
        "params": {"direction": req.direction, "magnitude_pct": req.magnitude_pct},
        "portfolio_today": round(portfolio_today, 2),
        "portfolio_after": round(portfolio_after, 2),
        "change": round(change, 2),
        "change_pct": round(change_pct, 1),
        "holdings_breakdown": holdings_data,
        "suggestions": suggestions,
        "rationale": rationale,
        "confidence": "medium" if req.magnitude_pct > 30 else "high",
    }


# === SCENARIO 2: INFLATION ===
class InflationRequest(BaseModel):
    holdings: List[ScenarioHolding]
    timeline_years: float = 5
    risk_feel: str = "nervous"
    annual_inflation_pct: float = 5
    years: int = 3


@app.post("/scenario/inflation")
def scenario_inflation(req: InflationRequest):
    holdings_data, portfolio_today, sector_breakdown = _portfolio_breakdown(req.holdings)
    if portfolio_today <= 0:
        return {"error": "empty_portfolio"}

    annual_inflation = req.annual_inflation_pct / 100
    cumulative_inflation = (1 + annual_inflation) ** req.years - 1

    asset_returns = {
        "equity": 0.07,
        "diversified": 0.07,
        "bonds": 0.03,
        "tech": 0.06,
        "healthcare": 0.07,
        "financials": 0.09,
        "energy": 0.12,
        "staples": 0.07,
        "utilities": 0.05,
        "international": 0.06,
        "consumer_cyclical": 0.06,
        "industrials": 0.06,
    }

    portfolio_after_real = 0.0
    portfolio_after_nominal = 0.0
    for h in holdings_data:
        annual_return = asset_returns.get(h["sector"], 0.06)
        nominal = h["value"] * ((1 + annual_return) ** req.years)
        real = nominal / (1 + cumulative_inflation)
        h["nominal_after"] = round(nominal, 2)
        h["real_after"] = round(real, 2)
        portfolio_after_nominal += nominal
        portfolio_after_real += real

    real_change = portfolio_after_real - portfolio_today
    real_change_pct = (real_change / portfolio_today * 100) if portfolio_today else 0

    has_energy = sector_breakdown.get("energy", 0) > 0
    has_financials = sector_breakdown.get("financials", 0) > 0
    has_staples = sector_breakdown.get("staples", 0) > 0

    suggestions = []
    if not has_energy:
        suggestions.append(
            {
                "type": "add",
                "text": "Add some energy exposure (XLE) — energy historically outpaces inflation",
            }
        )
    if not has_financials:
        suggestions.append(
            {
                "type": "add",
                "text": "Add financials (XLF) — banks benefit from rising rates that follow inflation",
            }
        )
    if not has_staples:
        suggestions.append(
            {
                "type": "add",
                "text": "Add consumer staples (XLP) — companies that pass cost increases on to consumers",
            }
        )

    bond_holdings = [h for h in holdings_data if h["sector"] == "bonds"]
    if bond_holdings and req.annual_inflation_pct > 4:
        suggestions.append(
            {
                "type": "shift",
                "text": "Shift to short-term bonds (BSV) — less hurt by rising rates",
            }
        )

    if not suggestions:
        suggestions.append(
            {
                "type": "hold",
                "text": "Your mix already covers inflation-resistant sectors. Hold.",
            }
        )

    rationale = (
        f"At {req.annual_inflation_pct}% annual inflation over {req.years} years, money loses "
        f"~{round(cumulative_inflation*100, 1)}% of purchasing power. We show real (inflation-adjusted) value."
    )
    return {
        "scenario_id": "inflation",
        "params": {"annual_inflation_pct": req.annual_inflation_pct, "years": req.years},
        "portfolio_today": round(portfolio_today, 2),
        "portfolio_after": round(portfolio_after_real, 2),
        "portfolio_after_nominal": round(portfolio_after_nominal, 2),
        "change": round(real_change, 2),
        "change_pct": round(real_change_pct, 1),
        "cumulative_inflation_pct": round(cumulative_inflation * 100, 1),
        "holdings_breakdown": holdings_data,
        "suggestions": suggestions,
        "rationale": rationale,
        "confidence": "medium",
    }


# === SCENARIO 3: WITHDRAW ===
class WithdrawRequest(BaseModel):
    holdings: List[ScenarioHolding]
    timeline_years: float = 5
    risk_feel: str = "nervous"
    withdrawal_pct: float = 20
    timeframe_months: int = 12


@app.post("/scenario/withdraw")
def scenario_withdraw(req: WithdrawRequest):
    holdings_data, portfolio_today, _ = _portfolio_breakdown(req.holdings)
    if portfolio_today <= 0:
        return {"error": "empty_portfolio"}

    # Attach volatility for prioritization
    for h in holdings_data:
        metrics = get_fund_metrics(h["symbol"])
        h["volatility"] = metrics["volatility"] if metrics else 0.20

    withdrawal_amount = portfolio_today * (req.withdrawal_pct / 100)
    portfolio_after = portfolio_today - withdrawal_amount

    # Sort: highest-volatility individual stocks first; diversified + bonds last
    holdings_data.sort(
        key=lambda h: (
            h["sector"] in ("diversified", "bonds"),  # False=0 sorts first → individual stocks first
            -h["volatility"],
        )
    )

    remaining = withdrawal_amount
    sell_plan = []
    for holding in holdings_data:
        if remaining <= 0.01:
            break
        sell_value = min(holding["value"], remaining)
        if sell_value <= 0:
            continue
        shares_to_sell = round(sell_value / holding["price"], 2) if holding["price"] else 0
        sell_plan.append(
            {
                "symbol": holding["symbol"],
                "shares_to_sell": shares_to_sell,
                "estimated_proceeds": round(sell_value, 2),
                "reason": (
                    "Higher volatility — lock in current value"
                    if holding["volatility"] > 0.20
                    else "Single-company position — reduce concentration risk"
                    if holding["sector"] not in ("diversified", "bonds")
                    else "Stable holding — withdraw last resort"
                ),
            }
        )
        remaining -= sell_value

    suggestions = [
        {
            "type": "sell",
            "text": f"Sell ~{item['shares_to_sell']} shares of {item['symbol']} (~${item['estimated_proceeds']:,.0f})",
            "detail": item["reason"],
        }
        for item in sell_plan
    ]

    if req.timeframe_months >= 6:
        suggestions.append(
            {
                "type": "stage",
                "text": f"Spread sales over {req.timeframe_months} months to reduce timing risk",
            }
        )

    suggestions.append(
        {
            "type": "tax",
            "text": "Sell shares held >1 year first — they qualify for the lower long-term capital gains rate",
        }
    )

    rationale = (
        f"To raise ${withdrawal_amount:,.0f}, sell from highest-volatility positions first. "
        "This protects your stable core holdings."
    )
    return {
        "scenario_id": "withdraw",
        "params": {"withdrawal_pct": req.withdrawal_pct, "timeframe_months": req.timeframe_months},
        "portfolio_today": round(portfolio_today, 2),
        "portfolio_after": round(portfolio_after, 2),
        "change": -round(withdrawal_amount, 2),
        "change_pct": -req.withdrawal_pct,
        "withdrawal_amount": round(withdrawal_amount, 2),
        "sell_plan": sell_plan,
        "holdings_breakdown": holdings_data,
        "suggestions": suggestions,
        "rationale": rationale,
        "confidence": "high",
    }


# === SCENARIO 4: RATE CHANGE ===
class RateRequest(BaseModel):
    holdings: List[ScenarioHolding]
    timeline_years: float = 5
    risk_feel: str = "nervous"
    direction: str = "rises"  # 'rises' | 'falls'
    magnitude_bps: float = 200


_BOND_DURATIONS = {
    "BSV": 2.7,
    "VBIRX": 2.7,
    "BND": 6.5,
    "VBTLX": 6.5,
    "AGG": 6.0,
    "BLV": 14.0,
    "TLT": 17.0,
}

_EQUITY_RATE_SENSITIVITY = {
    "tech": -0.05,
    "growth": -0.06,
    "financials": +0.03,
    "utilities": -0.04,
    "staples": -0.01,
    "energy": +0.01,
    "healthcare": -0.02,
    "international": -0.02,
    "diversified": -0.02,
    "consumer_cyclical": -0.03,
    "industrials": -0.02,
    "default": -0.03,
}


@app.post("/scenario/rate-change")
def scenario_rate_change(req: RateRequest):
    holdings_data, portfolio_today, sector_breakdown = _portfolio_breakdown(req.holdings)
    if portfolio_today <= 0:
        return {"error": "empty_portfolio"}

    rate_change = req.magnitude_bps / 10000.0  # bps → decimal
    if req.direction == "falls":
        rate_change = -rate_change

    portfolio_after = 0.0
    for h in holdings_data:
        if h["sector"] == "bonds":
            duration = _BOND_DURATIONS.get(h["symbol"], 5.0)
            impact_pct = -duration * rate_change
        else:
            sensitivity = _EQUITY_RATE_SENSITIVITY.get(
                h["sector"], _EQUITY_RATE_SENSITIVITY["default"]
            )
            impact_pct = sensitivity * (req.magnitude_bps / 100)
            if req.direction == "falls":
                impact_pct = -impact_pct

        new_value = h["value"] * (1 + impact_pct)
        h["value_after"] = round(new_value, 2)
        h["impact_pct"] = round(impact_pct * 100, 1)
        portfolio_after += new_value

    change = portfolio_after - portfolio_today
    change_pct = (change / portfolio_today * 100) if portfolio_today else 0

    suggestions = []
    if req.direction == "rises":
        bond_count = sum(1 for h in holdings_data if h["sector"] == "bonds")
        if bond_count > 0:
            suggestions.append(
                {
                    "type": "shift",
                    "text": "Shift longer-duration bonds (BND) → shorter (BSV) — less hurt by rising rates",
                }
            )
        if sector_breakdown.get("financials", 0) == 0:
            suggestions.append(
                {
                    "type": "add",
                    "text": "Consider XLF (financials) — banks benefit from higher rates",
                }
            )
        tech_pct = (sector_breakdown.get("tech", 0) / portfolio_today * 100) if portfolio_today else 0
        if tech_pct > 50:
            suggestions.append(
                {
                    "type": "trim",
                    "text": f"Tech exposure is {tech_pct:.0f}% — growth stocks are most hurt by rising rates",
                }
            )
        if not suggestions:
            suggestions.append(
                {
                    "type": "hold",
                    "text": "Your mix is reasonably resilient to rate hikes.",
                }
            )
    else:  # falls
        suggestions.append(
            {
                "type": "hold",
                "text": "Falling rates favor growth stocks and longer bonds — your positions likely benefit",
            }
        )

    rationale = (
        f"Rates {req.direction} by {req.magnitude_bps} bps. Bonds move inversely "
        "(longer duration = bigger swing). Growth equities are hurt by higher discount rates; "
        "financials benefit."
    )
    return {
        "scenario_id": "rate_change",
        "params": {"direction": req.direction, "magnitude_bps": req.magnitude_bps},
        "portfolio_today": round(portfolio_today, 2),
        "portfolio_after": round(portfolio_after, 2),
        "change": round(change, 2),
        "change_pct": round(change_pct, 1),
        "holdings_breakdown": holdings_data,
        "suggestions": suggestions,
        "rationale": rationale,
        "confidence": "medium",
    }


# === SCENARIO 5: INCOME CHANGE ===
class IncomeRequest(BaseModel):
    holdings: List[ScenarioHolding]
    timeline_years: float = 5
    risk_feel: str = "nervous"
    change_type: str = "loss"  # 'loss' | 'cut' | 'raise'
    months_affected: int = 6
    monthly_expenses: float = 4000


@app.post("/scenario/income-change")
def scenario_income_change(req: IncomeRequest):
    _, portfolio_today, _ = _portfolio_breakdown(req.holdings)
    if portfolio_today <= 0:
        return {"error": "empty_portfolio"}

    if req.change_type in ("loss", "cut"):
        cash_needed = req.monthly_expenses * req.months_affected
        cushion_pct = (cash_needed / portfolio_today * 100) if portfolio_today else 0

        suggestions = [
            {
                "type": "pause",
                "text": "Pause new investments — preserve cash for living expenses",
            },
            {
                "type": "build_buffer",
                "text": (
                    f"Build cash buffer of ~${cash_needed:,.0f} "
                    f"({req.months_affected} months at ${req.monthly_expenses:,.0f}/mo)"
                ),
            },
        ]
        if cushion_pct > 15:
            suggestions.append(
                {
                    "type": "sell",
                    "text": "If needed, sell highest-volatility positions first to preserve diversified core",
                }
            )
        else:
            suggestions.append(
                {
                    "type": "hold",
                    "text": (
                        f"Your portfolio can absorb {req.months_affected} months without selling — "
                        "buffer is in place"
                    ),
                }
            )

        rationale = (
            f"During {req.months_affected} months without "
            f"{'income' if req.change_type == 'loss' else 'full pay'}, you need ~${cash_needed:,.0f} "
            "liquid. The goal is preserving your portfolio, not growing it."
        )

        return {
            "scenario_id": "income_change",
            "params": {
                "change_type": req.change_type,
                "months_affected": req.months_affected,
                "monthly_expenses": req.monthly_expenses,
            },
            "portfolio_today": round(portfolio_today, 2),
            "portfolio_after": round(portfolio_today, 2),
            "change": 0,
            "change_pct": 0,
            "cash_needed": round(cash_needed, 2),
            "cushion_pct": round(cushion_pct, 1),
            "suggestions": suggestions,
            "rationale": rationale,
            "confidence": "high",
        }

    # raise
    suggestions = [
        {
            "type": "increase",
            "text": "Increase monthly contributions — compound growth from extra savings is huge over time",
        },
        {
            "type": "diversify",
            "text": "New money is a chance to fill sector gaps without selling existing positions",
        },
        {
            "type": "tax",
            "text": "If raise pushes you to a higher tax bracket, prioritize 401(k) and IRA contributions",
        },
    ]
    return {
        "scenario_id": "income_change",
        "params": {
            "change_type": "raise",
            "months_affected": req.months_affected,
            "monthly_expenses": req.monthly_expenses,
        },
        "portfolio_today": round(portfolio_today, 2),
        "portfolio_after": round(portfolio_today, 2),
        "change": 0,
        "change_pct": 0,
        "suggestions": suggestions,
        "rationale": "A raise is a great chance to boost your savings rate. Don't let lifestyle inflation absorb it.",
        "confidence": "high",
    }


@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.now().isoformat()}
