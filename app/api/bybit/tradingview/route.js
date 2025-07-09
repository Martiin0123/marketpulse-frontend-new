import { createClient } from '@supabase/supabase-js'
import { 
  submitBybitOrderWithDynamicSizing,
  closeBybitPosition, 
  convertSymbolFormat
} from '@/utils/bybit/client'

// Create Supabase client function to avoid module-level initialization
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl) {
    throw new Error('supabaseUrl is required.')
  }
  
  if (!supabaseKey) {
    throw new Error('supabaseKey is required.')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

// Helper function to manually close a signal (for testing)
async function closeSignalManually(signalId, exitPrice, exitReason = 'manual') {
  try {
    const supabase = createSupabaseClient()
    const { data: signal, error: fetchError } = await supabase
      .from('signals')
      .select('*')
      .eq('id', signalId)
      .single()

    if (fetchError || !signal) {
      throw new Error(`Signal not found: ${signalId}`);
    }

    if (signal.status === 'closed') {
      throw new Error(`Signal already closed: ${signalId}`);
    }

    const entryPrice = Number(signal.entry_price)
    const exitPriceNum = Number(exitPrice)
    const pnlPercentage = ((exitPriceNum - entryPrice) / entryPrice) * 100

    const { data: updatedSignal, error: updateError } = await supabase
      .from('signals')
      .update({
        status: 'closed',
        exit_price: exitPriceNum,
        exit_timestamp: new Date().toISOString(),
        pnl_percentage: pnlPercentage,
        exit_reason: exitReason
      })
      .eq('id', signalId)
      .select()
      .single()

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Manually closed signal:', {
      signal_id: signalId,
      symbol: signal.symbol,
      entry_price: entryPrice,
      exit_price: exitPriceNum,
      pnl_percentage: pnlPercentage
    });

    return updatedSignal;
  } catch (error) {
    console.error('❌ Error manually closing signal:', error);
    throw error;
  }
}

// Parse Pine Script alert message to extract signal data
function parseAIAlgorithmAlert(alertMessage) {
  console.log('🔍 Parsing Pine Script alert for Bybit:', alertMessage);
  
  // Extract symbol from alert message
  // Format: "Primescope LONG Entry! Symbol: SOLUSDT" 
  // OR simplified: "BTCUSD BUY" or "SOLUSDT SELL"
  const symbolMatch = alertMessage.match(/Symbol:\s*([A-Z]+)/);
  
  let symbol = symbolMatch ? symbolMatch[1] : null;
  
  // Handle simplified format: "BTCUSD BUY" or "SOLUSDT SELL"
  if (!symbol) {
    const words = alertMessage.trim().split(/\s+/);
    if (words.length >= 2) {
      symbol = words[0];
      const actionWord = words[1].toUpperCase();
      if (actionWord === 'BUY' || actionWord === 'SELL' || actionWord === 'LONG' || actionWord === 'SHORT') {
        // We'll determine action below
      }
    }
  }
  
  // Determine action based on alert message
  let action = null;
  let signalType = null;
  let exitReason = null;
  
  if (alertMessage.includes('LONG Entry') || alertMessage.includes('BUY') || alertMessage.includes('LONG')) {
    action = 'BUY';
    signalType = 'entry';
  } else if (alertMessage.includes('SHORT Entry') || alertMessage.includes('SELL') || alertMessage.includes('SHORT')) {
    action = 'SELL';
    signalType = 'entry';
  } else if (alertMessage.includes('LONG Exit') || alertMessage.includes('SHORT Exit')) {
    action = 'CLOSE';
    signalType = 'exit';
    if (alertMessage.includes('MA Cross')) {
      exitReason = 'ma_cross';
    } else if (alertMessage.includes('Stop/Trailing')) {
      exitReason = 'stop_trailing';
    }
  }
  
    console.log('📊 Parsed signal data:', {
    symbol,
    action,
    signalType,
    exitReason
  });

  return {
    symbol,
    action,
    signalType,
    exitReason,
    originalMessage: alertMessage
  };
}

