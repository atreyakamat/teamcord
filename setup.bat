@echo off
echo ================================================================
echo TeamCord - Development Environment Setup
echo ================================================================
echo.

cd /d %~dp0

echo [1/6] Checking prerequisites...
where corepack >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: corepack is not installed or not on PATH.
    pause
    exit /b 1
)
where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Docker not found. You will need Docker for infrastructure services.
)
where go >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Go not found. Install Go to run messaging and gateway locally.
)
echo       Prerequisites checked
echo.

echo [2/6] Creating .env file from template...
if not exist .env (
    copy .env.example .env >nul
    echo       Created .env - review secrets before production use.
) else (
    echo       .env already exists, skipping
)
echo.

echo [3/6] Installing dependencies...
call corepack pnpm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: dependency installation failed
    pause
    exit /b 1
)
echo       Dependencies installed
echo.

echo [4/6] Building shared packages...
call corepack pnpm --filter @teamcord/types build
call corepack pnpm --filter @teamcord/db build
echo       Shared packages built
echo.

echo [5/6] Starting Docker infrastructure (postgres, redis, minio)...
docker compose up -d postgres redis minio
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Docker services failed to start. Start them manually with:
    echo          docker compose up -d postgres redis minio
) else (
    echo       Docker services started
    echo       Waiting 5 seconds for PostgreSQL to initialize...
    timeout /t 5 /nobreak >nul
)
echo.

echo [6/6] Running database migrations...
cd packages\db
call corepack pnpm db:push
cd ..\..
echo       Database schema applied
echo.

echo ================================================================
echo Setup complete
echo.
echo To start development:
echo   corepack pnpm dev
echo.
echo Or start services individually:
echo   corepack pnpm dev:messaging
echo   corepack pnpm dev:gateway
echo   corepack pnpm dev:web
echo ================================================================
echo.
pause
