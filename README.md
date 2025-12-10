# FinMind: Agentic Wealth Tracker

Mobile-first **Dark Neon Glassmorphism** web app for tracking assets, liabilities, cash flow, and agentic AI advice. All in one file (`index.html`) using Tailwind CDN + vanilla JS + inline SVG.

## Requirements
- Modern browser (Chrome / Edge / Firefox / Safari) with ES6 support
- No server or build steps — just open `index.html`

## Features
- **Dashboard:** Gradient Net Worth card, Total Assets/Liabilities, Monthly Income/Expenses
- **Portfolio:** Separate Assets and Liabilities with auto totals
- **Agentic AI Advisor:** Chat-like stream with typing effect; Guardian / Strategist / Analyst rules analyze debt ratios, cash runway, and income vs expense, returning glowing insights
- **History:** Recent transactions with income/expense coloring
- **Bottom Navigation:** Floating glass bar with Add action opening bottom sheet
- **Modals:** Slide-up sheets for adding Transactions and Assets/Liabilities
- **Animations:** Floating, pulse glow, fade-in-up keyframes
- **Dummy Data:** Salary, Crypto Portfolio, Car Loan, Food Expense, etc. preloaded

## Freemium Model (NeonFlux Prime)
- Free: Unlimited transactions, max 2 assets, Advisor tab locked (teaser only)
- Prime: Unlimited assets, full AI Advisor, premium neon/glass visuals
- Paywall triggers: Advisor → "Analyze My Wealth" CTA, or adding a 3rd asset
- Simulate Prime by setting `isPrime = true` inside `index.html` (search for the variable near the top of the script)

## UI Preview
<img src="preview.svg" alt="FinMind UI preview" width="320" />

## File Structure
- `index.html` — contains all HTML/CSS/JS (Tailwind from CDN; no other deps)
- `server.js` — optional Node/Express API with Postgres (or in-memory fallback)
- `schema.sql` — Postgres schema to create tables
- `package.json` — backend dependencies/scripts

## Usage
1) Open `index.html` in your browser.  
2) Use the bottom nav to switch Home / Assets / Advisor / History, or hit Add to log a transaction.  
3) Adjust the dummy data in the script to reflect your real portfolio.

## Customization
- Core colors live in `:root` inside `<style>` (neon purple/indigo/green/red/cyan).
- Add or tweak advisor rules in `renderAdvisor()` within `<script>`.
- Extend seed data in the `state` object (assets, liabilities, transactions).
- To use the backend API, set `API_URL` near the top of `<script>` (e.g., `http://localhost:4000`).

## Data Persistence
- No backend or database — data stays in browser memory and resets on refresh.

## Backend API (Optional)
Use this when you want persistence and to wrap the app for App Store/Play submission (via PWA + WebView).

### Requirements
- Node 18+
- Postgres (or leave `DATABASE_URL` unset to run in-memory)

### Setup
```bash
npm install
```

Create `.env` (example):
```bash
PORT=4000
DATABASE_URL=postgres://user:pass@host:5432/finmind
# PGSSLMODE=disable  # uncomment if your Postgres doesn't need SSL
CORS_ORIGINS=*
```

Initialize tables (if you want to run manually): `psql "$DATABASE_URL" -f schema.sql`  
The server also auto-creates tables at startup if `DATABASE_URL` is set.

### Run
```bash
npm start
# or hot reload
npm run dev
```

API base URL defaults to `http://localhost:4000`. Set `API_URL` in `index.html` to match.

### Endpoints (minimal)
- `GET /health` – status + whether DB is enabled
- `GET /summary` – totals for assets, liabilities, net worth, income, expenses
- `GET/POST /assets`
- `GET/POST /liabilities`
- `GET/POST /transactions` (`?limit=50` default)

Headers: `x-user-id` (demo auth, defaults to 1).  
Body: JSON; `Content-Type: application/json`.

### Notes
- If `DATABASE_URL` is missing, API serves/updates in-memory demo data.
- Wrap as PWA + Capacitor/TWA for App Store/Play; point mobile build to the same API base URL.
