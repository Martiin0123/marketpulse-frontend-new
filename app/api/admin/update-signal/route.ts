import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: NextRequest) {
  try {
    const { signalId, updates, password } = await request.json();
    
    // Validate admin password
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      return NextResponse.json({ error: 'Admin access not configured' }, { status: 500 });
    }
    
    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate required fields
    if (!signalId || !updates) {
      return NextResponse.json({ 
        error: 'Missing required fields: signalId, updates' 
      }, { status: 400 });
    }
    
    console.log('🔍 Admin updating signal:', signalId, updates);
    
    // Update signal in database
    const supabase = createSupabaseClient();
    
    const { data: signal, error: updateError } = await supabase
      .from('signals')
      .update(updates)
      .eq('id', signalId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error updating signal:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update signal',
        details: updateError.message
      }, { status: 500 });
    }
    
    console.log('✅ Signal updated successfully:', signalId);
    
    return NextResponse.json({
      success: true,
      message: 'Signal updated successfully',
      signal: signal
    });
    
  } catch (error) {
    console.error('❌ Error updating signal:', error);
    return NextResponse.json({ 
      error: 'Failed to update signal',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 