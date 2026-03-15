#!/usr/bin/env bash
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${CYAN} ================================================${NC}"
echo -e "${CYAN}  QA Sentinel - Playwright Failure Analyzer     ${NC}"
echo -e "${CYAN} ================================================${NC}"
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
  echo -e "${RED}[ERROR] Node.js not found.${NC}"
  echo "  macOS:  brew install node"
  echo "  Ubuntu: sudo apt install nodejs npm"
  exit 1
fi
echo -e "${GREEN} ✓ Node.js $(node -v)${NC}"

# Check npm
if ! command -v npm &>/dev/null; then
  echo -e "${RED}[ERROR] npm not found.${NC}"; exit 1
fi

# Check psql
if ! command -v psql &>/dev/null; then
  echo -e "${YELLOW} ⚠ psql not in PATH — make sure PostgreSQL is running${NC}"
else
  echo -e "${GREEN} ✓ $(psql --version)${NC}"
fi

echo ""
echo -e "${CYAN} Installing backend dependencies...${NC}"
cd "$SCRIPT_DIR/backend"
npm install --silent

echo -e "${CYAN} Running database migration...${NC}"
node src/db/migrate.js

echo ""
echo -e "${CYAN} Installing frontend dependencies...${NC}"
cd "$SCRIPT_DIR/frontend"
npm install --silent

echo ""
echo -e "${CYAN} ================================================${NC}"
echo -e "${CYAN}  Starting servers                               ${NC}"
echo -e "${CYAN}  Backend  → http://localhost:3001               ${NC}"
echo -e "${CYAN}  Frontend → http://localhost:5173               ${NC}"
echo -e "${CYAN} ================================================${NC}"
echo ""
echo -e "  Press ${RED}Ctrl+C${NC} to stop both servers."
echo ""

# Cleanup on exit
cleanup() {
  echo ""
  echo -e "${YELLOW} Stopping servers...${NC}"
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  echo -e "${GREEN} Done.${NC}"
}
trap cleanup EXIT INT TERM

# Start backend
cd "$SCRIPT_DIR/backend"
node src/server.js &
BACKEND_PID=$!
echo -e "${GREEN} ✓ Backend started (PID $BACKEND_PID)${NC}"

# Wait for backend
sleep 2

# Start frontend
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN} ✓ Frontend started (PID $FRONTEND_PID)${NC}"

# Open browser
sleep 3
if command -v xdg-open &>/dev/null; then
  xdg-open http://localhost:5173 &>/dev/null &
elif command -v open &>/dev/null; then
  open http://localhost:5173 &>/dev/null &
fi

echo ""
echo -e "${GREEN} QA Sentinel is running at http://localhost:5173${NC}"
echo ""

wait "$BACKEND_PID" "$FRONTEND_PID"
