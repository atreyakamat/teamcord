/**
 * TeamCord - Complete Setup Script
 * 
 * This script:
 * 1. Creates all necessary directories
 * 2. Generates all source files
 * 3. Updates package.json with dependencies
 * 4. Provides next steps
 * 
 * Run with: node setup-teamcord.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;

console.log('🚀 TeamCord Setup Script');
console.log('========================\n');

// ─── Step 1: Run generators ────────────────────────────────────────────────────
console.log('📁 Step 1: Generating source files...\n');

try {
  // Run main generator
  if (fs.existsSync(path.join(ROOT, 'generate-sources.js'))) {
    require('./generate-sources.js');
    console.log('');
  }
  
  // Run additional generator
  if (fs.existsSync(path.join(ROOT, 'generate-sources-2.js'))) {
    require('./generate-sources-2.js');
    console.log('');
  }
} catch (err) {
  console.error('Error running generators:', err.message);
}

// ─── Step 2: Update package.json for web app ───────────────────────────────────
console.log('\n📦 Step 2: Updating package.json...\n');

const webPkgPath = path.join(ROOT, 'apps', 'web', 'package.json');
if (fs.existsSync(webPkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(webPkgPath, 'utf8'));
  
  // Ensure dependencies
  pkg.dependencies = pkg.dependencies || {};
  pkg.devDependencies = pkg.devDependencies || {};
  
  // Add zustand for state management
  if (!pkg.dependencies['zustand']) {
    pkg.dependencies['zustand'] = '^4.4.7';
    console.log('✓ Added zustand');
  }
  
  // Add nanoid for IDs
  if (!pkg.dependencies['nanoid']) {
    pkg.dependencies['nanoid'] = '^5.0.4';
    console.log('✓ Added nanoid');
  }
  
  // Save
  fs.writeFileSync(webPkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('✓ Updated apps/web/package.json');
}

// ─── Step 3: Create .env files ─────────────────────────────────────────────────
console.log('\n🔧 Step 3: Creating environment files...\n');

const envContent = `# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3002

# App Configuration
NEXT_PUBLIC_APP_NAME=TeamCord
`;

const webEnvPath = path.join(ROOT, 'apps', 'web', '.env.local');
if (!fs.existsSync(webEnvPath)) {
  fs.writeFileSync(webEnvPath, envContent);
  console.log('✓ Created apps/web/.env.local');
}

const apiEnvContent = `# Server Configuration
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/teamcord

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# MinIO (S3-compatible storage)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=teamcord-uploads

# AI Agent
OLLAMA_URL=http://localhost:11434
`;

const apiEnvPath = path.join(ROOT, 'apps', 'api', '.env');
if (!fs.existsSync(apiEnvPath)) {
  fs.writeFileSync(apiEnvPath, apiEnvContent);
  console.log('✓ Created apps/api/.env');
}

const gatewayEnvContent = `# Gateway Configuration
GATEWAY_PORT=3002
JWT_SECRET=your-super-secret-jwt-key-change-in-production
REDIS_URL=redis://localhost:6379
`;

const gatewayEnvPath = path.join(ROOT, 'apps', 'gateway', '.env');
if (!fs.existsSync(gatewayEnvPath)) {
  fs.writeFileSync(gatewayEnvPath, gatewayEnvContent);
  console.log('✓ Created apps/gateway/.env');
}

// ─── Step 4: Create startup scripts ────────────────────────────────────────────
console.log('\n📜 Step 4: Creating startup scripts...\n');

// Windows batch file
const startBat = `@echo off
echo Starting TeamCord Development Environment...
echo.

:: Start Docker services
echo Starting Docker services...
docker-compose up -d postgres redis minio

:: Wait for services
echo Waiting for services to be ready...
timeout /t 5 /nobreak > nul

:: Start API
echo Starting API server...
start "TeamCord API" cmd /k "cd apps\\api && npm run dev"

:: Start Gateway
echo Starting WebSocket gateway...
start "TeamCord Gateway" cmd /k "cd apps\\gateway && npm run dev"

:: Start Web
echo Starting web app...
start "TeamCord Web" cmd /k "cd apps\\web && npm run dev"

echo.
echo TeamCord is starting up!
echo.
echo   Web:     http://localhost:3000
echo   API:     http://localhost:3001
echo   Gateway: ws://localhost:3002
echo.
`;

fs.writeFileSync(path.join(ROOT, 'start-dev.bat'), startBat);
console.log('✓ Created start-dev.bat');

// Unix shell script
const startSh = `#!/bin/bash

echo "Starting TeamCord Development Environment..."
echo

# Start Docker services
echo "Starting Docker services..."
docker-compose up -d postgres redis minio

# Wait for services
echo "Waiting for services to be ready..."
sleep 5

# Start all services with npm-run-all or concurrently
echo "Starting application services..."

# Use concurrently if available, otherwise start in background
if command -v concurrently &> /dev/null; then
  concurrently \\
    "cd apps/api && npm run dev" \\
    "cd apps/gateway && npm run dev" \\
    "cd apps/web && npm run dev"
else
  cd apps/api && npm run dev &
  cd apps/gateway && npm run dev &
  cd apps/web && npm run dev &
  wait
fi
`;

fs.writeFileSync(path.join(ROOT, 'start-dev.sh'), startSh);
fs.chmodSync(path.join(ROOT, 'start-dev.sh'), '755');
console.log('✓ Created start-dev.sh');

// ─── Summary ───────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════');
console.log('✅ TeamCord setup complete!\n');
console.log('Next steps:');
console.log('');
console.log('  1. Install dependencies:');
console.log('     npm install');
console.log('     cd apps/web && npm install');
console.log('     cd apps/api && npm install');
console.log('     cd apps/gateway && npm install');
console.log('');
console.log('  2. Start Docker services (Postgres, Redis, MinIO):');
console.log('     docker-compose up -d postgres redis minio');
console.log('');
console.log('  3. Run database migrations:');
console.log('     cd packages/db && npm run db:push');
console.log('');
console.log('  4. Start development servers:');
console.log('     Windows: start-dev.bat');
console.log('     Linux/Mac: ./start-dev.sh');
console.log('');
console.log('  Or start each service individually:');
console.log('     cd apps/api && npm run dev');
console.log('     cd apps/gateway && npm run dev');
console.log('     cd apps/web && npm run dev');
console.log('');
console.log('Application URLs:');
console.log('  📱 Web App:     http://localhost:3000');
console.log('  🔌 API Server:  http://localhost:3001');
console.log('  ⚡ WebSocket:   ws://localhost:3002');
console.log('════════════════════════════════════════════════════════════════');
