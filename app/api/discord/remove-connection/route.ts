import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Remove Discord connection API called');
    
    // Use server-side client that gets auth from cookies
    const supabase = createClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ No authenticated user:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('🔍 Removing Discord connection for user:', user.id);
    
    // Remove Discord connection by clearing the metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: { 
        discord_user_id: null, 
        discord_username: null 
      }
    });

    if (updateError) {
      console.error('❌ Failed to remove Discord connection:', updateError);
      return NextResponse.json({ 
        error: 'Failed to remove Discord connection' 
      }, { status: 500 });
    }

    console.log('✅ Successfully removed Discord connection for user:', user.id);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Discord connection removed successfully' 
    });

  } catch (error) {
    console.error('❌ Remove Discord connection error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 