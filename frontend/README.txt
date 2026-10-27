# FinPilot Sentinel — Stitch-inspired React frontend

## Install
1. Back up your existing frontend (already recommended).
2. Copy `App.jsx` and `App.css` into `frontend/src/`, replacing those two files only.
3. Keep `main.jsx`, `index.css`, `package.json`, and the backend unchanged.
4. From the `frontend` directory run `npm run build`, then `npm run dev`.

## API
Uses `VITE_API_BASE_URL` if set; otherwise `http://127.0.0.1:8000`.
Live endpoints used: `/db/transactions`, `/db/analytics`, `/db/forecast`, `/db/alerts`.
Transaction creation uses `POST /db/transactions`.

## Screen status
Live API-backed: Overview, Transactions, Spending Analysis, What-if Simulator, Financial Insights.
Prototype/UI-only: Financial Goals, Budget Planner, Bills & Recurring, Scenario Planning, Reports & Activity.
Financial Assistant is a local rule-based Q&A from current API data; it does not call Mesh API.
