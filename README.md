# FinMind (Beta)

> AI-Powered Personal Finance Copilot — Mobile-first financial snapshot tool with expert-level wealth management advice.

---

## Features

- **Monthly Snapshots** — Track Net Worth, Savings Rate, Runway, and Cash-to-Debt Ratio.
- **AI Financial Advisor** — MBA-level insights powered by OpenRouter (Claude 3.5 / GPT-4o / Gemini Flash).
- **Mobile-First PWA** — Installable progressive web app, optimized for mobile.
- **Privacy-First** — Local SQLite database. AI only receives summarized numbers, never raw data.
- **Dark FinTech Theme** — High-contrast neon cyan/pink aesthetic.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 7, Tailwind CSS 4, Zustand 5, Recharts 3, Lucide Icons |
| **Backend** | Node.js, Express 5, Better-SQLite3 |
| **AI Engine** | OpenRouter API (`openai` SDK) |
| **Testing** | Jest 30, Supertest |
| **Dev Tools** | Nodemon, Concurrently, ESLint, PWA Plugin |

---

## Project Structure

```
FinMind/
├── client/                    # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/        # Reusable UI (Layout, Wizard, AIAdvisor, NetWorthCard, HistoryChart)
│   │   ├── pages/             # Tab pages (DashboardPage, HistoryPage, Onboarding)
│   │   ├── store/             # Zustand global state (useStore.js)
│   │   ├── App.jsx            # Root component + tab routing
│   │   └── index.css          # Tailwind theme (finmind-* colors)
│   ├── tailwind.config.js
│   └── vite.config.js         # PWA manifest config
│
├── server/                    # Backend API (Express + SQLite)
│   ├── db.js                  # Database schema + data access layer
│   ├── index.js               # Express routes + OpenRouter AI integration
│   ├── smoke_test.js          # Quick API verification
│   ├── test/                  # Jest test suite
│   ├── .env.example           # Environment variable template
│   └── database.sqlite        # SQLite file (auto-created)
│
├── package.json               # Root scripts (install:all, dev, test)
├── requirements.txt           # All npm dependencies listed
└── README.md                  # This file
```

---

## Quick Start

### 1. Prerequisites

- **Node.js** v18+
- **OpenRouter API Key** — get one at [openrouter.ai](https://openrouter.ai)

### 2. Install

```bash
npm install             # root dependencies (concurrently)
npm run install:all     # server + client dependencies
```

### 3. Configure

Create `server/.env`:

```env
OPENROUTER_API_KEY=your_api_key_here
PORT=3000
```

### 4. Run

```bash
npm run dev
```

Opens both services:

| Service | URL |
|---------|-----|
| Backend API | http://localhost:3000 |
| Frontend App | http://localhost:5173 |

---

## All Commands

| Command | Description |
|---------|-------------|
| `npm run install:all` | Install server + client dependencies |
| `npm run dev` | Start server + client together |
| `npm run dev:server` | Start backend only |
| `npm run dev:client` | Start frontend only |
| `npm run build:client` | Build frontend for production |
| `npm test` | Run backend tests (Jest) |

---

## Database Schema (SQLite)

| Table | Purpose |
|-------|---------|
| `users` | User profiles (no-login MVP, default user ID 1) |
| `snapshots` | Monthly financial data (cash, investments, debt, income, expenses) |
| `advice_history` | AI-generated advice linked to snapshots |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server health check |
| `GET` | `/api/snapshots?user_id=1` | Get all snapshots for a user |
| `POST` | `/api/snapshots` | Create a new monthly snapshot |
| `POST` | `/api/advisor/generate` | Generate AI advice for a snapshot |

### POST `/api/snapshots` body:

```json
{
  "user_id": 1,
  "market_date": "2026-02",
  "cash": 12000,
  "investments": 25000,
  "debt": 18000,
  "income": 5500,
  "expenses": 3800
}
```

### POST `/api/advisor/generate` body:

```json
{
  "snapshot_id": 1,
  "user_id": 1
}
```

---

## AI Advisor

The AI advisor acts as a **Senior Wealth Management Strategist**. It analyzes:

- **Liquidity** — Emergency fund coverage (3-6 month benchmark)
- **Debt-to-Asset Ratio** — Leverage assessment
- **Savings Rate** — Income efficiency
- **Investment Exposure** — Portfolio allocation
- **Runway** — Months of expenses covered by cash

Output is structured JSON with: `financial_status`, `risk_score`, `insight`, and `actionable_step`.

---

## Design System

| Token | Color | Usage |
|-------|-------|-------|
| `finmind-background` | `#0f172a` | Page background |
| `finmind-card` | `#1e293b` | Card surfaces |
| `finmind-primary` | `#00f3ff` | Neon cyan — primary accent |
| `finmind-secondary` | `#ff00ff` | Neon pink — secondary accent |
| `finmind-success` | `#10b981` | Positive values |
| `finmind-warning` | `#f59e0b` | Warnings |
| `finmind-text` | `#e2e8f0` | Body text |
| `finmind-muted` | `#94a3b8` | Secondary text |

---

## Usage

1. Open the app on mobile or desktop browser
2. Go to **Input Data** tab — enter Cash, Income, Expenses, Debt, Investments
3. View **Dashboard** — see Net Worth, Savings Rate, Runway, Cash/Debt Ratio
4. Tap **AI Advisor** — get personalized financial strategy
5. Check **History** — track Net Worth trend over time

---

## Contributing

1. Fork the repo
2. Create a feature branch
3. Submit a Pull Request

---

## License

MIT
