# Finsight math service

A small FastAPI app that wraps `yfinance` so the Next.js app doesn't have to talk to Yahoo directly.

## Run

```bash
cd apps/math-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Test

```bash
curl -s -X POST http://localhost:8000/prices \
  -H "Content-Type: application/json" \
  -d '{"symbols":["AAPL","MSFT","TSLA"]}' | jq
```

## Endpoints

| Verb | Path        | Body                                | Notes                                       |
|------|-------------|-------------------------------------|---------------------------------------------|
| POST | `/prices`   | `{ "symbols": ["AAPL", ...] }`      | Live quotes + day-change %, 5-min cached    |
| POST | `/history`  | `{ "symbol": "AAPL", "period": "1mo" }` | Periods: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y |
| GET  | `/health`   | —                                   | Liveness check                              |
