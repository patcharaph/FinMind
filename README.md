# FinMind: Agentic Wealth Tracker

Mobile-first **Dark Neon Glassmorphism** web app for tracking assets, liabilities, cash flow, and agentic AI advice. All in one file (`index.html`) using Tailwind CDN + vanilla JS + inline SVG.

## Requirements
- Modern browser (Chrome / Edge / Firefox / Safari) with ES6 support
- No server or build steps — just open `index.html`

## Features
- **Dashboard:** Gradient Net Worth card, Total Assets/Liabilities, Monthly Income/Expenses
- **Portfolio:** Assets/Liabilities lists with totals and inline Edit/Delete; single `+ Add` opens modal to choose type
- **Transactions (History):** Inline Edit/Delete with coloring for income/expense
- **Agentic AI Advisor:** Chat-like stream with typing effect; Guardian / Strategist / Analyst rules analyze debt ratios, cash runway, and income vs expense, returning glowing insights
- **Bottom Navigation:** Floating glass bar with Add action opening bottom sheet
- **Modals:** Slide-up sheets for adding or editing Transactions and Assets/Liabilities (dark dropdowns)
- **Animations:** Floating, pulse glow, fade-in-up keyframes
- **Dummy Data:** Salary, Crypto Portfolio, Car Loan, Food Expense, etc. preloaded

## Freemium Model (FinMind Prime)
- Free: Unlimited transactions, max 2 assets, Advisor tab locked (teaser only)
- Prime: Unlimited assets, full AI Advisor, premium neon/glass visuals
- Paywall triggers: Advisor → "Analyze My Wealth" CTA, or adding a 3rd asset
- Simulate Prime by setting `isPrime = true` inside `index.html` (search for the variable near the top of the script)

### Monetization / Paywall Behavior
- Badge/brand: all premium copy uses “FinMind Prime”; badge updates when `plan === "prime"` or `isPrime` is toggled.
- Advisor lock: overlay appears when not Prime; CTA opens paywall modal; “Start Trial” flips `isPrime` client-side for demoing.
- Asset limit: adding a 3rd asset (while not Prime) opens the paywall and blocks the add.
- Backend plan: set `plan: "prime"` during `/auth/signup` (or manually update the user) to drive Prime state when using the API.

## UI Preview
<img src="preview.svg" alt="FinMind UI preview" width="320" />

## File Structure
- `index.html` — contains all HTML/CSS/JS (Tailwind from CDN; no other deps)
- `server.js` — optional Node/Express API with Postgres (or in-memory fallback)
- `schema.sql` — Postgres schema to create tables
- `package.json` — backend dependencies/scripts

## Usage
1) Open `index.html` in your browser.  
2) Use the bottom nav to switch Home / Assets / Advisor / History, or hit Add to log a transaction (Assets tab also has inline `+ Add`).  
3) When served over http(s), the app auto-uses the same origin for API calls. Use the modal to **Sign In** or **Sign Up** (demo: `demo@finmind.ai` / `demo123`). Opening via `file://` falls back to `http://localhost:4001` so adds still hit your running backend; override with `window.API_URL` if needed.  
4) Edit/Delete entries directly in Assets/Liabilities/History lists; local mode persists only for the session.  
5) Sign Out clears token/user + resets state; 401 responses auto-logout and reopen the login modal.

## Customization
- Core colors live in `:root` inside `<style>` (neon purple/indigo/green/red/cyan).
- Add or tweak advisor rules in `renderAdvisor()` within `<script>`.
- Extend seed data in the `state` object (assets, liabilities, transactions).
- Served over http(s), API calls default to the current origin. If opened via `file://`, it falls back to `http://localhost:4001`. Override by setting `window.API_URL` near the top of `<script>` (e.g., `http://localhost:4000` or `4001`).

## Data Persistence
- No backend or database by default — data stays in browser memory and resets on refresh.
- When loaded over http(s), signing in uses the API at the current origin (or `API_URL` override). If opened via `file://`, calls target `http://localhost:4001` by default so you can still hit a running backend. `/me` is called on boot to refresh a stale token.

## Backend API (Optional)
Use this when you want persistence and to wrap the app for App Store/Play submission (via PWA + WebView).

### Requirements
- Node 18+
- Postgres (or leave `DATABASE_URL` unset to run in-memory)
 - JWT_SECRET for auth (dev fallback is set but change in production)

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
JWT_SECRET=change_me_for_prod
FINMIND_USE_DB=true
# Optional LLM for advisor:
# LLM_PROVIDER=openai        # or openrouter
# LLM_API_KEY=your_key       # OPENAI or OPENROUTER key
# ADVISOR_LLM_MODEL=gpt-4.1-mini    # for OpenAI (default)
# ADVISOR_LLM_MODEL=openrouter/openai/gpt-4o-mini   # example for OpenRouter
# OPENROUTER_REFERRER=https://finmind.app
# OPENROUTER_TITLE=FinMind Advisor
ALLOW_DEV_HEADER=false  # do not allow x-user-id fallback in production
```

Initialize tables (if you want to run manually): `psql "$DATABASE_URL" -f schema.sql`  
The server also auto-creates tables at startup if `DATABASE_URL` is set.

Postgres setup quickstart (local)
- Install PostgreSQL with “Command Line Tools” (psql). Ensure `psql --version` works; add `C:\Program Files\PostgreSQL\18\bin` to PATH if needed.
- Create user/db:
  ```bash
  psql -U postgres -h localhost -c "CREATE USER finmind WITH PASSWORD 'yourpassword';"
  psql -U postgres -h localhost -c "CREATE DATABASE finmind OWNER finmind;"
  ```
- Set `DATABASE_URL=postgres://finmind:yourpassword@localhost:5432/finmind`
- If you forget the postgres password: temporarily change `pg_hba.conf` local entries to `trust`, restart service, run `ALTER USER postgres WITH PASSWORD 'newpass';` then revert `pg_hba.conf` to `scram-sha-256` and restart again.

