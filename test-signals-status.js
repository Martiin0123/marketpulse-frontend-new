require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkSignalsStatus() {
  console.log('🔍 Checking signals status in database...\n');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('❌ Supabase credentials not configured');
    return;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Get all signals
    const { data: signals, error } = await supabase
      .from('signals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.log('❌ Error fetching signals:', error.message);
      return;
    }

    console.log(`📊 Found ${signals.length} total signals\n`);

    // Group by status
    const statusCounts = {};
    const closedSignals = [];
    const activeSignals = [];
    const executedSignals = [];

    signals.forEach(signal => {
      const status = signal.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      if (status === 'closed') {
        closedSignals.push(signal);
      } else if (status === 'active') {
        activeSignals.push(signal);
      } else if (status === 'executed') {
        executedSignals.push(signal);
      }
    });

    console.log('📈 Status Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} signals`);
    });

    console.log('\n🔒 Closed Signals:');
    if (closedSignals.length === 0) {
      console.log('  No closed signals found');
    } else {
      closedSignals.slice(0, 5).forEach(signal => {
        console.log(`  ${signal.symbol} - ${signal.type} - Entry: $${signal.entry_price} - Exit: $${signal.exit_price} - PnL: ${signal.pnl_percentage?.toFixed(2)}%`);
      });
      if (closedSignals.length > 5) {
        console.log(`  ... and ${closedSignals.length - 5} more`);
      }
    }

    console.log('\n🟢 Active Signals:');
    if (activeSignals.length === 0) {
      console.log('  No active signals found');
    } else {
      activeSignals.slice(0, 5).forEach(signal => {
        console.log(`  ${signal.symbol} - ${signal.type} - Entry: $${signal.entry_price} - Created: ${new Date(signal.created_at).toLocaleString()}`);
      });
      if (activeSignals.length > 5) {
        console.log(`  ... and ${activeSignals.length - 5} more`);
      }
    }

    console.log('\n⚡ Executed Signals:');
    if (executedSignals.length === 0) {
      console.log('  No executed signals found');
    } else {
      executedSignals.slice(0, 5).forEach(signal => {
        console.log(`  ${signal.symbol} - ${signal.type} - Entry: $${signal.entry_price} - Executed: ${signal.executed_at ? new Date(signal.executed_at).toLocaleString() : 'N/A'}`);
      });
      if (executedSignals.length > 5) {
        console.log(`  ... and ${executedSignals.length - 5} more`);
      }
    }

    // Check for signals that should be closed but aren't
    console.log('\n🔍 Analysis:');
    const buySignals = signals.filter(s => s.type === 'buy');
    const closeSignals = signals.filter(s => s.type === 'close');
    
    console.log(`  Buy signals: ${buySignals.length}`);
    console.log(`  Close signals: ${closeSignals.length}`);
    console.log(`  Closed buy signals: ${buySignals.filter(s => s.status === 'closed').length}`);
    
    // Find buy signals that might need closing
    const activeBuySignals = buySignals.filter(s => s.status === 'active');
    if (activeBuySignals.length > 0) {
      console.log(`\n⚠️  Active buy signals that might need closing:`);
      activeBuySignals.forEach(signal => {
        console.log(`  ${signal.symbol} - Entry: $${signal.entry_price} - Created: ${new Date(signal.created_at).toLocaleString()}`);
      });
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

checkSignalsStatus(); 