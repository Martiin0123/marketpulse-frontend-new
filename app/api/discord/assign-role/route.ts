import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUser, getSubscription } from '@/utils/supabase/queries';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const GUILD_ID = process.env.DISCORD_GUILD_ID!;

// Map subscription plans to Discord role IDs
const PLAN_TO_ROLE: Record<string, string> = {
  free: process.env.DISCORD_ROLE_FREE || '',
  pro: process.env.DISCORD_ROLE_PRO || '',
  premium: process.env.DISCORD_ROLE_PREMIUM || '',
  vip: process.env.DISCORD_ROLE_PREMIUM || '', // VIP users get premium role
};

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Get user's Discord ID from metadata
    const discordUserId = user.user_metadata?.discord_user_id;
    if (!discordUserId) {
      return NextResponse.json({ error: 'Discord account not connected' }, { status: 400 });
    }

    // Get user's subscription
    const subscription = await getSubscription(supabase);
    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 400 });
    }

    // Determine plan based on product name from subscription
    let plan = 'free';
    let productName = null;
    
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      // Get the product name from the subscription's price
      const { data: priceData } = await supabase
        .from('prices')
        .select(`
          products:product_id (
            name
          )
        `)
        .eq('id', subscription.price_id)
        .single();

      // Determine plan based on product name
      if (priceData?.products?.name) {
        productName = priceData.products.name;
        const productNameLower = productName.toLowerCase();
        if (productNameLower.includes('premium') || productNameLower.includes('vip')) {
          plan = 'premium';
        } else if (productNameLower.includes('pro')) {
          plan = 'pro';
        } else {
          plan = 'free';
        }
      }
      
      console.log('Plan determination from product name:', {
        productName: productName,
        plan,
        subscriptionStatus: subscription.status,
        priceId: subscription.price_id
      });
    }

    const roleId = PLAN_TO_ROLE[plan];
    if (!roleId) {
      return NextResponse.json({ error: 'No role configured for this plan' }, { status: 400 });
    }

    // Remove all existing roles first
    for (const [planName, roleId] of Object.entries(PLAN_TO_ROLE)) {
      if (roleId) {
        try {
          await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${discordUserId}/roles/${roleId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bot ${BOT_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });
        } catch (error) {
          console.warn(`Failed to remove role ${planName}:`, error);
        }
      }
    }

    // Assign the new role
    const response = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${discordUserId}/roles/${roleId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to assign Discord role:', errorText);
      return NextResponse.json({ error: 'Failed to assign Discord role' }, { status: 500 });
    }



  } catch (error) {
    console.error('Error assigning Discord role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 