@echo off
echo ================================================================
echo TeamCord - Starting Development Servers
echo ================================================================
echo.

cd /d %~dp0

echo Starting Docker infrastructure...
docker compose up -d postgres redis minio

echo.
echo Starting development servers in separate windows...
echo.

echo [1] Starting Messaging server (http://localhost:3001)...
start "TeamCord Messaging" cmd /k "cd /d %~dp0 && corepack pnpm dev:messaging"
timeout /t 2 /nobreak >nul

echo [2] Starting Gateway server (ws://localhost:3002)...
start "TeamCord Gateway" cmd /k "cd /d %~dp0 && corepack pnpm dev:gateway"
timeout /t 2 /nobreak >nul

echo [3] Starting Web UI (http://localhost:3000)...
start "TeamCord Web" cmd /k "cd /d %~dp0 && corepack pnpm dev:web"
timeout /t 3 /nobreak >nul

echo.
echo ================================================================
echo All servers are starting. Give them a moment to finish booting.
echo.
echo Web UI:    http://localhost:3000
echo Messaging: http://localhost:3001
echo Gateway:   ws://localhost:3002
echo ================================================================
echo.
echo Press any key to open TeamCord in your browser...
pause >nul
start http://localhost:3000
