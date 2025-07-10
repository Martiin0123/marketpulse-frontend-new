import { createClient } from '@supabase/supabase-js'
import { 
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
  
  if (alertMessage.includes('LONG Entry')) {
    action = 'BUY';
    signalType = 'entry';
  } else if (alertMessage.includes('SHORT Entry')) {
    action = 'SELL';
    signalType = 'entry';
  } else if (alertMessage.includes('LONG Exit')) {
    action = 'CLOSE';
    signalType = 'exit';
    if (alertMessage.includes('MA Cross')) {
      exitReason = 'ma_cross';
    } else if (alertMessage.includes('Stop/Trailing')) {
      exitReason = 'stop_trailing';
    }
  } else if (alertMessage.includes('SHORT Exit')) {
    action = 'CLOSE';
    signalType = 'exit';
    if (alertMessage.includes('MA Cross')) {
      exitReason = 'ma_cross';
    } else if (alertMessage.includes('Stop/Trailing')) {
      exitReason = 'stop_trailing';
    }
  } else if (alertMessage.includes('BUY')) {
    action = 'BUY';
    signalType = 'entry';
  } else if (alertMessage.includes('SELL')) {
    action = 'SELL';
    signalType = 'entry';
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
        case 'BUY_CLOSED': return 0x00ff00; // Green (will be overridden by PnL)
        case 'SELL_CLOSED': return 0xff0000; // Red (will be overridden by PnL)
        default: return 0x0099ff; // Blue
      }
    };

    // Determine title and description based on action
    let title, description;
    switch (signal.action) {
      case 'BUY':
        title = `✅ ${signal.symbol} BUY opened`;
        description = '**BUY** order executed successfully';
        break;
      case 'SELL':
        title = `✅ ${signal.symbol} SELL opened`;
        description = '**SELL** order executed successfully';
        break;
      case 'BUY_CLOSED':
        title = `✅ ${signal.symbol} BUY closed`;
        description = '**BUY** position closed successfully';
        break;
      case 'SELL_CLOSED':
        title = `✅ ${signal.symbol} SELL closed`;
        description = '**SELL** position closed successfully';
        break;
      case 'CLOSE':
        title = `✅ ${signal.symbol} CLOSED`;
        description = '**Position closed** successfully';
        break;
      default:
        title = `✅ ${signal.symbol} ${signal.action}`;
        description = `**${signal.action}** executed successfully`;
    }

    const embed = {
      title: title,
      description: description,
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
        (signal.action === 'CLOSE' || signal.action === 'BUY_CLOSED' || signal.action === 'SELL_CLOSED')) {
      const pnlColor = signal.pnl_percentage >= 0 ? '🟢' : '🔴';
      const pnlSign = signal.pnl_percentage >= 0 ? '+' : '';
      embed.fields.push({
        name: `${pnlColor} P&L`,
        value: `${pnlSign}${signal.pnl_percentage.toFixed(2)}%`,
        inline: true
      });
      
      // Update embed color based on PnL for close actions
      if (signal.action === 'CLOSE' || signal.action === 'BUY_CLOSED' || signal.action === 'SELL_CLOSED') {
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
    let body;
    try {
      const rawBody = await request.text();
      console.log('📨 Raw request body:', rawBody);
      
      // Try to parse JSON, handle malformed JSON
      try {
        body = JSON.parse(rawBody);
        console.log('📨 Request body parsed successfully:', body);
      } catch (jsonError) {
        console.error('❌ JSON parse error:', jsonError.message);
        console.log('📨 Attempting to clean malformed JSON...');
        
        // Try to extract valid JSON from malformed content
        let cleanedJson = rawBody.trim();
        
        // Handle missing braces - add them if missing
        if (!cleanedJson.startsWith('{')) {
          cleanedJson = '{' + cleanedJson;
        }
        if (!cleanedJson.endsWith('}')) {
          // Remove trailing comma if present
          cleanedJson = cleanedJson.replace(/,\s*$/, '') + '}';
        }
        
        // Fix unquoted string values (like timestamps)
        cleanedJson = cleanedJson.replace(/:\s*([^",\{\}\[\]]+)(?=\s*[,}])/g, (match, value) => {
          // Don't quote numbers, booleans, or already quoted strings
          if (/^\d+$/.test(value) || value === 'true' || value === 'false' || value === 'null') {
            return match;
          }
          // Quote string values
          return ': "' + value + '"';
        });
        
        console.log('📨 Attempting to parse cleaned JSON:', cleanedJson);
        
        try {
          body = JSON.parse(cleanedJson);
          console.log('📨 Cleaned JSON parsed successfully:', body);
        } catch (cleanError) {
          console.error('❌ Failed to clean JSON:', cleanError.message);
          console.log('📨 Attempting to parse as text alert...');
          
          // Try to parse as text alert (Pine Script format)
          try {
            const textAlert = parseAIAlgorithmAlert(rawBody);
            if (textAlert.symbol && textAlert.action) {
              body = {
                alert_message: rawBody,
                ...textAlert
              };
              console.log('📨 Parsed as text alert:', body);
            } else {
              return new Response(JSON.stringify({ 
                error: 'No valid JSON or text alert found',
                details: 'Request body does not contain valid JSON or recognizable alert format',
                received: rawBody.substring(0, 200) + '...'
              }), { 
                status: 400,
                headers: headers
              });
            }
          } catch (textError) {
            console.error('❌ Failed to parse as text alert:', textError);
            return new Response(JSON.stringify({ 
              error: 'No valid JSON or text alert found',
              details: 'Request body does not contain valid JSON or recognizable alert format',
              received: rawBody.substring(0, 200) + '...'
            }), { 
              status: 400,
              headers: headers
            });
          }
        }
      }
    } catch (requestError) {
      console.error('❌ Error reading request body:', requestError);
      return new Response(JSON.stringify({ 
        error: 'Failed to read request body',
        details: requestError.message
      }), { 
        status: 400,
        headers: headers
      });
    }
    
    // Handle multiple alert formats
    console.log('🔍 About to parse signal data...');
    let signalData;
    try {
      // Validate that body is an object
      if (!body || typeof body !== 'object') {
        throw new Error('Request body must be a JSON object');
      }
      
      console.log('📨 Body keys:', Object.keys(body));
      
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
        details: parseError.message,
        receivedBody: body
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
      
      // Validate and parse timestamp
      let parsedDate;
      if (typeof timestamp === 'string') {
        // Handle string timestamps
        parsedDate = new Date(timestamp);
      } else if (typeof timestamp === 'number') {
        // Handle numeric timestamps (seconds or milliseconds)
        if (timestamp > 1000000000000) {
          // Likely milliseconds
          parsedDate = new Date(timestamp);
        } else {
          // Likely seconds
          parsedDate = new Date(timestamp * 1000);
        }
      } else {
        // Fallback to current time
        parsedDate = new Date();
      }
      
      // Validate the parsed date
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid timestamp format');
      }
      
      // Check for reasonable date range (not too far in past/future)
      const now = new Date();
      const diffYears = Math.abs(parsedDate.getFullYear() - now.getFullYear());
      if (diffYears > 10) {
        console.warn('⚠️ Timestamp seems unreasonable, using current time instead');
        parsedDate = new Date();
      }
      
      validTimestamp = parsedDate.toISOString();
      unixTimestamp = Math.floor(parsedDate.getTime() / 1000);
      
      console.log('📅 Timestamp parsed:', {
        original: timestamp,
        parsed: validTimestamp,
        unix: unixTimestamp
      });
      
    } catch (error) {
      console.error('❌ Timestamp parsing error:', error.message);
      console.log('📅 Using current timestamp as fallback');
      validTimestamp = new Date().toISOString();
      unixTimestamp = Math.floor(Date.now() / 1000);
    }

    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const discordFreeWebhookUrl = process.env.DISCORD_WEBHOOK_URL_FREE;
    
    // Simplified trade counter - skip database operations to avoid hanging
    let tradeCounter = 1;
    let isEveryFifthTrade = false;
    let dbErrorHint = null;

    console.log('🔍 Starting Bybit API calls...');
    
    // Proxy will fetch current price from Bybit
    console.log('📊 Price will be fetched from Bybit via proxy');

    let orderResult = null;
    let databaseResult = null;
    let signalSaved = true;

    // Handle direct BUY/SELL signals (no position management needed)
    if (signalType === 'direct' || signalType === 'entry') {
      console.log('🔄 Processing direct BUY/SELL signal...');
      console.log('🔍 Entering proxy API call section...');
      
      try {
        // Use proxy to execute the signal directly
        const signalPayload = {
          action: action, // BUY or SELL
          symbol: bybitSymbol
          // Price will be fetched from Bybit by proxy
        };

        console.log('📤 Submitting direct signal to proxy:', signalPayload);
        console.log('🔑 Proxy secret available:', !!process.env.PROXY_APP_SECRET);
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
          
          const response = await fetch('https://primescope-tradeapi-production.up.railway.app/place-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.PROXY_APP_SECRET}`
            },
            body: JSON.stringify(signalPayload),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          console.log('📡 Proxy response status:', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Direct signal failed: ${response.status} ${response.statusText} - ${errorText}`);
          }

          orderResult = await response.json();
          console.log('📥 Direct signal response:', JSON.stringify(orderResult, null, 2));
        } catch (fetchError) {
          console.error('❌ Error calling proxy API:', fetchError);
          throw new Error(`Proxy API call failed: ${fetchError.message}`);
        }

        // Use the actual action from Bybit proxy response
        const actionTaken = orderResult.action || action;
        let pnlPercentage = null;
        
        // Handle database operations based on proxy response
        try {
          // Check what action the proxy actually took
          const actionTaken = orderResult.action_taken || 'unknown';
          const actionDescription = orderResult.action_description || '';
          
          console.log('📊 Proxy response analysis:', {
            action_taken: actionTaken,
            action_description: actionDescription
          });
          
                    if (actionTaken === 'closed_position') {
            // Proxy closed a position - update existing signal
            console.log('🔍 Looking for active signal to close for symbol:', symbol.toUpperCase());
            
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

            if (findError) {
              console.error('❌ Error finding active signal:', findError);
            }

            if (originalSignal) {
              console.log('✅ Found active signal to close:', {
                id: originalSignal.id,
                symbol: originalSignal.symbol,
                type: originalSignal.type,
                entry_price: originalSignal.entry_price,
                created_at: originalSignal.created_at
              });
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

              console.log('✅ Updated original signal with exit:', {
                entry_price: entryPrice,
                exit_price: exitPrice,
                pnl_percentage: pnlPercentage,
                reason: 'direct_signal'
              });
            } else {
              console.log('⚠️ No active signal found to close for symbol:', symbol.toUpperCase());
            }
          } else if (actionTaken === 'opened_buy' || actionTaken === 'opened_sell') {
            // Proxy opened a new position - create new signal
            const signalType = actionTaken === 'opened_buy' ? 'buy' : 'sell';
            const openExecutionPrice = orderResult.currentPrice || orderResult.order?.avgPrice || orderResult.order?.price || orderResult.avgPrice || 0;
            const { data: signal } = await supabase
              .from('signals')
              .insert([{
                symbol: symbol.toUpperCase(),
                type: signalType,
                entry_price: Number(openExecutionPrice),
                created_at: validTimestamp,
                strategy_name: 'Primescope Crypto',
                signal_source: 'ai_algorithm',
                exchange: 'bybit',
                status: 'active',
                order_id: orderResult.order?.orderId || orderResult.orderId || null,
                executed_at: validTimestamp
              }])
              .select()
              .single();

            databaseResult = signal;
            console.log('✅ Created new position signal:', signalType);
          } else if (actionTaken === 'reversed_to_buy' || actionTaken === 'reversed_to_sell') {
            // Proxy did a reversal - close existing position and create new one
            console.log('🔄 Processing reversal:', actionTaken);
            
            // First, close existing position
            let originalSignal = null;
            const { data: foundSignal } = await supabase
              .from('signals')
              .select('*')
              .eq('symbol', symbol.toUpperCase())
              .in('type', ['buy', 'sell'])
              .eq('status', 'active')
              .eq('exchange', 'bybit')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            originalSignal = foundSignal;

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

              // Update the existing signal with close data
              const { data: updatedSignal } = await supabase
                .from('signals')
                .update({
                  status: 'closed',
                  exit_price: exitPrice,
                  exit_timestamp: validTimestamp,
                  pnl_percentage: pnlPercentage,
                  exit_reason: 'signal_reversal'
                })
                .eq('id', originalSignal.id)
                .select()
                .single();

              console.log('✅ Updated existing signal with close data for reversal:', {
                signal_id: originalSignal.id,
                entry_price: entryPrice,
                exit_price: exitPrice,
                pnl_percentage: pnlPercentage
              });

              // Set databaseResult to the updated signal for Discord notification
              databaseResult = updatedSignal;
            }

            // Then create new position
            const signalType = actionTaken === 'reversed_to_buy' ? 'buy' : 'sell';
            const openExecutionPrice = orderResult.currentPrice || orderResult.order?.avgPrice || orderResult.order?.price || orderResult.avgPrice || 0;
            const { data: newSignal } = await supabase
              .from('signals')
              .insert([{
                symbol: symbol.toUpperCase(),
                type: signalType,
                entry_price: Number(openExecutionPrice),
                created_at: validTimestamp,
                strategy_name: 'Primescope Crypto',
                signal_source: 'ai_algorithm',
                exchange: 'bybit',
                status: 'active',
                order_id: orderResult.order?.orderId || orderResult.orderId || null,
                executed_at: validTimestamp
              }])
              .select()
              .single();

            console.log('✅ Created new position after reversal:', signalType);
            
            // For Discord notifications, we'll use the updated signal for the close message
            // and the new signal for the open message
            databaseResult = newSignal;
          } else if (actionTaken === 'ignored_signal') {
            console.log('ℹ️ Signal ignored - no action taken');
          }

          // Send Discord notification based on action_taken
          if (discordWebhookUrl) {
            const executionPrice = orderResult.currentPrice || orderResult.order?.avgPrice || orderResult.order?.price || orderResult.avgPrice || 0;
            
            switch (actionTaken) {
              case 'opened_buy':
                // Send "BUY opened" notification
                await sendSuccessDiscordNotification({
                  symbol: symbol.toUpperCase(),
                  action: 'BUY',
                  price: parseFloat(executionPrice),
                  timestamp: validTimestamp,
                  strategy_metadata: strategy_metadata,
                  pnl_percentage: null,
                  exitReason: null
                }, orderResult.order || orderResult, discordWebhookUrl);
                break;
                
              case 'opened_sell':
                // Send "SELL opened" notification
                await sendSuccessDiscordNotification({
                  symbol: symbol.toUpperCase(),
                  action: 'SELL',
                  price: parseFloat(executionPrice),
                  timestamp: validTimestamp,
                  strategy_metadata: strategy_metadata,
                  pnl_percentage: null,
                  exitReason: null
                }, orderResult.order || orderResult, discordWebhookUrl);
                break;
                
              case 'reversed_to_buy':
                // Send "SELL closed (xxx PnL)" then "BUY opened"
                // First, send close notification using the original signal data
                if (originalSignal) {
                  await sendSuccessDiscordNotification({
                    symbol: symbol.toUpperCase(),
                    action: 'SELL_CLOSED',
                    price: parseFloat(executionPrice),
                    timestamp: validTimestamp,
                    strategy_metadata: strategy_metadata,
                    pnl_percentage: pnlPercentage,
                    exitReason: 'signal_reversal'
                  }, orderResult.order || orderResult, discordWebhookUrl);
                }
                
                // Then send "BUY opened" notification
                await sendSuccessDiscordNotification({
                  symbol: symbol.toUpperCase(),
                  action: 'BUY',
                  price: parseFloat(executionPrice),
                  timestamp: validTimestamp,
                  strategy_metadata: strategy_metadata,
                  pnl_percentage: null,
                  exitReason: null
                }, orderResult.order || orderResult, discordWebhookUrl);
                break;
                
              case 'reversed_to_sell':
                // Send "BUY closed (xxx PnL)" then "SELL opened"
                // First, send close notification using the original signal data
                if (originalSignal) {
                  await sendSuccessDiscordNotification({
                    symbol: symbol.toUpperCase(),
                    action: 'BUY_CLOSED',
                    price: parseFloat(executionPrice),
                    timestamp: validTimestamp,
                    strategy_metadata: strategy_metadata,
                    pnl_percentage: pnlPercentage,
                    exitReason: 'signal_reversal'
                  }, orderResult.order || orderResult, discordWebhookUrl);
                }
                
                // Then send "SELL opened" notification
                await sendSuccessDiscordNotification({
                  symbol: symbol.toUpperCase(),
                  action: 'SELL',
                  price: parseFloat(executionPrice),
                  timestamp: validTimestamp,
                  strategy_metadata: strategy_metadata,
                  pnl_percentage: null,
                  exitReason: null
                }, orderResult.order || orderResult, discordWebhookUrl);
                break;
                
              case 'closed_position':
                // Send "BUY/SELL closed (xxx PnL)" notification
                const closedAction = originalSignal?.type === 'buy' ? 'BUY_CLOSED' : 'SELL_CLOSED';
                await sendSuccessDiscordNotification({
                  symbol: symbol.toUpperCase(),
                  action: closedAction,
                  price: parseFloat(executionPrice),
                  timestamp: validTimestamp,
                  strategy_metadata: strategy_metadata,
                  pnl_percentage: pnlPercentage,
                  exitReason: 'direct_signal'
                }, orderResult.order || orderResult, discordWebhookUrl);
                break;
                
              case 'ignored_signal':
                console.log('ℹ️ Signal ignored - no Discord notification sent');
                break;
            }
            
            // Send to free webhook if it's every 5th trade (only for new positions)
            if (isEveryFifthTrade && discordFreeWebhookUrl && (actionTaken === 'opened_buy' || actionTaken === 'opened_sell')) {
              await sendSuccessDiscordNotification({
                symbol: symbol.toUpperCase(),
                action: actionTaken === 'opened_buy' ? 'BUY' : 'SELL',
                price: parseFloat(executionPrice),
                timestamp: validTimestamp,
                strategy_metadata: strategy_metadata,
                pnl_percentage: null,
                exitReason: null
              }, orderResult.order || orderResult, discordFreeWebhookUrl, true);
            }

            // Send high-profit trades (>2%) to free webhook as teasers
            if (pnlPercentage > 2 && discordFreeWebhookUrl && (actionTaken === 'closed_position' || actionTaken === 'reversed_to_buy' || actionTaken === 'reversed_to_sell')) {
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
        console.log('🔍 Looking for active signal to close for CLOSE action:', symbol.toUpperCase());
        
        // First, let's see what signals exist for this symbol
        const { data: allSignalsForSymbol } = await supabase
          .from('signals')
          .select('*')
          .eq('symbol', symbol.toUpperCase())
          .order('created_at', { ascending: false });
        
        console.log('📊 All signals for symbol:', symbol.toUpperCase(), ':', allSignalsForSymbol?.length || 0);
        if (allSignalsForSymbol && allSignalsForSymbol.length > 0) {
          allSignalsForSymbol.slice(0, 3).forEach((sig, i) => {
            console.log(`  ${i + 1}. ${sig.symbol} ${sig.type} - Status: ${sig.status} - Exchange: ${sig.exchange}`);
          });
        }
        
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

        if (findError) {
          console.error('❌ Error finding active signal for CLOSE:', findError);
        }

        if (originalSignal) {
          console.log('✅ Found active signal to close for CLOSE action:', {
            id: originalSignal.id,
            symbol: originalSignal.symbol,
            type: originalSignal.type,
            entry_price: originalSignal.entry_price,
            created_at: originalSignal.created_at
          });
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
        } else {
          console.log('⚠️ No active signal found to close for CLOSE action:', symbol.toUpperCase());
          console.log('🔍 This might be a standalone close signal or the signal was already closed');
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