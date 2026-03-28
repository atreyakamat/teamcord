@echo off
echo ========================================
echo  Nexus Project Setup Script
echo ========================================
echo.

cd /d %~dp0

echo Creating directory structure...
mkdir apps\web\src\components 2>nul
mkdir apps\web\src\pages 2>nul
mkdir apps\web\src\hooks 2>nul
mkdir apps\web\src\stores 2>nul
mkdir apps\web\src\utils 2>nul
mkdir apps\web\src\styles 2>nul
mkdir apps\web\src\services 2>nul
mkdir apps\web\public 2>nul
mkdir apps\api\src\routes 2>nul
mkdir apps\api\src\services 2>nul
mkdir apps\api\src\middleware 2>nul
mkdir apps\api\src\utils 2>nul
mkdir apps\api\src\websocket 2>nul
mkdir apps\api\prisma 2>nul
mkdir packages\shared\src 2>nul
mkdir packages\ui\src\components 2>nul
mkdir docker 2>nul

echo Directories created!
echo.
echo Installing dependencies...
call pnpm install

echo.
echo Generating Prisma client...
cd apps\api
call pnpm db:generate
cd ..\..

echo.
echo ========================================
echo  Setup complete!
echo ========================================
echo.
echo Next steps:
echo  1. Create a .env file in apps/api with your settings
echo  2. Run: pnpm db:migrate
echo  3. Run: pnpm dev
echo.
pause
