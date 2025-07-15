// Strategy Alert Handler - Add this to your proxy code
async function handleStrategyAlert({ action, symbol, positionAfter, price }) {
  try {
    console.log('🔄 Processing strategy alert:', { action, symbol, positionAfter, price });
    
    // Initialize actions array at the beginning
    const actions = [];
    let finalOrder = null;
    
    // Check current position
    const currentPosition = await getBybitPosition(symbol);
    
    // Determine what needs to happen based on positionAfter
    let shouldHavePosition = null;
    if (positionAfter === 1) {
      shouldHavePosition = 'Buy';  // Should be long
    } else if (positionAfter === -1) {
      shouldHavePosition = 'Sell'; // Should be short
    } else if (positionAfter === 0) {
      shouldHavePosition = null;   // Should be flat (no position)
    }
    
    // Current state
    const hasPosition = currentPosition && parseFloat(currentPosition.size) > 0;
    const currentSide = hasPosition ? currentPosition.side : null;
    
    console.log('📊 Position analysis:', {
      hasPosition,
      currentSide,
      shouldHavePosition,
      positionAfter
    });
    
    // Handle position reversal logic
    if (hasPosition && shouldHavePosition && currentSide !== shouldHavePosition) {
      // Need to reverse position: Close current + Open new
      console.log('🔄 Reversing position:', currentSide, '→', shouldHavePosition);
      
      // 1. Close current position
      const closeResult = await closeBybitPosition(symbol);
      actions.push('CLOSE');
      console.log('✅ Closed existing position');
      
      // 2. Open new position in opposite direction
      const openResult = await placeBybitOrderWithDynamicSizing({
        symbol: symbol,
        side: shouldHavePosition,
        orderType: 'Market',
        category: 'linear',
        timeInForce: 'GoodTillCancel'
      });
      actions.push(shouldHavePosition.toUpperCase());
      finalOrder = openResult;
      console.log('✅ Opened new position:', shouldHavePosition);
      
    } else if (hasPosition && !shouldHavePosition) {
      // Close position (go flat)
      console.log('🔴 Closing position to go flat');
      
      const closeResult = await closeBybitPosition(symbol);
      actions.push('CLOSE');
      finalOrder = closeResult;
      console.log('✅ Closed position');
      
    } else if (!hasPosition && shouldHavePosition) {
      // Open new position
      console.log('🟢 Opening new position:', shouldHavePosition);
      
      const openResult = await placeBybitOrderWithDynamicSizing({
        symbol: symbol,
        side: shouldHavePosition,
        orderType: 'Market',
        category: 'linear',
        timeInForce: 'GoodTillCancel'
      });
      actions.push(shouldHavePosition.toUpperCase());
      finalOrder = openResult;
      console.log('✅ Opened new position');
      
    } else if (hasPosition && shouldHavePosition && currentSide === shouldHavePosition) {
      // Position already matches desired state
      console.log('ℹ️ Position already matches desired state');
      actions.push('NO_ACTION');
      
    } else {
      // No position and should stay flat
      console.log('ℹ️ No action needed - staying flat');
      actions.push('NO_ACTION');
    }
    
    return {
      success: true,
      message: 'Strategy alert processed successfully',
      actions: actions,
      order: finalOrder,
      positionAfter: positionAfter,
      symbol: symbol,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Strategy alert failed:', error);
    throw error;
  }
}

// Update your main handler to detect strategy alerts
// Add this to your existing route handler:

app.post('/place-order', async (req, res) => {
  try {
    const { action, symbol, positionAfter, alert_message, ...otherParams } = req.body;
    
    // Initialize actions array for all code paths
    let actions = [];
    let result = null;
    
    console.log('📨 Received order request:', { action, symbol, positionAfter, alert_message });
    
    // Check if this is a strategy alert (has positionAfter)
    if (positionAfter !== undefined) {
      console.log('📨 Received strategy alert');
      result = await handleStrategyAlert({
        action,
        symbol,
        positionAfter,
        price: req.body.price
      });
      return res.json(result);
    }
    
    // Handle TradingView alert messages
    if (alert_message) {
      console.log('📨 Processing TradingView alert:', alert_message);
      
      // Parse alert message to determine action
      let parsedAction = null;
      if (alert_message.includes('LONG Entry')) {
        parsedAction = 'BUY';
      } else if (alert_message.includes('SHORT Entry')) {
        parsedAction = 'SELL';
      } else if (alert_message.includes('LONG Exit') || alert_message.includes('SHORT Exit')) {
        parsedAction = 'CLOSE';
      }
      
      if (parsedAction) {
        console.log('🎯 Parsed action from alert:', parsedAction);
        
        if (parsedAction === 'CLOSE') {
          result = await closeBybitPosition(symbol);
          actions = ['CLOSE'];
        } else {
          result = await placeBybitOrderWithDynamicSizing({
            symbol,
            side: parsedAction === 'BUY' ? 'Buy' : 'Sell',
            orderType: 'Market',
            category: 'linear',
            timeInForce: 'GoodTillCancel'
          });
          actions = [parsedAction];
        }
        
        return res.json({
          success: true,
          message: `Bybit ${parsedAction.toLowerCase()} order submitted successfully`,
          order: result,
          actions: actions,
          alert_message: alert_message,
          timestamp: new Date().toISOString()
        });
      } else {
        // If we couldn't parse the alert message, return an error response
        console.log('⚠️ Could not parse alert message');
        return res.json({
          success: false,
          message: 'Could not parse TradingView alert message',
          actions: ['UNKNOWN_ALERT'],
          alert_message: alert_message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Handle regular BUY/SELL/CLOSE actions (your existing logic)
    if (action === 'BUY' || action === 'SELL') {
      result = await placeBybitOrderWithDynamicSizing({
        symbol,
        side: action === 'BUY' ? 'Buy' : 'Sell',
        orderType: 'Market',
        category: 'linear',
        timeInForce: 'GoodTillCancel'
      });
      
      actions = [action]; // Ensure actions is defined
      
      return res.json({
        success: true,
        message: `Bybit ${action.toLowerCase()} order submitted successfully`,
        order: result,
        actions: actions,
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === 'CLOSE') {
      result = await closeBybitPosition(symbol);
      actions = ['CLOSE']; // Ensure actions is defined
      
      return res.json({
        success: true,
        message: 'Bybit position closed successfully',
        order: result,
        actions: actions,
        timestamp: new Date().toISOString()
      });
    }
    
    // Handle other actions...
    if (!actions || actions.length === 0) {
      actions = ['UNKNOWN_ACTION']; // Ensure actions is defined for unknown actions
    }
    
    return res.json({
      success: false,
      message: 'Unknown action',
      actions: actions,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Order failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute order',
      details: error.message,
      symbol: req.body.symbol,
      action: req.body.action,
      currentPrice: req.body.price,
      actions: ['ERROR'], // Ensure actions is always defined
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = { handleStrategyAlert }; 