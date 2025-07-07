require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test Discord refund notification
async function testDiscordRefundNotification() {
  console.log('🧪 Testing Discord Refund Notification...\n');

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL_REFUNDS;
  
  if (!webhookUrl) {
    console.log('❌ DISCORD_WEBHOOK_URL_REFUNDS not set in environment variables');
    return;
  }

  try {
    const refundData = {
      requestId: 'TEST-REFUND-001',
      userId: 'test-user-123',
      month: '2025-01',
      refundAmount: 150.00,
      performance: -150.00,
      signals: 25,
      winRate: '32.0'
    };

    const embed = {
      title: '💰 No Loss Guarantee Refund Request',
      description: `New refund request submitted for no loss guarantee`,
      color: 0xffa500,
      fields: [
        { name: 'Request ID', value: refundData.requestId, inline: true },
        { name: 'User ID', value: refundData.userId, inline: true },
        { name: 'Month', value: refundData.month, inline: true },
        { name: 'Refund Amount', value: `$${refundData.refundAmount.toFixed(2)}`, inline: true },
        { name: 'Performance', value: `$${refundData.performance.toFixed(2)}`, inline: true },
        { name: 'Signals', value: refundData.signals.toString(), inline: true },
        { name: 'Win Rate', value: `${refundData.winRate}%`, inline: true }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'MarketPulse No Loss Guarantee' }
    };

    const webhookData = {
      username: 'MarketPulse Refund Bot',
      avatar_url: 'https://marketpulse.com/logo.png',
      embeds: [embed]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookData)
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status}`);
    }

    console.log('✅ Discord refund notification test successful!');

  } catch (error) {
    console.error('❌ Discord refund notification test failed:', error);
  }
}

async function testPerformanceGuarantee() {
  console.log('🧪 Testing No Loss Guarantee with Signals...\n');

  try {
    // Test the no loss guarantee API endpoint
    const response = await fetch('http://localhost:3000/api/performance-guarantee', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    console.log('📊 No Loss Guarantee Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.performance) {
      console.log('\n✅ Performance calculation successful!');
      console.log(`📈 Total P&L: $${data.performance.totalPnL.toFixed(2)}`);
      console.log(`📊 Total Signals: ${data.performance.totalPositions}`);
      console.log(`🎯 Profitable Signals: ${data.performance.profitablePositions}`);
      console.log(`📅 Period: ${data.performance.effectiveStartDate} to ${data.performance.effectiveEndDate}`);
      console.log(`🔑 Month Key: ${data.performance.monthKey}`);
      console.log(`⏰ Period Ended: ${data.performance.isPeriodEnded}`);
      console.log(`💰 Eligible for Refund: ${data.isEligible}`);
      console.log(`💵 Refund Amount: $${data.refundAmount.toFixed(2)}`);
    } else {
      console.log('\n❌ No performance data found');
      console.log('This could mean:');
      console.log('- No active subscription');
      console.log('- No closed signals in the period');
      console.log('- User not authenticated');
    }

  } catch (error) {
    console.error('❌ Error testing no loss guarantee:', error);
  }
}

// Check if we're in a browser environment
if (typeof window === 'undefined') {
  testPerformanceGuarantee();
  testDiscordRefundNotification();
} else {
  console.log('This script should be run in Node.js environment');
} 