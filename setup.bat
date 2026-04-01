@echo off
echo ╔══════════════════════════════════════════════════════════════╗
echo ║           Nexus - Development Environment Setup           ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  Discord alternative for teams - Self-hosted, Open-source    ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

cd /d %~dp0

echo [1/6] Checking prerequisites...
where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: pnpm is not installed. Install it with: npm install -g pnpm
    pause
    exit /b 1
)
where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Docker not found. You'll need Docker for database services.
)
echo       Prerequisites OK
echo.

echo [2/6] Creating .env file from template...
if not exist .env (
    copy .env.example .env >nul
    echo       Created .env - IMPORTANT: Edit JWT_SECRET before production!
) else (
    echo       .env already exists, skipping
)
echo.

echo [3/6] Installing dependencies with pnpm...
call pnpm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: pnpm install failed
    pause
    exit /b 1
)
echo       Dependencies installed
echo.

echo [4/6] Building shared packages...
call pnpm --filter @nexus/types build
call pnpm --filter @nexus/db build
echo       Packages built
echo.

echo [5/6] Starting Docker infrastructure (postgres, redis, minio)...
docker compose up -d postgres redis minio
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Docker services failed to start. Start them manually:
    echo          docker compose up -d postgres redis minio
) else (
    echo       Docker services started
    echo       Waiting 5 seconds for PostgreSQL to initialize...
    timeout /t 5 /nobreak >nul
)
echo.

echo [6/6] Running database migrations...
cd packages\db
call pnpm db:push
cd ..\..
echo       Database schema applied
echo.

echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    Setup Complete!                            ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  To start development:                                        ║
echo ║    pnpm dev                                                   ║
echo ║                                                               ║
echo ║  Or start services individually:                              ║
echo ║    pnpm dev:api     - API on http://localhost:3001           ║
echo ║    pnpm dev:gateway - WebSocket on ws://localhost:3002       ║
echo ║    pnpm dev:web     - Web UI on http://localhost:3000        ║
echo ║                                                               ║
echo ║  API Documentation: http://localhost:3001/docs               ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
pause
