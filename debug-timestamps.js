require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function debugTimestamps() {
  console.log('🔍 Debugging timestamp values...\n');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('❌ Supabase credentials not configured');
    return;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Get closed Bybit signals
    const { data: signals, error } = await supabase
      .from('signals')
      .select('*')
      .eq('status', 'closed')
      .eq('exchange', 'bybit')
      .not('exit_timestamp', 'is', null)
      .order('exit_timestamp', { ascending: false });

    if (error) {
      console.log('❌ Error fetching signals:', error.message);
      return;
    }

    console.log(`📊 Found ${signals.length} closed Bybit signals\n`);

    signals.forEach((signal, index) => {
      console.log(`Signal ${index + 1}:`);
      console.log(`  Symbol: ${signal.symbol}`);
      console.log(`  Exit timestamp (raw): ${signal.exit_timestamp}`);
      console.log(`  Exit timestamp (Date object): ${new Date(signal.exit_timestamp)}`);
      console.log(`  Exit timestamp (getTime): ${new Date(signal.exit_timestamp).getTime()}`);
      console.log(`  Exit timestamp (ISO): ${new Date(signal.exit_timestamp).toISOString()}`);
      console.log(`  PnL: ${signal.pnl_percentage}%`);
      console.log('');
    });

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

debugTimestamps(); 