// Send success Discord notification
async function sendSuccessDiscordNotification(signal, orderDetails, webhookUrl, isEveryFifthTrade = false) {
  try {
    if (!webhookUrl || !webhookUrl.includes('discord.com/api/webhooks/')) {
      console.error('❌ Invalid Discord webhook URL');
      return false;
    }

    const getColor = (action) => {
      switch (action.toUpperCase()) {
        case 'BUY': return 0x00ff00; // Green
        case 'SELL': return 0xff0000; // Red
        case 'CLOSE': return 0xffa500; // Orange
        default: return 0x0099ff; // Blue
      }
    };

    const embed = {
      title: `✅ ${signal.symbol} ${signal.action}${signal.action === 'CLOSE' ? 'D' : ''}`,
      description: `**${signal.action}** ${signal.action === 'CLOSE' ? 'position closed' : 'order executed'} successfully`,
      color: getColor(signal.action),
      fields: [
        {
          name: '🎯 Action',
          value: signal.action,
          inline: true
        },
        {
          name: '📈 Symbol', 
          value: signal.symbol,
          inline: true
        },
        {
          name: '💰 Execution Price',
          value: `$${signal.price.toFixed(2)}`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: isEveryFifthTrade ? 'Primescope Crypto Strategy - Bybit (Free Tier)' : 'Primescope Crypto Strategy - Bybit'
      }
    };

    // Add technical indicators if available
    if (signal.strategy_metadata) {
      const techFields = [];
      
      if (signal.strategy_metadata.rsi_value) {
        techFields.push({
          name: '📊 RSI',
          value: signal.strategy_metadata.rsi_value.toFixed(2),
          inline: true
        });
      }
      
      if (signal.strategy_metadata.smoothing_ma) {
        techFields.push({
          name: '📈 MA',
          value: signal.strategy_metadata.smoothing_ma.toFixed(2),
          inline: true
        });
      }

      if (techFields.length > 0) {
        embed.fields.push(...techFields);
      }
    }

    // Add exit reason if available
    if (signal.exitReason) {
      embed.fields.push({
        name: '🚪 Exit Reason',
        value: signal.exitReason.replace('_', ' ').toUpperCase(),
        inline: true
      });
    }
    
    // Add PnL if available (for CLOSE signals or strategy reversals)
    if (signal.pnl_percentage !== null && signal.pnl_percentage !== undefined && 
        (signal.action === 'CLOSE' || signal.action.includes('CLOSE'))) {
      const pnlColor = signal.pnl_percentage >= 0 ? '🟢' : '🔴';
      const pnlSign = signal.pnl_percentage >= 0 ? '+' : '';
      embed.fields.push({
        name: `${pnlColor} P&L`,
        value: `${pnlSign}${signal.pnl_percentage.toFixed(2)}%`,
        inline: true
      });
      
      // Update embed color based on PnL for close actions
      if (signal.action === 'CLOSE' || signal.action.startsWith('CLOSE')) {
        if (signal.pnl_percentage >= 0) {
          embed.color = 0x00ff00; // Green for profit
        } else {
          embed.color = 0xff0000; // Red for loss
        }
      }
    }

    const webhookData = {
      username: isEveryFifthTrade ? 'Primescope Free Trading Bot' : 'Primescope Bybit Trading Bot',
      avatar_url: 'https://primescope.com/logo.png',
      embeds: [embed]
    };

    console.log(`📡 Sending success notification to Discord${isEveryFifthTrade ? ' (Free Tier)' : ''}:`, {
      symbol: signal.symbol,
      action: signal.action,
      price: signal.price,
      orderId: orderDetails.orderId
    });

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

    console.log(`✅ Success notification sent to Discord${isEveryFifthTrade ? ' (Free Tier)' : ''}`);
    return true;

  } catch (error) {
    console.error(`❌ Error sending success notification to Discord${isEveryFifthTrade ? ' (Free Tier)' : ''}:`, error);
    return false;
  }
}

// Send profit teaser notification to free Discord webhook
async function sendProfitTeaserNotification(signal, orderDetails, webhookUrl) {
  try {
    if (!webhookUrl || !webhookUrl.includes('discord.com/api/webhooks/')) {
      console.error('❌ Invalid Discord webhook URL');
      return false;
    }

    const embed = {
      title: `🔥 PREMIUM ALERT: ${signal.symbol} Closed +${signal.pnl_percentage.toFixed(2)}%`,
      description: `**Premium subscribers just secured a ${signal.pnl_percentage.toFixed(2)}% profit!** 💰\n\n*Want these winning signals? Upgrade to Premium!*`,
      color: 0x00ff00, // Green for profit
      fields: [
        {
          name: '📈 Symbol',
          value: signal.symbol,
          inline: true
        },
        {
          name: '💰 Exit Price',
          value: `$${signal.price.toFixed(2)}`,
          inline: true
        },
        {
          name: '🟢 Profit',
          value: `+${signal.pnl_percentage.toFixed(2)}%`,
          inline: true
        },
        {
          name: '🚀 Upgrade Now',
          value: '[**Get Premium Access**](https://primescope.com/pricing) and never miss another winning trade!',
          inline: false
        },
        {
          name: '✨ Premium Benefits',
          value: '• Real-time alerts\n• All winning trades\n• Advanced strategies\n• 24/7 signals',
          inline: false
        }
      ],
      thumbnail: {
        url: 'https://primescope.com/logo.png'
      },
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Primescope Premium Strategy - Upgrade to unlock all signals'
      }
    };

    const webhookData = {
      username: 'Primescope Premium Teaser',
      avatar_url: 'https://primescope.com/logo.png',
      embeds: [embed]
    };

    console.log('🎯 Sending profit teaser to free Discord:', {
      symbol: signal.symbol,
      pnl: signal.pnl_percentage,
      price: signal.price
    });

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

    console.log('✅ Profit teaser sent to free Discord');
    return true;

  } catch (error) {
    console.error('❌ Error sending profit teaser:', error);
    return false;
  }
}

