import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Simple referral code creation API called');
    
    // Use server-side client that gets auth from cookies
    const supabase = createClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ No authenticated user:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('🔍 Creating referral code for user:', user.id);
    
    // Check if user already has a referral code
    const { data: existingCodes, error: checkError } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', user.id);
    
    if (checkError) {
      console.error('❌ Error checking existing code:', checkError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    
    if (existingCodes && existingCodes.length > 0) {
      console.log('✅ User already has referral code:', existingCodes[0]);
      return NextResponse.json({ referralCode: existingCodes[0] });
    }
    
    // Generate a simple referral code
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    
    let referralCode = generateCode();
    let attempts = 0;
    let isUnique = false;
    
    // Ensure code is unique
    while (!isUnique && attempts < 10) {
      const { data: existing } = await supabase
        .from('referral_codes')
        .select('id')
        .eq('code', referralCode)
        .single();
      
      if (!existing) {
        isUnique = true;
      } else {
        referralCode = generateCode();
        attempts++;
      }
    }
    
    if (!isUnique) {
      console.error('❌ Could not generate unique referral code');
      return NextResponse.json({ error: 'Could not generate unique code' }, { status: 500 });
    }
    
    // Insert the referral code
    const { data: newCode, error: insertError } = await supabase
      .from('referral_codes')
      .insert({
        user_id: user.id,
        code: referralCode,
        is_active: true,
        clicks: 0,
        conversions: 0
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Error creating referral code:', insertError);
      return NextResponse.json({ error: 'Failed to create referral code' }, { status: 500 });
    }
    
    console.log('✅ Successfully created referral code:', newCode);
    return NextResponse.json({ referralCode: newCode });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}