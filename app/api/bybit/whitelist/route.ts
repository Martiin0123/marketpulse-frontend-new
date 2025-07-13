import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const supabase = createClient();

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user is requesting their own data
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if user has VIP subscription using the correct subscription checking logic
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select(`
        status,
        prices:price_id (
          products:product_id (
            name
          )
        )
      `)
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('created', { ascending: false });

    if (subscriptionError) {
      console.error('Subscription check error:', subscriptionError);
      return NextResponse.json({ error: 'Failed to check subscription' }, { status: 500 });
    }

    // Check if user has VIP subscription based on product name
    const isVIP = subscriptions && subscriptions.length > 0 && 
      (subscriptions[0].prices?.products?.name?.toLowerCase().includes('vip') || 
       subscriptions[0].prices?.products?.name?.toLowerCase().includes('automatic'));

    if (!isVIP) {
      return NextResponse.json({ error: 'VIP subscription required' }, { status: 403 });
    }

    // Create admin client for bypassing RLS
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get existing whitelist request
    const { data: existingRequest, error: requestError } = await supabaseAdmin
      .from('whitelist_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (requestError && requestError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching whitelist request:', requestError);
      return NextResponse.json({ error: 'Failed to fetch request' }, { status: 500 });
    }

    return NextResponse.json({ request: existingRequest || null });
  } catch (error) {
    console.error('Whitelist GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has VIP subscription using the correct subscription checking logic
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select(`
        status,
        prices:price_id (
          products:product_id (
            name
          )
        )
      `)
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('created', { ascending: false });

    if (subscriptionError) {
      console.error('Subscription check error:', subscriptionError);
      return NextResponse.json({ error: 'Failed to check subscription' }, { status: 500 });
    }

    // Check if user has VIP subscription based on product name
    const isVIP = subscriptions && subscriptions.length > 0 && 
      (subscriptions[0].prices?.products?.name?.toLowerCase().includes('vip') || 
       subscriptions[0].prices?.products?.name?.toLowerCase().includes('automatic'));

    if (!isVIP) {
      return NextResponse.json({ error: 'VIP subscription required' }, { status: 403 });
    }

    const { bybitUid, userEmail, userName } = await request.json();

    if (!bybitUid || !userEmail) {
      return NextResponse.json({ error: 'Bybit UID and email required' }, { status: 400 });
    }

    // Create admin client for bypassing RLS
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user already has a pending or approved request
    const { data: existingRequest, error: existingError } = await supabaseAdmin
      .from('whitelist_requests')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'approved'])
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing request:', existingError);
      return NextResponse.json({ error: 'Failed to check existing request' }, { status: 500 });
    }

    if (existingRequest) {
      return NextResponse.json({ 
        error: existingRequest.status === 'approved' 
          ? 'You are already whitelisted' 
          : 'You already have a pending whitelist request' 
      }, { status: 400 });
    }

    // Create new whitelist request using admin client
    const { data: newRequest, error: insertError } = await supabaseAdmin
      .from('whitelist_requests')
      .insert({
        user_id: user.id,
        bybit_uid: bybitUid,
        user_email: userEmail,
        user_name: userName,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating whitelist request:', insertError);
      return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
    }

    // Send Discord notification
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL_WHITELIST;
    
    if (discordWebhookUrl) {
      try {
        const webhookData = {
          embeds: [{
            title: '🎯 New VIP Whitelist Request',
            color: 0x8B5CF6, // Purple
            fields: [
              {
                name: '👤 User',
                value: `${userName || 'Unknown'} (${userEmail})`,
                inline: true
              },
              {
                name: '🆔 Bybit UID',
                value: bybitUid,
                inline: true
              },
              {
                name: '📅 Request Date',
                value: new Date().toLocaleString(),
                inline: true
              },
              {
                name: '💎 VIP Plan',
                value: subscriptions[0].prices?.products?.name || 'Unknown',
                inline: true
              }
            ],
            footer: {
              text: 'VIP Whitelist System'
            },
            timestamp: new Date().toISOString()
          }]
        };

        await fetch(discordWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookData)
        });
      } catch (webhookError) {
        console.error('Discord webhook error:', webhookError);
        // Don't fail the request if webhook fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      requestId: newRequest.id,
      message: 'Whitelist request submitted successfully' 
    });
  } catch (error) {
    console.error('Whitelist POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 