// Send error Discord notification
async function sendErrorDiscordNotification(signal, error, webhookUrl) {
  try {
    if (!webhookUrl || !webhookUrl.includes('discord.com/api/webhooks/')) {
      console.error('❌ Invalid Discord webhook URL');
      return false;
    }

    const embed = {
      title: `❌ Bybit Order Failed: ${signal.symbol}`,
      description: `**${signal.action}** order failed on Bybit`,
      color: 0xff0000, // Red for error
      fields: [
        {
          name: '🎯 Action',
          value: signal.action,
          inline: true
        },
        {
          name: '📈 Symbol',
          value: signal.symbol,
          inline: true
        },
        {
          name: '💰 Price',
          value: `$${signal.price?.toFixed(2) || 'N/A'}`,
          inline: true
        },
        {
          name: '🏢 Exchange',
          value: 'Bybit',
          inline: true
        },
        {
          name: '❌ Error',
          value: error.message || 'Unknown error',
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Primescope Crypto Strategy - Bybit'
      }
    };

    const webhookData = {
      username: 'Primescope Bybit Trading Bot',
      avatar_url: 'https://primescope.com/logo.png',
      embeds: [embed]
    };

    console.log('📡 Sending error notification to Discord:', {
      symbol: signal.symbol,
      action: signal.action,
      error: error.message
    });

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

    console.log('✅ Error notification sent to Discord');
    return true;

  } catch (discordError) {
    console.error('❌ Error sending error notification to Discord:', discordError);
    return false;
  }
}

// Handle preflight requests
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Simple GET handler for testing accessibility
export async function GET(request) {
  return new Response(JSON.stringify({ 
    message: 'TradingView webhook endpoint is accessible',
    timestamp: new Date().toISOString(),
    endpoint: '/api/bybit/tradingview'
  }), {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    }
  });
}

