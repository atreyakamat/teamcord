const fs = require('fs');
const path = require('path');

const basePath = 'g:\\Projects\\teamcord\\apps\\web\\src';
const dirs = [
  'components',
  'components\\layout',
  'components\\chat',
  'components\\workspace',
  'components\\ui',
  'stores',
  'services'
];

// Create directories
dirs.forEach(dir => {
  const fullPath = path.join(basePath, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✓ Created: ${dir}`);
  } else {
    console.log(`✓ Already exists: ${dir}`);
  }
});

console.log('\n📁 Directory structure created successfully!');
