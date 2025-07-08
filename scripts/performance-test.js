#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function performanceTest() {
  console.log('🚀 Starting performance test...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  
  // Enable request interception to monitor API calls
  await page.setRequestInterception(true);
  
  const requests = [];
  const authCalls = [];
  
  page.on('request', request => {
    const url = request.url();
    requests.push({
      url,
      method: request.method(),
      timestamp: Date.now()
    });
    
    // Track auth-related calls
    if (url.includes('auth') || url.includes('supabase')) {
      authCalls.push({
        url,
        method: request.method(),
        timestamp: Date.now()
      });
    }
    
    request.continue();
  });
  
  // Monitor console logs
  page.on('console', msg => {
    if (msg.text().includes('auth') || msg.text().includes('supabase')) {
      console.log('🔍 Console:', msg.text());
    }
  });
  
  try {
    // Test homepage
    console.log('📄 Testing homepage...');
    const startTime = Date.now();
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    const loadTime = Date.now() - startTime;
    
    console.log(`⏱️  Homepage load time: ${loadTime}ms`);
    console.log(`📊 Total requests: ${requests.length}`);
    console.log(`🔐 Auth calls: ${authCalls.length}`);
    
    // Test dashboard (if user is logged in)
    console.log('📊 Testing dashboard...');
    const dashboardStart = Date.now();
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
    const dashboardLoadTime = Date.now() - dashboardStart;
    
    console.log(`⏱️  Dashboard load time: ${dashboardLoadTime}ms`);
    
    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      homepage: {
        loadTime,
        totalRequests: requests.length,
        authCalls: authCalls.length
      },
      dashboard: {
        loadTime: dashboardLoadTime
      },
      requests: requests.slice(-20), // Last 20 requests
      authCalls
    };
    
    const reportPath = path.join(__dirname, '../performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('📈 Performance report saved to performance-report.json');
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
performanceTest().catch(console.error); 