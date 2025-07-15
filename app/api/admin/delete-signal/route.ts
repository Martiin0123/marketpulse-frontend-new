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
    const { signalId, password } = await request.json();
    
    // Validate admin password
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      return NextResponse.json({ error: 'Admin access not configured' }, { status: 500 });
    }
    
    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate required fields
    if (!signalId) {
      return NextResponse.json({ 
        error: 'Missing required field: signalId' 
      }, { status: 400 });
    }
    
    console.log('🔍 Admin deleting signal:', signalId);
    
    // Delete signal from database
    const supabase = createSupabaseClient();
    
    const { error: deleteError } = await supabase
      .from('signals')
      .delete()
      .eq('id', signalId);
    
    if (deleteError) {
      console.error('❌ Error deleting signal:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete signal',
        details: deleteError.message
      }, { status: 500 });
    }
    
    console.log('✅ Signal deleted successfully:', signalId);
    
    return NextResponse.json({
      success: true,
      message: 'Signal deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting signal:', error);
    return NextResponse.json({ 
      error: 'Failed to delete signal',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 