require('dotenv').config();

async function testDiscordRefundNotification() {
  console.log('🧪 Testing Discord Refund Notification...\n');

  try {
    // Test data for refund request
    const refundData = {
      requestId: 'TEST-REFUND-001',
      userId: 'test-user-123',
      month: '2025-01',
      refundAmount: 150.00,
      performance: -150.00,
      signals: 25,
      winRate: '32.0'
    };

    // Test the Discord webhook URL
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL_REFUNDS;
    
    if (!webhookUrl) {
      console.log('❌ DISCORD_WEBHOOK_URL_REFUNDS not set in environment variables');
      console.log('Please add DISCORD_WEBHOOK_URL_REFUNDS to your .env file');
      return;
    }

    console.log('📡 Testing Discord webhook URL:', webhookUrl.substring(0, 50) + '...');

    // Create Discord embed for refund request
    const embed = {
      title: '💰 No Loss Guarantee Refund Request',
      description: `New refund request submitted for no loss guarantee`,
      color: 0xffa500, // Orange color for refund requests
      fields: [
        {
          name: 'Request ID',
          value: refundData.requestId,
          inline: true
        },
        {
          name: 'User ID',
          value: refundData.userId,
          inline: true
        },
        {
          name: 'Month',
          value: refundData.month,
          inline: true
        },
        {
          name: 'Refund Amount',
          value: `$${refundData.refundAmount.toFixed(2)}`,
          inline: true
        },
        {
          name: 'Performance',
          value: `$${refundData.performance.toFixed(2)}`,
          inline: true
        },
        {
          name: 'Signals',
          value: refundData.signals.toString(),
          inline: true
        },
        {
          name: 'Win Rate',
          value: `${refundData.winRate}%`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'MarketPulse No Loss Guarantee'
      }
    };

    // Create webhook payload
    const webhookData = {
      username: 'MarketPulse Refund Bot',
      avatar_url: 'https://marketpulse.com/logo.png',
      embeds: [embed]
    };

    console.log('📤 Sending test refund request to Discord...');

    // Send webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook failed: ${response.status} ${errorText}`);
    }

    console.log('✅ Test refund request sent to Discord successfully!');
    console.log('\n📊 Test Data Sent:');
    console.log(`   Request ID: ${refundData.requestId}`);
    console.log(`   User ID: ${refundData.userId}`);
    console.log(`   Month: ${refundData.month}`);
    console.log(`   Refund Amount: $${refundData.refundAmount.toFixed(2)}`);
    console.log(`   Performance: $${refundData.performance.toFixed(2)}`);
    console.log(`   Signals: ${refundData.signals}`);
    console.log(`   Win Rate: ${refundData.winRate}%`);

  } catch (error) {
    console.error('❌ Error testing Discord refund notification:', error);
    console.error('🔍 Error details:', {
      message: error.message,
      status: error.status,
      response: error.response
    });
  }
}

// Check if we're in a browser environment
if (typeof window === 'undefined') {
  testDiscordRefundNotification();
} else {
  console.log('This script should be run in Node.js environment');
} 