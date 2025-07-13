import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Simple referral request API called');
    
    // Use server-side client that gets auth from cookies
    const supabase = createClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ No authenticated user:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('🔍 Processing referral request for user:', user.id);
    
    const { referralId, referral, user: requestUser } = await request.json();

    if (!referralId || !referral) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Send Discord webhook
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL_REFERRAL;
    
    if (!discordWebhookUrl) {
      console.error('❌ Discord webhook URL not configured');
      return NextResponse.json({ error: 'Discord webhook not configured' }, { status: 500 });
    }

    // Create Discord message
    const embed = {
      title: '💰 Referral Payment Request',
      description: 'A user has requested a referral to be paid',
      color: 0xFFD700, // Gold color
      fields: [
        {
          name: '👤 User',
          value: `${requestUser.full_name} (${requestUser.email})`,
          inline: true
        },
        {
          name: '🆔 User ID',
          value: requestUser.id,
          inline: true
        },
        {
          name: '💰 Referral Amount',
          value: `€${referral.reward_amount.toFixed(2)}`,
          inline: true
        },
        {
          name: '📊 Referral Details',
          value: `Code: ${referral.referral_code}\nCreated: ${new Date(referral.created_at).toLocaleDateString()}\nStatus: ${referral.status}`,
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'MarketPulse Referral System'
      }
    };

    const discordPayload = {
      embeds: [embed]
    };

    console.log('🔍 Sending Discord webhook:', discordWebhookUrl);
    console.log('🔍 Payload:', JSON.stringify(discordPayload, null, 2));

    const discordResponse = await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(discordPayload)
    });

    if (!discordResponse.ok) {
      console.error('❌ Discord webhook failed:', discordResponse.status, discordResponse.statusText);
      return NextResponse.json({ error: 'Failed to send Discord notification' }, { status: 500 });
    }

    console.log('✅ Discord webhook sent successfully');

    // Update referral status to "requested"
    try {
      const { error: updateError } = await supabase
        .from('referrals')
        .update({ status: 'requested' })
        .eq('id', referralId);

      if (updateError) {
        console.error('❌ Error updating referral status:', updateError);
        // Don't fail the request, just log the error
      } else {
        console.log('✅ Referral status updated to "requested"');
      }
    } catch (updateError) {
      console.error('❌ Error updating referral status:', updateError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Referral request sent successfully',
      updatedStatus: 'requested'
    });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 