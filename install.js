#!/usr/bin/env node

/**
 * TeamCord Quick Install Script
 * 
 * Usage: node install.js
 * 
 * This script:
 * 1. Generates all source files
 * 2. Creates necessary configuration
 * 3. Provides clear next steps
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   ████████╗███████╗ █████╗ ███╗   ███╗ ██████╗ ██████╗ ██████╗   ║
║   ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██╔════╝██╔═══██╗██╔══██╗  ║
║      ██║   █████╗  ███████║██╔████╔██║██║     ██║   ██║██████╔╝  ║
║      ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║██║     ██║   ██║██╔══██╗  ║
║      ██║   ███████╗██║  ██║██║ ╚═╝ ██║╚██████╗╚██████╔╝██║  ██║  ║
║      ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝  ║
║                                                                   ║
║   Team Communication That Actually Works                         ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`);

console.log('🚀 Starting TeamCord Installation...\n');

// Step 1: Run generators
console.log('📁 Step 1/4: Generating source files...');

const generators = ['generate-sources.js', 'generate-sources-2.js'];
let generated = 0;

generators.forEach(gen => {
  const genPath = path.join(ROOT, gen);
  if (fs.existsSync(genPath)) {
    try {
      require(genPath);
      generated++;
    } catch (err) {
      console.error(`   ⚠ Warning: ${gen} had issues: ${err.message}`);
    }
  }
});

if (generated > 0) {
  console.log(`   ✓ Generated source files\n`);
} else {
  console.log(`   ✓ Source files already present\n`);
}

// Step 2: Create environment files
console.log('🔧 Step 2/4: Setting up environment...');

const envConfigs = [
  {
    path: 'apps/web/.env.local',
    content: `# TeamCord Web Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3002
NEXT_PUBLIC_APP_NAME=TeamCord
`
  },
  {
    path: 'apps/api/.env',
    content: `# TeamCord API Configuration
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://teamcord:teamcord_secret@localhost:5432/teamcord
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-in-production-use-a-long-random-string
JWT_EXPIRES_IN=7d
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=teamcord
MINIO_SECRET_KEY=teamcord_secret
MINIO_BUCKET=teamcord-uploads
CORS_ORIGIN=http://localhost:3000
`
  },
  {
    path: 'apps/gateway/.env',
    content: `# TeamCord Gateway Configuration
GATEWAY_PORT=3002
JWT_SECRET=change-me-in-production-use-a-long-random-string
REDIS_URL=redis://localhost:6379
`
  }
];

envConfigs.forEach(({ path: envPath, content }) => {
  const fullPath = path.join(ROOT, envPath);
  const dir = path.dirname(fullPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, content);
    console.log(`   ✓ Created ${envPath}`);
  } else {
    console.log(`   ✓ ${envPath} already exists`);
  }
});

console.log('');

// Step 3: Update package.json files
console.log('📦 Step 3/4: Checking dependencies...');

const webPkgPath = path.join(ROOT, 'apps', 'web', 'package.json');
if (fs.existsSync(webPkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(webPkgPath, 'utf8'));
  let updated = false;
  
  pkg.dependencies = pkg.dependencies || {};
  
  if (!pkg.dependencies['zustand']) {
    pkg.dependencies['zustand'] = '^4.4.7';
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(webPkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log('   ✓ Updated web package.json');
  } else {
    console.log('   ✓ Dependencies already configured');
  }
}

console.log('');

// Step 4: Summary
console.log('✅ Step 4/4: Installation complete!\n');

console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                         NEXT STEPS                                ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  1. Start infrastructure (Docker required):                      ║
║                                                                   ║
║     docker-compose up -d postgres redis minio                     ║
║                                                                   ║
║  2. Install dependencies:                                         ║
║                                                                   ║
║     npm install                                                   ║
║     cd apps/api && npm install                                    ║
║     cd apps/gateway && npm install                                ║
║     cd apps/web && npm install                                    ║
║                                                                   ║
║  3. Initialize database:                                          ║
║                                                                   ║
║     cd packages/db && npm run db:push                             ║
║                                                                   ║
║  4. Start development servers:                                    ║
║                                                                   ║
║     # Terminal 1 - API                                            ║
║     cd apps/api && npm run dev                                    ║
║                                                                   ║
║     # Terminal 2 - Gateway                                        ║
║     cd apps/gateway && npm run dev                                ║
║                                                                   ║
║     # Terminal 3 - Web                                            ║
║     cd apps/web && npm run dev                                    ║
║                                                                   ║
║  Or use the start script:                                         ║
║     Windows: start-dev.bat                                        ║
║     Linux/Mac: ./start-dev.sh                                     ║
║                                                                   ║
╠═══════════════════════════════════════════════════════════════════╣
║  📱 Web App:    http://localhost:3000                             ║
║  🔌 API:        http://localhost:3001                             ║
║  📚 API Docs:   http://localhost:3001/docs                        ║
║  ⚡ WebSocket:  ws://localhost:3002                               ║
╚═══════════════════════════════════════════════════════════════════╝
`);