Environment notes (prod-ready)
- Use `FINMIND_USE_DB=true`, `ALLOW_DEV_HEADER=false`, set `JWT_SECRET` to a strong random string.
- Set `CORS_ORIGINS` to your real domain(s).
- Provide LLM credentials: `LLM_PROVIDER=openai|openrouter`, `LLM_API_KEY` (or `OPENROUTER_API_KEY`), and choose a model (e.g., `gpt-4.1-mini` or `openrouter/openai/gpt-4o-mini`).

### Run
```bash
npm start
# or hot reload
npm run dev
```

API base URL defaults to the current origin when served over http(s). If opened via `file://`, it falls back to `http://localhost:4001`; set `window.API_URL` in `index.html` if you need to target a different backend (e.g., `http://localhost:4000`).

### Auth
- `POST /auth/signup` – body: `{ email, password, display_name?, plan? }` → returns `{ token, user }`
- `POST /auth/login` – body: `{ email, password }` → returns `{ token, user }`
- `GET /me` – auth required (Bearer)
- Auth header: `Authorization: Bearer <token>`
- Dev header `x-user-id` is **disabled by default**; set `ALLOW_DEV_HEADER=true` only for local testing.
- In-memory demo user (dev): `demo@finmind.ai` / `demo123`
- Frontend modal supports Sign In/Sign Up; auto-fetches `/me` on boot if a token exists (refreshes stale localStorage) and logs out on any 401.

### Endpoints (minimal)
- `GET /health` – status + whether DB is enabled
- `GET /summary` – totals for assets, liabilities, net worth, income, expenses
- `GET/POST /assets`
- `GET/POST /liabilities`
- `GET/POST /transactions` (`?limit=50` default)
- `GET /advisor/insights` – financial metrics + rule-based insights + optional LLM advice

Headers: `x-user-id` (demo auth, defaults to 1).  
Body: JSON; `Content-Type: application/json`.

### Notes
- If `DATABASE_URL` is missing, API serves/updates in-memory demo data.
- Frontend Edit/Delete currently update client state; extend the API with PUT/DELETE if you need persisted edits/removals.
- Wrap as PWA + Capacitor/TWA for App Store/Play; point mobile build to the same API base URL.

### Advisor Insights
- Endpoint: `GET /advisor/insights`
- Query params:
  - `period` (optional): `last_30d` | `last_90d` | `ytd` | `all` (any other value = no date filter)
  - `lang` (optional): `en` (default) | `th`
- Response:
```json
{
  "period": "last_90d",
  "lang": "en",
  "metrics": {
    "assetTotal": 75000,
    "liabilityTotal": 39500,
    "netWorth": 35500,
    "debtToAssetRatio": 0.53,
    "totalIncome": 5200,
    "totalExpense": 920,
    "savingsAmount": 4280,
    "savingsRate": 0.82,
    "expenseByCategory": { "Dining": 320, "Debt": 420, "Living": 180 },
    "averageDailyExpense": 10.2,
    "monthlyBurn": 306,
    "transactionCount": 5
  },
  "rules": [
    {
      "id": "debt-ratio-warning",
      "severity": "warning",
      "title": "High leverage",
      "message": "Debt-to-asset ratio is above 50%. Consider reducing liabilities or increasing assets.",
      "tags": ["debt"]
    }
  ],
  "llm_advice": null
}
```
- LLM (optional): set `LLM_API_KEY` and `LLM_PROVIDER=openai` (default) plus `ADVISOR_LLM_MODEL` (defaults to `gpt-4.1-mini`). If no key is set, `llm_advice` is `null`.

Examples:
- Curl: `curl "http://localhost:4000/advisor/insights?period=last_90d&lang=en" -H "Authorization: Bearer <token>"`
- HTTPie: `http :4000/advisor/insights period==last_90d lang==th Authorization:"Bearer <token>"`

### Frontend (showing insights)
- Call `/advisor/insights` once after loading data, then display `metrics` and `rules`.
- Use `rules` for badges/alerts; show `llm_advice` as a short paragraph when available.

### PWA / Mobile packaging
- PWA assets: `manifest.webmanifest`, `service-worker.js` (cache-first fallback), `preview.svg` as temporary icon.
- Register service worker on load; update icons with proper PNGs before store submission.
- For native store shells, wrap with Capacitor/TWA and ensure HTTPS + JWT auth (no `x-user-id` fallback).

### Tests / CI
- Unit + API (in-memory): `npm test`
- Lint: `npm run lint`
- Postgres integration test: set `TEST_DATABASE_URL` then `npm test` (skips if not set).
- CI (GitHub Actions): see `.github/workflows/ci.yml` for lint + test.

### Policies
- Privacy: see `PRIVACY.md`
- Terms: see `TERMS.md`