export async function POST(request) {
  console.log('🚀 API endpoint hit: /api/bybit/tradingview');
  
  // Add CORS headers for external requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  try {
    // Create Supabase client
    const supabase = createSupabaseClient()
    
    // Check environment variables
    console.log('🔑 Environment check:', {
      hasBybitKey: !!process.env.BYBIT_API_KEY,
      hasBybitSecret: !!process.env.BYBIT_SECRET_KEY,
      bybitTestnet: process.env.BYBIT_TESTNET
    });
    
    console.log('📨 About to parse request body...');
    const body = await request.json();
    console.log('📨 Request body parsed successfully:', body);
    
    // Handle multiple alert formats
    console.log('🔍 About to parse signal data...');
    let signalData;
    try {
      if (body.alert_message) {
        // Parse Pine Script alert message (text format)
        console.log('📨 Parsing Pine Script alert message...');
        signalData = parseAIAlgorithmAlert(body.alert_message);
        console.log('📨 Received Pine Script alert for Bybit:', signalData);
      } else if (body.message) {
        // Parse JSON message from Pine Script alert() function
        console.log('📨 Parsing JSON message from Pine Script alert() function...');
        try {
          const parsedMessage = JSON.parse(body.message);
          signalData = {
            symbol: parsedMessage.symbol,
            action: parsedMessage.action?.toUpperCase(),
            quantity: parsedMessage.quantity || 1,
            strategy_metadata: parsedMessage.strategy_metadata || {},
            signalType: parsedMessage.signal_type || 'entry',
            exitReason: parsedMessage.exit_reason
          };
          console.log('📨 Parsed JSON message:', signalData);
        } catch (jsonError) {
          console.error('❌ Failed to parse JSON message:', jsonError);
          throw new Error('Invalid JSON in message field');
        }
      } else if (body.action) {
        // Parse direct BUY/SELL signals (no position management needed)
        console.log('📨 Parsing direct BUY/SELL signal...');
        signalData = {
          symbol: body.symbol,
          action: body.action?.toUpperCase(),
          quantity: body.quantity || 1,
          strategy_metadata: body.strategy_metadata || {},
          signalType: 'direct',
          exitReason: body.exit_reason
        };
        console.log('📨 Received direct signal:', signalData);
      } else {
        // Direct API call format
        console.log('📨 Using direct API call format...');
        signalData = {
          symbol: body.symbol,
          action: body.action?.toUpperCase(),
          quantity: body.quantity || 1,
          strategy_metadata: body.strategy_metadata || {},
          signalType: body.signal_type || 'entry',
          exitReason: body.exit_reason
        };
      }
    } catch (parseError) {
      console.error('❌ Error parsing signal data:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Failed to parse signal data',
        details: parseError.message
      }), { 
        status: 400,
        headers: headers
      });
    }

    console.log('🔍 Extracting signal data...');
    const { symbol, action, quantity = 1, strategy_metadata = {}, signalType = 'entry', exitReason } = signalData;
    console.log('📊 Extracted signal data:', { symbol, action, quantity, signalType, exitReason });

    if (!symbol || !action) {
      console.log('❌ Missing required fields:', { symbol, action });
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: symbol, action',
        received: body
      }), { 
        status: 400,
        headers: headers
      });
    }

    // Convert symbol format for Bybit (e.g., BTCUSD -> BTCUSDT)
    const bybitSymbol = convertSymbolFormat(symbol.toUpperCase(), true);
    
    // Parse and validate timestamp
    let validTimestamp;
    let unixTimestamp;
    try {
      const timestamp = body.timestamp || body.time || Date.now();
      if (typeof timestamp === 'string') {
        validTimestamp = new Date(timestamp).toISOString();
        unixTimestamp = Math.floor(new Date(timestamp).getTime() / 1000);
      } else {
        validTimestamp = new Date(Number(timestamp) * 1000).toISOString();
        unixTimestamp = Math.floor(Date.now() / 1000);
      }
      if (isNaN(new Date(validTimestamp).getTime())) {
        throw new Error('Invalid timestamp');
      }
    } catch (error) {
      validTimestamp = new Date().toISOString();
      unixTimestamp = Math.floor(Date.now() / 1000);
    }

    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const discordFreeWebhookUrl = process.env.DISCORD_WEBHOOK_URL_FREE;
    
    // Get trade counter from database or initialize (make it optional to avoid rate limits)
    let tradeCounter = 1;
    let isEveryFifthTrade = false;
    let dbErrorHint = null;
    try {
      const { data: counterData } = await supabase
        .from('trade_counter')
        .select('counter')
        .single();
      if (counterData) {
        tradeCounter = counterData.counter + 1;
      }
      // Update counter in database
      await supabase
        .from('trade_counter')
        .upsert({ id: 1, counter: tradeCounter, updated_at: new Date().toISOString() });
      isEveryFifthTrade = tradeCounter % 5 === 0;
      console.log(`📊 Trade counter: ${tradeCounter}${isEveryFifthTrade ? ' (5th trade - sending to both webhooks)' : ''}`);
    } catch (error) {
      dbErrorHint = '⚠️ Signal was NOT saved to the database due to rate limit or DB error.';
      console.log('⚠️ Could not get trade counter (rate limit?), using default:', error.message);
      // Don't fail the entire request if trade counter fails
    }

    console.log('🔍 Starting Bybit API calls...');
    
    // Proxy will fetch current price from Bybit
    console.log('📊 Price will be fetched from Bybit via proxy');

    let orderResult = null;
    let databaseResult = null;
    let signalSaved = true;

    // Handle direct BUY/SELL signals (no position management needed)
    if (signalType === 'direct') {
      console.log('🔄 Processing direct BUY/SELL signal...');
      
      try {
        // Use proxy to execute the signal directly
        const signalPayload = {
          action: action, // BUY or SELL
          symbol: bybitSymbol
          // Price will be fetched from Bybit by proxy
        };

        console.log('📤 Submitting direct signal to proxy:', signalPayload);
        
        const response = await fetch('https://primescope-tradeapi-production.up.railway.app/place-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.PROXY_APP_SECRET}`
          },
          body: JSON.stringify(signalPayload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Direct signal failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        orderResult = await response.json();
        console.log('📥 Direct signal response:', JSON.stringify(orderResult, null, 2));

        // Handle single action (no position management needed)
        const actionTaken = orderResult.action || action;
        let pnlPercentage = null;
        
        // Check if SELL should close an existing BUY position
        let shouldClosePosition = false;
        if (actionTaken === 'SELL') {
          // Check if there's an active BUY position to close
          const { data: activePosition } = await supabase
            .from('signals')
            .select('*')
            .eq('symbol', symbol.toUpperCase())
            .eq('type', 'buy')
            .eq('status', 'active')
            .eq('exchange', 'bybit')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
          if (activePosition) {
            shouldClosePosition = true;
            console.log('🔄 SELL signal will close existing BUY position');
          }
        }
        
        try {
          if (actionTaken === 'CLOSE' || shouldClosePosition) {
            // Find and update original signal
            const { data: originalSignal } = await supabase
              .from('signals')
              .select('*')
              .eq('symbol', symbol.toUpperCase())
              .in('type', ['buy', 'sell'])
              .eq('status', 'active')
              .eq('exchange', 'bybit')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (originalSignal) {
              const entryPrice = Number(originalSignal.entry_price);
              const executionPrice = orderResult.currentPrice || orderResult.order?.avgPrice || orderResult.order?.price || orderResult.avgPrice || 0;
              const exitPrice = Number(executionPrice);
              
              // Calculate PnL based on position side
              if (originalSignal.type === 'buy') {
                pnlPercentage = ((exitPrice - entryPrice) / entryPrice) * 100;
              } else if (originalSignal.type === 'sell') {
                pnlPercentage = ((entryPrice - exitPrice) / entryPrice) * 100;
              }

              await supabase
                .from('signals')
                .update({
                  status: 'closed',
                  exit_price: exitPrice,
                  exit_timestamp: validTimestamp,
                  pnl_percentage: pnlPercentage,
                  exit_reason: 'direct_signal'
                })
                .eq('id', originalSignal.id);

              console.log('✅ Updated original signal with direct signal exit:', {
                entry_price: entryPrice,
                exit_price: exitPrice,
                pnl_percentage: pnlPercentage
              });
            }

            // Create close signal record
            const closeExecutionPrice = orderResult.currentPrice || orderResult.order?.avgPrice || orderResult.order?.price || orderResult.avgPrice || 0;
            await supabase
              .from('signals')
              .insert([{
                symbol: symbol.toUpperCase(),
                type: 'close',
                entry_price: Number(closeExecutionPrice),
                created_at: validTimestamp,
                strategy_name: 'Primescope Crypto',
                signal_source: 'ai_algorithm',
                exchange: 'bybit',
                exit_reason: 'direct_signal',
                status: 'closed',
                rsi_value: strategy_metadata?.rsi_value || null,
                technical_metadata: strategy_metadata && Object.keys(strategy_metadata).length > 0 ? strategy_metadata : null
              }]);
          } else {
            // Create new position signal (BUY or SELL)
            const openExecutionPrice = orderResult.currentPrice || orderResult.order?.avgPrice || orderResult.order?.price || orderResult.avgPrice || 0;
            const { data: signal } = await supabase
              .from('signals')
              .insert([{
                symbol: symbol.toUpperCase(),
                type: actionTaken.toLowerCase(),
                entry_price: Number(openExecutionPrice),
                created_at: validTimestamp,
                strategy_name: 'Primescope Crypto',
                signal_source: 'ai_algorithm',
                exchange: 'bybit',
                status: 'active',
                rsi_value: strategy_metadata?.rsi_value || null,
                technical_metadata: strategy_metadata && Object.keys(strategy_metadata).length > 0 ? strategy_metadata : null
              }])
              .select()
              .single();

            databaseResult = signal;
            console.log('✅ Created new position signal:', actionTaken);
          }

          // Send Discord notification
          if (discordWebhookUrl) {
            const executionPrice = orderResult.currentPrice || orderResult.order?.avgPrice || orderResult.order?.price || orderResult.avgPrice || 0;
            
            // Use CLOSE action when closing positions, original action otherwise
            const displayAction = (actionTaken === 'CLOSE' || shouldClosePosition) ? 'CLOSE' : actionTaken;
            
            await sendSuccessDiscordNotification({
              symbol: symbol.toUpperCase(),
              action: displayAction,
              price: parseFloat(executionPrice),
              timestamp: validTimestamp,
              strategy_metadata: strategy_metadata,
              pnl_percentage: pnlPercentage,
              exitReason: (actionTaken === 'CLOSE' || shouldClosePosition) ? 'direct_signal' : null
            }, orderResult.order || orderResult, discordWebhookUrl);
            
            // Send to free webhook if it's every 5th trade
            if (isEveryFifthTrade && discordFreeWebhookUrl) {
              await sendSuccessDiscordNotification({
                symbol: symbol.toUpperCase(),
                action: displayAction,
                price: parseFloat(executionPrice),
                timestamp: validTimestamp,
                strategy_metadata: strategy_metadata,
                pnl_percentage: pnlPercentage,
                exitReason: (actionTaken === 'CLOSE' || shouldClosePosition) ? 'direct_signal' : null
              }, orderResult.order || orderResult, discordFreeWebhookUrl, true);
            }

            // Send high-profit trades (>2%) to free webhook as teasers
            if (pnlPercentage > 2 && discordFreeWebhookUrl) {
              console.log(`🎯 High-profit trade detected (${pnlPercentage.toFixed(2)}%), sending teaser to free webhook`);
              
              await sendProfitTeaserNotification({
                symbol: symbol.toUpperCase(),
                price: parseFloat(executionPrice),
                pnl_percentage: pnlPercentage,
                timestamp: validTimestamp
              }, orderResult.order || orderResult, discordFreeWebhookUrl);
            }
          }
        } catch (dbError) {
          console.error('❌ Database error for action:', actionTaken, dbError);
          signalSaved = false;
        }

        return new Response(JSON.stringify({
          message: 'Direct signal executed successfully',
          action_taken: actionTaken,
          order_id: orderResult.order?.orderId || orderResult.orderId,
          symbol: bybitSymbol,
          signal_id: databaseResult?.id || null,
          signalSaved
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (directError) {
        console.error('❌ Direct signal failed:', directError);
        
        if (discordWebhookUrl) {
          await sendErrorDiscordNotification({
            symbol: symbol.toUpperCase(),
            action: action,
            price: 0
          }, directError, discordWebhookUrl);
        }
        
        return new Response(JSON.stringify({
          error: 'Direct signal failed',
          details: directError.message
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Handle CLOSE action (exit signal from Pine Script)
    if (action.toUpperCase() === 'CLOSE') {
      console.log('📊 Submitting close position via proxy for:', bybitSymbol);
      
      try {
        // Submit close position order via proxy (handles position validation automatically)
        orderResult = await closeBybitPosition(bybitSymbol);
      } catch (closeError) {
        console.error('❌ Failed to close position:', closeError);
        
        if (discordWebhookUrl) {
          await sendErrorDiscordNotification({
            symbol: symbol.toUpperCase(),
            action: 'CLOSE',
            price: 0,
            dbErrorHint
          }, closeError, discordWebhookUrl);
        }
        
        return new Response(JSON.stringify({ 
          error: 'Failed to close position',
          details: closeError.message,
          symbol: bybitSymbol,
          dbErrorHint
        }), { 
          status: 400,
          headers: headers
        });
      }

      console.log('🔴 Bybit position close order submitted:', {
        symbol: bybitSymbol,
        qty: orderResult.order?.qty || 'N/A',
        order_id: orderResult.order?.orderId,
        status: orderResult.order?.status,
        exit_reason: exitReason
      });

      // Try to update database (but don't fail if it doesn't work)
      try {
        // Find and update the original signal with exit information (BUY or SELL)
        const { data: originalSignal, error: findError } = await supabase
          .from('signals')
          .select('*')
          .eq('symbol', symbol.toUpperCase())
          .in('type', ['buy', 'sell'])
          .eq('status', 'active')
          .eq('exchange', 'bybit')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (originalSignal) {
          const entryPrice = Number(originalSignal.entry_price);
          const executionPrice = orderResult.currentPrice || orderResult.order?.avgPrice || orderResult.order?.price || orderResult.avgPrice || 0;
          const exitPrice = Number(executionPrice);
          
          // Calculate PnL based on position type
          let pnlPercentage;
          if (originalSignal.type === 'buy') {
            pnlPercentage = ((exitPrice - entryPrice) / entryPrice) * 100;
          } else if (originalSignal.type === 'sell') {
            pnlPercentage = ((entryPrice - exitPrice) / entryPrice) * 100;
          } else {
            pnlPercentage = 0;
          }

          // Update the original signal with exit information
          const { data: updatedSignal, error: updateSignalError } = await supabase
            .from('signals')
            .update({
              status: 'closed',
              exit_price: exitPrice,
              exit_timestamp: validTimestamp,
              pnl_percentage: pnlPercentage,
              exit_reason: exitReason || 'ma_cross'
            })
            .eq('id', originalSignal.id)
            .select()
            .single();

          if (updateSignalError) {
            console.error('❌ Error updating original signal:', updateSignalError);
            signalSaved = false;
            dbErrorHint = '⚠️ Signal was NOT saved to the database due to rate limit or DB error.';
          } else {
            console.log('✅ Updated original signal with exit data:', {
              signal_id: originalSignal.id,
              entry_price: entryPrice,
              exit_price: exitPrice,
              pnl_percentage: pnlPercentage
            });
            databaseResult = updatedSignal;
          }
        }

        // Create close signal with Pine Script metadata
        const closeExecutionPrice = orderResult.currentPrice || orderResult.order?.avgPrice || orderResult.order?.price || orderResult.avgPrice || 0;
        const { data: signal, error: signalError } = await supabase
          .from('signals')
          .insert([{
            symbol: symbol.toUpperCase(),
            type: 'close',
            entry_price: Number(closeExecutionPrice),
            created_at: validTimestamp,
            strategy_name: 'Primescope Crypto',
            signal_source: 'ai_algorithm',
            exchange: 'bybit',
            exit_reason: exitReason || 'ma_cross',
            status: 'closed',
            rsi_value: strategy_metadata?.rsi_value || null,
            technical_metadata: strategy_metadata && Object.keys(strategy_metadata).length > 0 ? strategy_metadata : null
          }])
          .select()
          .single();
        if (signalError) {
          signalSaved = false;
          dbErrorHint = '⚠️ Signal was NOT saved to the database due to rate limit or DB error.';
        }

        // Send success Discord notification
        if (discordWebhookUrl) {
          // Use actual Bybit execution price and calculate PnL
          const executionPrice = orderResult.currentPrice || orderResult.order?.avgPrice || orderResult.order?.price || orderResult.avgPrice || 0;
          let pnlPercentage = null;
          
          // Calculate PnL if we have the original entry price
          if (databaseResult?.pnl_percentage !== undefined) {
            pnlPercentage = databaseResult.pnl_percentage;
          } else if (orderResult.closedPosition) {
            // Calculate from position data if available
            const entryPrice = parseFloat(orderResult.closedPosition.avgPrice || orderResult.closedPosition.entryPrice || 0);
            const exitPrice = parseFloat(executionPrice);
            const side = orderResult.closedPosition.side;
            
            if (entryPrice > 0 && exitPrice > 0) {
              if (side === 'Buy') {
                pnlPercentage = ((exitPrice - entryPrice) / entryPrice) * 100;
              } else if (side === 'Sell') {
                pnlPercentage = ((entryPrice - exitPrice) / entryPrice) * 100;
              }
            }
          }
          
          await sendSuccessDiscordNotification({
            symbol: symbol.toUpperCase(),
            action: orderResult.action || 'CLOSE', // Use proxy response action
            price: parseFloat(executionPrice),
            timestamp: validTimestamp,
            strategy_metadata: strategy_metadata,
            exitReason: exitReason,
            dbErrorHint,
            pnl_percentage: pnlPercentage
          }, orderResult.order || orderResult, discordWebhookUrl);
        }

        // Send high-profit trades (>2%) to free webhook as teasers
        if (pnlPercentage !== null && pnlPercentage > 2 && discordFreeWebhookUrl) {
          console.log(`🎯 High-profit trade detected (${pnlPercentage.toFixed(2)}%), sending teaser to free webhook`);
          
          await sendProfitTeaserNotification({
            symbol: symbol.toUpperCase(),
            price: parseFloat(executionPrice),
            pnl_percentage: pnlPercentage,
            timestamp: validTimestamp
          }, orderResult.order || orderResult, discordFreeWebhookUrl);
        }
        
        // Send to free webhook if it's every 5th trade
        if (isEveryFifthTrade && discordFreeWebhookUrl) {
          const executionPrice = orderResult.currentPrice || orderResult.order?.avgPrice || orderResult.order?.price || orderResult.avgPrice || 0;
          let pnlPercentage = null;
          
          if (databaseResult?.pnl_percentage !== undefined) {
            pnlPercentage = databaseResult.pnl_percentage;
          } else if (orderResult.closedPosition) {
            const entryPrice = parseFloat(orderResult.closedPosition.avgPrice || orderResult.closedPosition.entryPrice || 0);
            const exitPrice = parseFloat(executionPrice);
            const side = orderResult.closedPosition.side;
            
            if (entryPrice > 0 && exitPrice > 0) {
              if (side === 'Buy') {
                pnlPercentage = ((exitPrice - entryPrice) / entryPrice) * 100;
              } else if (side === 'Sell') {
                pnlPercentage = ((entryPrice - exitPrice) / entryPrice) * 100;
              }
            }
          }
          
          await sendSuccessDiscordNotification({
            symbol: symbol.toUpperCase(),
            action: orderResult.action || 'CLOSE', // Use proxy response action
            price: parseFloat(executionPrice),
            timestamp: validTimestamp,
            strategy_metadata: strategy_metadata,
            exitReason: exitReason,
            dbErrorHint,
            pnl_percentage: pnlPercentage
          }, orderResult.order || orderResult, discordFreeWebhookUrl, true);
        }

        return new Response(JSON.stringify({ 
          message: 'Bybit position close order submitted successfully',
          order_id: orderResult.order?.orderId,
          symbol: bybitSymbol,
          quantity: orderResult.order?.qty || 'N/A',
          signal_id: signal?.id,
          pnl_percentage: databaseResult?.pnl_percentage || null,
          exit_reason: exitReason,
          signalSaved,
          dbErrorHint
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (dbError) {
        console.error('❌ Database error (rate limit?), but order was successful:', dbError);
        signalSaved = false;
        dbErrorHint = '⚠️ Signal was NOT saved to the database due to rate limit or DB error.';
        // Return success even if database fails
        if (discordWebhookUrl) {
          const executionPrice = orderResult.order?.avgPrice || orderResult.order?.price || orderResult.avgPrice || currentPrice;
          
          await sendSuccessDiscordNotification({
            symbol: symbol.toUpperCase(),
            action: 'CLOSE',
            price: parseFloat(executionPrice),
            timestamp: validTimestamp,
            strategy_metadata: strategy_metadata,
            exitReason: exitReason,
            dbErrorHint,
            pnl_percentage: null
          }, orderResult.order || orderResult, discordWebhookUrl);
        }
        return new Response(JSON.stringify({ 
          message: 'Bybit position close order submitted successfully (database update failed)',
          order_id: orderResult.order?.orderId,
          symbol: bybitSymbol,
          quantity: orderResult.order?.qty || 'N/A',
          error: 'Database update failed due to rate limit',
          signalSaved,
          dbErrorHint
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Handle BUY/SELL action with dynamic position sizing
    if (action.toUpperCase() === 'BUY' || action.toUpperCase() === 'SELL') {
      const isBuy = action.toUpperCase() === 'BUY';

      console.log(`📊 Submitting ${isBuy ? 'BUY' : 'SELL'} order via proxy for:`, bybitSymbol);

      // 🧠 Submit order with dynamic position sizing via proxy (handles all validations automatically)
      try {
        orderResult = await submitBybitOrderWithDynamicSizing({
          symbol: bybitSymbol,
          side: isBuy ? 'Buy' : 'Sell',
          orderType: 'Market',
          category: 'linear',
          timeInForce: 'GoodTillCancel'
        });
      } catch (orderError) {
        console.error('❌ Failed to place order with dynamic sizing:', orderError);
        
        if (discordWebhookUrl) {
          await sendErrorDiscordNotification({
            symbol: symbol.toUpperCase(),
            action: isBuy ? 'BUY' : 'SELL',
            price: 0,
            dbErrorHint
          }, orderError, discordWebhookUrl);
        }
        
        return new Response(JSON.stringify({
          error: 'Failed to place order with dynamic sizing',
          details: orderError.message
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      console.log(`${isBuy ? '🟢 Buy' : '🔴 Sell'} order submitted:`, {
        symbol: bybitSymbol,
        qty: orderResult.qty || orderResult.calculatedQuantity,
        order_id: orderResult.orderId,
        status: orderResult.orderStatus,
        leverage: orderResult.leverage,
        riskPercent: orderResult.riskPercent
      });

      // Try to update database (but don't fail if it doesn't work)
      try {
        const executionPrice = orderResult.currentPrice || orderResult.avgPrice || orderResult.price || orderResult.order?.avgPrice || 0;
        const { data: signal, error: signalError } = await supabase
          .from('signals')
          .insert([{
            symbol: symbol.toUpperCase(),
            type: isBuy ? 'buy' : 'sell',
            entry_price: Number(executionPrice),
            created_at: validTimestamp,
            strategy_name: 'Primescope Crypto',
            signal_source: 'ai_algorithm',
            exchange: 'bybit',
            status: 'active',
            rsi_value: strategy_metadata.rsi_value,
            technical_metadata: strategy_metadata
          }])
          .select()
          .single();

        databaseResult = signal;
        if (signalError) {
          signalSaved = false;
          dbErrorHint = '⚠️ Signal was NOT saved to the database due to rate limit or DB error.';
          console.error('❌ Database insert error:', signalError);
        } else {
          signalSaved = true;
          console.log('✅ Signal saved to database:', signal?.id);
        }

        // Send success Discord notification
        if (discordWebhookUrl) {
          // Use actual Bybit execution price
          const executionPrice = orderResult.currentPrice || orderResult.avgPrice || orderResult.price || orderResult.order?.avgPrice || 0;
          
          await sendSuccessDiscordNotification({
            symbol: symbol.toUpperCase(),
            action: isBuy ? 'BUY' : 'SELL',
            price: parseFloat(executionPrice),
            timestamp: validTimestamp,
            quantity: orderResult.qty || orderResult.calculatedQuantity,
            strategy_metadata: strategy_metadata,
            dbErrorHint,
            pnl_percentage: null
          }, orderResult, discordWebhookUrl);
        }

        return new Response(JSON.stringify({
          message: `Bybit ${isBuy ? 'buy' : 'sell'} order submitted successfully`,
          order_id: orderResult.orderId,
          signal_id: signal?.id || null,
          symbol: bybitSymbol,
          entry_price: Number(executionPrice),
          rsi_value: strategy_metadata.rsi_value,
          signalSaved,
          dbErrorHint
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (dbError) {
        console.error('❌ Database error (rate limit?), but order was successful:', dbError);
        signalSaved = false;
        dbErrorHint = '⚠️ Signal was NOT saved to the database due to rate limit or DB error.';

        if (discordWebhookUrl) {
          const executionPrice = orderResult.currentPrice || orderResult.avgPrice || orderResult.price || orderResult.order?.avgPrice || 0;
          
          await sendSuccessDiscordNotification({
            symbol: symbol.toUpperCase(),
            action: isBuy ? 'BUY' : 'SELL',
            price: parseFloat(executionPrice),
            timestamp: validTimestamp,
            quantity: orderResult.qty || orderResult.calculatedQuantity,
            strategy_metadata: strategy_metadata,
            dbErrorHint,
            pnl_percentage: null
          }, orderResult, discordWebhookUrl);
        }

        return new Response(JSON.stringify({
          message: `Bybit ${isBuy ? 'buy' : 'sell'} order submitted successfully (database update failed)`,
          order_id: orderResult.orderId,
          symbol: bybitSymbol,
          entry_price: Number(executionPrice),
          error: 'Database update failed due to rate limit',
          signalSaved,
          dbErrorHint
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }



    return new Response(JSON.stringify({ 
      error: 'Invalid action. Must be BUY, SELL, or CLOSE',
      received: signalData
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Top-level error in POST handler:', error);
    return new Response(JSON.stringify({ 
      error: 'Unexpected error in POST handler',
      details: error.message,
      timestamp: new Date().toISOString()
    }), { 
      status: 500,
      headers: headers
    });
  }
} 