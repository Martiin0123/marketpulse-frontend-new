interface TradingSignal {
  symbol: string;
  action: 'BUY' | 'SELL';
  price: number;
  timestamp: string;
  timeframe?: string;
  confidence?: number;
  description?: string;
}

interface RefundRequestData {
  requestId: string;
  userId: string;
  month: string;
  refundAmount: number;
  performance: number;
  signals: number;
  winRate: string;
}

interface DiscordWebhookData {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: DiscordField[];
  timestamp?: string;
  footer?: DiscordFooter;
  thumbnail?: DiscordThumbnail;
}

interface DiscordField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordFooter {
  text: string;
  icon_url?: string;
}

interface DiscordThumbnail {
  url: string;
}

export async function sendTradingSignalToDiscord(signal: TradingSignal, webhookUrl: string) {
  try {
    // Validate webhook URL
    if (!webhookUrl || !webhookUrl.includes('discord.com/api/webhooks/')) {
      console.error('❌ Invalid Discord webhook URL');
      return false;
    }

    // Create Discord embed
    const embed: DiscordEmbed = {
      title: `🔔 Trading Signal: ${signal.symbol}`,
      description: signal.description || `New ${signal.action} signal for ${signal.symbol}`,
      color: signal.action === 'BUY' ? 0x00ff00 : 0xff0000, // Green for BUY, Red for SELL
      fields: [
        {
          name: 'Action',
          value: signal.action,
          inline: true
        },
        {
          name: 'Symbol',
          value: signal.symbol,
          inline: true
        },
        {
          name: 'Price',
          value: `$${signal.price.toFixed(2)}`,
          inline: true
        }
      ],
      timestamp: signal.timestamp,
      footer: {
        text: 'MarketPulse Trading Signals'
      }
    };

    // Add optional fields
    if (signal.timeframe) {
      embed.fields?.push({
        name: 'Timeframe',
        value: signal.timeframe,
        inline: true
      });
    }

    if (signal.confidence) {
      embed.fields?.push({
        name: 'Confidence',
        value: `${signal.confidence}%`,
        inline: true
      });
    }

    // Create webhook payload
    const webhookData: DiscordWebhookData = {
      username: 'MarketPulse Trading Bot',
      avatar_url: 'https://marketpulse.com/logo.png', // Replace with your logo URL
      embeds: [embed]
    };

    console.log('📡 Sending trading signal to Discord:', {
      symbol: signal.symbol,
      action: signal.action,
      price: signal.price,
      webhookUrl: webhookUrl.substring(0, 50) + '...'
    });

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

    console.log('✅ Trading signal sent to Discord successfully');
    return true;

  } catch (error: any) {
    console.error('❌ Error sending trading signal to Discord:', error);
    console.error('🔍 Error details:', {
      message: error.message,
      status: error.status,
      response: error.response
    });
    return false;
  }
}

export async function sendRefundRequestToDiscord(data: RefundRequestData, webhookUrl: string) {
  try {
    // Validate webhook URL
    if (!webhookUrl || !webhookUrl.includes('discord.com/api/webhooks/')) {
      console.error('❌ Invalid Discord webhook URL for refunds');
      return false;
    }

    // Create Discord embed for refund request
    const embed: DiscordEmbed = {
      title: '💰 No Loss Guarantee Refund Request',
      description: `New refund request submitted for no loss guarantee`,
      color: 0xffa500, // Orange color for refund requests
      fields: [
        {
          name: 'Request ID',
          value: data.requestId,
          inline: true
        },
        {
          name: 'User ID',
          value: data.userId,
          inline: true
        },
        {
          name: 'Month',
          value: data.month,
          inline: true
        },
        {
          name: 'Refund Amount',
          value: `$${data.refundAmount.toFixed(2)}`,
          inline: true
        },
        {
          name: 'Performance',
          value: `$${data.performance.toFixed(2)}`,
          inline: true
        },
        {
          name: 'Signals',
          value: data.signals.toString(),
          inline: true
        },
        {
          name: 'Win Rate',
          value: `${data.winRate}%`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'MarketPulse No Loss Guarantee'
      }
    };

    // Create webhook payload
    const webhookData: DiscordWebhookData = {
      username: 'MarketPulse Refund Bot',
      avatar_url: 'https://marketpulse.com/logo.png', // Replace with your logo URL
      embeds: [embed]
    };

    console.log('📡 Sending refund request to Discord:', {
      requestId: data.requestId,
      userId: data.userId,
      refundAmount: data.refundAmount,
      webhookUrl: webhookUrl.substring(0, 50) + '...'
    });

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

    console.log('✅ Refund request sent to Discord successfully');
    return true;

  } catch (error: any) {
    console.error('❌ Error sending refund request to Discord:', error);
    console.error('🔍 Error details:', {
      message: error.message,
      status: error.status,
      response: error.response
    });
    return false;
  }
}
