import { createClient } from '@supabase/supabase-js';

// Create Supabase client function
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl) {
    throw new Error('supabaseUrl is required.');
  }
  
  if (!supabaseKey) {
    throw new Error('supabaseKey is required.');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export interface ExchangeConfig {
  id: string;
  name: string;
  position_sizing_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Get exchange configuration by name
export async function getExchangeConfig(exchangeName: string): Promise<ExchangeConfig | null> {
  try {
    // Create a fresh Supabase client to avoid caching
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    });
    
    console.log('🔍 Fetching exchange config for:', exchangeName);
    
    // First, let's see all records for this exchange
    const { data: allRecords, error: listError } = await supabase
      .from('exchanges')
      .select('*')
      .eq('name', exchangeName);
    
    if (listError) {
      console.error('Error listing exchange records:', listError);
    } else {
      console.log('📋 All records for exchange:', exchangeName, ':', allRecords?.length || 0);
      allRecords?.forEach((record, i) => {
        console.log(`  ${i + 1}. ${record.name} - ${record.position_sizing_percentage}% - Active: ${record.is_active} - Updated: ${record.updated_at}`);
      });
    }
    
    // Now get the active one with cache busting
    const timestamp = Date.now();
    console.log('🕐 Query timestamp:', timestamp);
    
    const { data, error } = await supabase
      .from('exchanges')
      .select('*')
      .eq('name', exchangeName)
      .eq('is_active', true)
      .order('updated_at', { ascending: false }) // Get the most recently updated
      .limit(1)
      .single();
    
    if (error) {
      console.error('Error fetching exchange config:', error);
      return null;
    }
    
    console.log('📊 Retrieved exchange config from database:', {
      name: data?.name,
      position_sizing_percentage: data?.position_sizing_percentage,
      updated_at: data?.updated_at
    });
    
    return data;
  } catch (error) {
    console.error('Error in getExchangeConfig:', error);
    return null;
  }
}

// Update position sizing for an exchange
export async function updateExchangePositionSizing(
  exchangeName: string, 
  positionSizing: number
): Promise<boolean> {
  try {
    console.log('🔄 updateExchangePositionSizing called with:', { exchangeName, positionSizing });
    
    // Create a fresh Supabase client to avoid caching
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    });
    
    // Validate position sizing
    if (positionSizing < 0 || positionSizing > 100) {
      throw new Error('Position sizing must be between 0 and 100');
    }
    
    console.log('📤 Updating database with new sizing...');
    const { error } = await supabase
      .from('exchanges')
      .update({ 
        position_sizing_percentage: positionSizing,
        updated_at: new Date().toISOString()
      })
      .eq('name', exchangeName);
    
    if (error) {
      console.error('❌ Error updating exchange position sizing:', error);
      return false;
    }
    
    console.log(`✅ Updated position sizing for ${exchangeName} to ${positionSizing}%`);
    
    // Verify the update by fetching the record
    console.log('🔍 Verifying update by fetching record...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('exchanges')
      .select('*')
      .eq('name', exchangeName)
      .eq('is_active', true)
      .single();
    
    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
    } else {
      console.log('📊 Verification - Retrieved record:', {
        name: verifyData?.name,
        position_sizing_percentage: verifyData?.position_sizing_percentage,
        updated_at: verifyData?.updated_at
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error in updateExchangePositionSizing:', error);
    return false;
  }
}

// Get all active exchanges
export async function getAllActiveExchanges(): Promise<ExchangeConfig[]> {
  try {
    const supabase = createSupabaseClient();
    
    const { data, error } = await supabase
      .from('exchanges')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error fetching active exchanges:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getAllActiveExchanges:', error);
    return [];
  }
}

// Create new exchange configuration
export async function createExchangeConfig(
  name: string, 
  positionSizing: number = 5
): Promise<boolean> {
  try {
    const supabase = createSupabaseClient();
    
    const { error } = await supabase
      .from('exchanges')
      .insert({
        name: name.toLowerCase(),
        position_sizing_percentage: positionSizing,
        is_active: true
      });
    
    if (error) {
      console.error('Error creating exchange config:', error);
      return false;
    }
    
    console.log(`✅ Created exchange config for ${name} with ${positionSizing}% sizing`);
    return true;
  } catch (error) {
    console.error('Error in createExchangeConfig:', error);
    return false;
  }
} 