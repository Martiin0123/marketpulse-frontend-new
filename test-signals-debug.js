const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugSignals() {
  try {
    console.log('🔍 Checking signals in database...');
    
    const { data: signals, error } = await supabase
      .from('signals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching signals:', error);
      return;
    }

    console.log(`📊 Found ${signals.length} signals:`);
    
    if (signals.length === 0) {
      console.log('📭 No signals found in database');
      return;
    }

    signals.forEach((signal, index) => {
      console.log(`\n${index + 1}. Signal ID: ${signal.id}`);
      console.log(`   Symbol: ${signal.symbol}`);
      console.log(`   Type: ${signal.type}`);
      console.log(`   Status: ${signal.status}`);
      console.log(`   Entry Price: $${signal.entry_price}`);
      console.log(`   Exit Price: ${signal.exit_price ? '$' + signal.exit_price : 'N/A'}`);
      console.log(`   P&L %: ${signal.pnl_percentage !== null ? signal.pnl_percentage + '%' : 'N/A'}`);
      console.log(`   Exchange: ${signal.exchange}`);
      console.log(`   Created: ${signal.created_at}`);
      console.log(`   Exit Timestamp: ${signal.exit_timestamp || 'N/A'}`);
    });

    // Summary statistics
    const buySignals = signals.filter(s => s.type === 'buy');
    const sellSignals = signals.filter(s => s.type === 'sell');
    const closeSignals = signals.filter(s => s.type === 'close');
    const activeSignals = signals.filter(s => s.status === 'active');
    const closedSignals = signals.filter(s => s.status === 'closed');
    const completedTrades = signals.filter(s => 
      s.type === 'buy' && s.status === 'closed' && s.pnl_percentage !== null
    );

    console.log('\n📈 Summary:');
    console.log(`   Total Signals: ${signals.length}`);
    console.log(`   Buy Signals: ${buySignals.length}`);
    console.log(`   Sell Signals: ${sellSignals.length}`);
    console.log(`   Close Signals: ${closeSignals.length}`);
    console.log(`   Active Signals: ${activeSignals.length}`);
    console.log(`   Closed Signals: ${closedSignals.length}`);
    console.log(`   Completed Trades: ${completedTrades.length}`);

    if (completedTrades.length > 0) {
      const totalPnL = completedTrades.reduce((sum, s) => sum + (s.pnl_percentage || 0), 0);
      const avgPnL = totalPnL / completedTrades.length;
      const winningTrades = completedTrades.filter(s => (s.pnl_percentage || 0) > 0);
      const winRate = (winningTrades.length / completedTrades.length) * 100;
      
      console.log(`   Total P&L: ${totalPnL.toFixed(2)}%`);
      console.log(`   Average P&L: ${avgPnL.toFixed(2)}%`);
      console.log(`   Win Rate: ${winRate.toFixed(1)}%`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugSignals(); 