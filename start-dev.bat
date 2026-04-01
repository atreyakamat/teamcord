@echo off
echo ╔══════════════════════════════════════════════════════════════╗
echo ║              Nexus - Starting Development Servers         ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

cd /d %~dp0

echo Starting Docker infrastructure...
docker compose up -d postgres redis minio

echo.
echo Starting development servers in separate windows...
echo.

echo [1] Starting API server (http://localhost:3001)...
start "Nexus API" cmd /k "cd /d %~dp0 && pnpm dev:api"
timeout /t 2 /nobreak >nul

echo [2] Starting Gateway server (ws://localhost:3002)...
start "Nexus Gateway" cmd /k "cd /d %~dp0 && pnpm dev:gateway"
timeout /t 2 /nobreak >nul

echo [3] Starting Web UI (http://localhost:3000)...
start "Nexus Web" cmd /k "cd /d %~dp0 && pnpm dev:web"
timeout /t 3 /nobreak >nul

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  All servers starting! Please wait for them to be ready.     ║
echo ║                                                               ║
echo ║  Web UI:        http://localhost:3000                        ║
echo ║  API:           http://localhost:3001                        ║
echo ║  API Docs:      http://localhost:3001/docs                   ║
echo ║  Gateway:       ws://localhost:3002                          ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Press any key to open Nexus in your browser...
pause >nul
start http://localhost:3000
