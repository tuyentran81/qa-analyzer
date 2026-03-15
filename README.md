# QA Analyzer — Playwright Failure Analyzer for Azure DevOps

Analyse Playwright test failures from Azure DevOps pipelines and get instant fix recommendations.
No Docker required — runs natively on Windows, macOS, or Linux.

---

## Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18 or higher | https://nodejs.org (choose LTS) |
| PostgreSQL | 14 or higher | See instructions below |

---

## 1 — Install PostgreSQL (if not installed)

### Windows
1. Download the installer from https://www.postgresql.org/download/windows/
2. Run the installer — default options are fine
3. Remember the **password** you set for the `postgres` user
4. Tick **"Add PostgreSQL bin to PATH"** during install
5. PostgreSQL starts automatically as a Windows service

### macOS
```bash
brew install postgresql@16
brew services start postgresql@16
```

### Ubuntu / Debian
```bash
sudo apt update && sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql && sudo systemctl enable postgresql
```

---

## 2 — Create the Database

```bash
# In your terminal / Command Prompt:
psql -U postgres -f setup-db.sql
```

Windows: if `psql` is not in PATH, use:
`"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -f setup-db.sql`

---

## 3 — Configure the Backend

```bash
cd backend
copy .env.example .env     # Windows
# cp .env.example .env     # macOS / Linux
```

Open `backend/.env` and fill in:

```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qa_analyzer
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# Create at: https://dev.azure.com → User Settings → Personal Access Tokens
# Required scopes: Test Management (Read) + Build (Read)
AZURE_DEVOPS_PAT=your_pat_here

FRONTEND_URL=http://localhost:5173
```

---

## 4 — Start Everything

### Windows — double-click start.bat
### macOS / Linux:
```bash
chmod +x start.sh && ./start.sh
```

The script installs dependencies, runs migrations, starts both servers,
and opens http://localhost:5173 automatically.

### Manual startup (two terminals):

**Terminal 1:**
```bash
cd backend && npm install
node src/db/migrate.js   # first time only
npm run dev
```

**Terminal 2:**
```bash
cd frontend && npm install && npm run dev
```

---

## 5 — Get an Azure DevOps PAT

1. Go to https://dev.azure.com → your avatar → **Personal Access Tokens**
2. **New Token** → name it `qa-sentinel`
3. Scopes: ✅ Test Management (Read) + ✅ Build (Read)
4. Copy the token into `backend/.env`

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "password authentication failed" | Check `DB_PASSWORD` in `.env` |
| "ECONNREFUSED 5432" | Start PostgreSQL service |
| "Cannot find module" | Run `npm install` in `backend/` and `frontend/` |
| "401 Unauthorized" | Regenerate PAT with correct scopes |
| Port conflict | Change `PORT` in `.env` or `server.port` in `vite.config.js` |

**Start PostgreSQL manually:**
- Windows: `net start postgresql-x64-16`
- macOS: `brew services start postgresql@16`
- Linux: `sudo systemctl start postgresql`

---

## Project Structure

```
qa-analyzer/
├── start.bat / start.sh      One-click launchers
├── setup-db.sql              PostgreSQL setup script
├── backend/
│   ├── .env.example          Copy → .env and configure
│   └── src/
│       ├── server.js
│       ├── controllers/      Request handlers
│       ├── services/         Azure DevOps client + fix generator
│       ├── models/           PostgreSQL queries
│       └── db/               Connection pool + migrations
└── frontend/
    └── src/
        ├── pages/            HomePage, AnalysisPage, HistoryPage
        └── components/       FailureCard, StatsBar, Layout
```
