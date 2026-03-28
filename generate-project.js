#!/usr/bin/env node
/**
 * Nexus Project Generator
 * Creates the complete project structure with all files
 * Run: node generate-project.js
 */

const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;

// Directory structure to create
const directories = [
  'apps/web/src/components/auth',
  'apps/web/src/components/chat',
  'apps/web/src/components/layout',
  'apps/web/src/components/sidebar',
  'apps/web/src/components/voice',
  'apps/web/src/components/ui',
  'apps/web/src/pages',
  'apps/web/src/hooks',
  'apps/web/src/stores',
  'apps/web/src/utils',
  'apps/web/src/services',
  'apps/web/src/styles',
  'apps/web/public',
  'apps/api/src/routes',
  'apps/api/src/services',
  'apps/api/src/middleware',
  'apps/api/src/utils',
  'apps/api/src/websocket',
  'apps/api/prisma',
  'packages/shared/src',
  'packages/ui/src/components',
  'docker',
];

console.log('🚀 Nexus Project Generator\n');

// Create directories
console.log('📁 Creating directories...');
directories.forEach(dir => {
  const fullPath = path.join(projectRoot, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log('  ✓ ' + dir);
  } else {
    console.log('  - ' + dir + ' (exists)');
  }
});

console.log('\n✅ Project structure created!');
console.log('\nNow generating source files from source-files directory...');

// Copy source files if they exist
const sourceDir = path.join(projectRoot, 'source-files');
if (fs.existsSync(sourceDir)) {
  copySourceFiles(sourceDir, projectRoot);
}

function copySourceFiles(src, dest) {
  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      const destPath = path.join(dest, file);
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copySourceFiles(srcPath, destPath);
    } else {
      const destPath = path.join(dest, file);
      fs.copyFileSync(srcPath, destPath);
      console.log('  ✓ ' + file);
    }
  });
}

console.log('\n📝 Next steps:');
console.log('  1. Run: pnpm install');
console.log('  2. Copy apps/api/.env.example to apps/api/.env');
console.log('  3. Run: pnpm db:migrate');
console.log('  4. Run: pnpm dev');
