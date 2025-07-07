require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fixSignalsExitPrices() {
  console.log('🔧 Fixing signals with null exit prices...\n');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('❌ Supabase credentials not configured');
    return;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Get signals with null exit prices
    const { data: signals, error } = await supabase
      .from('signals')
      .select('*')
      .is('exit_price', null)
      .eq('status', 'closed');

    if (error) {
      console.log('❌ Error fetching signals:', error.message);
      return;
    }

    console.log(`📊 Found ${signals.length} signals with null exit prices\n`);

    if (signals.length === 0) {
      console.log('✅ No signals need fixing');
      return;
    }

    // Fix each signal
    for (const signal of signals) {
      console.log(`🔧 Fixing signal ${signal.id} (${signal.symbol}):`);
      console.log(`  Entry price: $${signal.entry_price}`);
      console.log(`  PnL: ${signal.pnl_percentage}%`);
      
      // Set exit price to entry price for now (since we don't have the actual exit price)
      const exitPrice = signal.entry_price;
      const exitTimestamp = signal.exit_timestamp || new Date().toISOString();
      
      const { data: updatedSignal, error: updateError } = await supabase
        .from('signals')
        .update({
          exit_price: exitPrice,
          exit_timestamp: exitTimestamp
        })
        .eq('id', signal.id)
        .select()
        .single();

      if (updateError) {
        console.log(`  ❌ Error updating signal: ${updateError.message}`);
      } else {
        console.log(`  ✅ Updated signal - Exit price: $${exitPrice}`);
      }
    }

    console.log('\n✅ Finished fixing signals');

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

fixSignalsExitPrices(); 