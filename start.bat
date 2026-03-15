@echo off
title QA Sentinel - Startup
color 0B

echo.
echo  ================================================
echo   QA Sentinel - Playwright Failure Analyzer
echo  ================================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do echo  Node.js %%i found

:: Check PostgreSQL
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] psql not in PATH. Make sure PostgreSQL is running.
) else (
    for /f "tokens=*" %%i in ('psql --version') do echo  %%i found
)

echo.
echo  Installing backend dependencies...
cd /d "%~dp0backend"
call npm install --silent
if %errorlevel% neq 0 ( echo [ERROR] Backend npm install failed & pause & exit /b 1 )

echo  Running database migration...
call node src/db/migrate.js
if %errorlevel% neq 0 ( echo [ERROR] Migration failed - check your .env DB settings & pause & exit /b 1 )

echo  Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install --silent
if %errorlevel% neq 0 ( echo [ERROR] Frontend npm install failed & pause & exit /b 1 )

echo.
echo  ================================================
echo   Starting servers...
echo   Backend  -> http://localhost:3001
echo   Frontend -> http://localhost:5173
echo  ================================================
echo.

:: Start backend in new window
start "QA Sentinel - Backend" cmd /k "cd /d %~dp0backend && echo Backend starting... && node src/server.js"

:: Wait 2 seconds then start frontend
timeout /t 2 /nobreak >nul
start "QA Sentinel - Frontend" cmd /k "cd /d %~dp0frontend && echo Frontend starting... && npm run dev"

:: Wait then open browser
timeout /t 4 /nobreak >nul
start http://localhost:5173

echo  Both servers started in separate windows.
echo  Opening browser at http://localhost:5173
echo.
echo  To stop: close the Backend and Frontend windows.
pause
