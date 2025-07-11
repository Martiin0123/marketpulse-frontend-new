import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create admin client with service role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the user from the request (you might need to pass user ID or get from session)
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Error getting user:', userError);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('🔍 Creating referral code for user:', user.id);

    // Check if user already has a referral code
    const { data: existingCode, error: checkError } = await supabaseAdmin
      .from('referral_codes')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing code:', checkError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (existingCode) {
      console.log('✅ User already has referral code:', existingCode);
      return res.status(200).json({ referralCode: existingCode });
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
      const { data: existing } = await supabaseAdmin
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
      return res.status(500).json({ error: 'Could not generate unique code' });
    }

    // Insert the referral code
    const { data: newCode, error: insertError } = await supabaseAdmin
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
      return res.status(500).json({ error: 'Failed to create referral code' });
    }

    console.log('✅ Successfully created referral code:', newCode);
    return res.status(200).json({ referralCode: newCode });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 