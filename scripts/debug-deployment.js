#!/usr/bin/env node

// Debug script to check for common deployment issues

const fs = require('fs');
const path = require('path');

console.log('🔍 Deployment Debug Check');
console.log('========================');

// Check environment variables
console.log('\n1. Environment Variables:');
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY'
];

requiredEnvVars.forEach(varName => {
  const isSet = process.env[varName] ? '✅' : '❌';
  console.log(`${isSet} ${varName}: ${process.env[varName] ? 'Set' : 'Missing'}`);
});

// Check build files
console.log('\n2. Build Files:');
const buildPath = path.join(__dirname, '..', '.next');
const buildExists = fs.existsSync(buildPath);
console.log(`${buildExists ? '✅' : '❌'} Build directory exists: ${buildExists}`);

// Check package.json scripts
console.log('\n3. Package.json Scripts:');
const packagePath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const scripts = packageJson.scripts || {};
  
  const importantScripts = ['build', 'start', 'dev'];
  importantScripts.forEach(script => {
    const exists = scripts[script] ? '✅' : '❌';
    console.log(`${exists} ${script}: ${scripts[script] || 'Missing'}`);
  });
}

// Check for common problematic files
console.log('\n4. File Checks:');
const filesToCheck = [
  'next.config.js',
  'middleware.ts',
  'utils/supabase/client.ts',
  'utils/auth-context.tsx'
];

filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${file}: ${exists ? 'Found' : 'Missing'}`);
});

console.log('\n5. Common Issues to Check:');
console.log('- Navbar skeleton loading: Check auth context loading state');
console.log('- Sign out not working: Check global sign out and storage clearing');
console.log('- Subscription not saving: Check webhook processing and retry logic');
console.log('- Auth state issues: Check for debouncing and circuit breaker problems');

console.log('\n✅ Debug check complete!');