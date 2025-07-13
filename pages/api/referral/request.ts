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

    // Get the user from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No authorization header');
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the token and get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('❌ Error getting user:', userError);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    const { pendingReferrals, referralId, referral, user: requestUser } = req.body;

    // Check if this is an individual referral request or bulk request
    let referralsToProcess = [];
    let isIndividualRequest = false;
    
    if (referralId && referral) {
      // Individual referral request
      referralsToProcess = [referral];
      isIndividualRequest = true;
    } else if (pendingReferrals && Array.isArray(pendingReferrals)) {
      // Bulk request (existing functionality)
      referralsToProcess = pendingReferrals;
    } else {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    // Send Discord webhook
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL_REFERRAL;
    
    if (!discordWebhookUrl) {
      console.error('❌ Discord webhook URL not configured');
      return res.status(500).json({ error: 'Discord webhook not configured' });
    }

    // Create Discord message
    const embed = {
      title: isIndividualRequest ? '🔔 Individual Referral Request' : '🔔 Bulk Referral Request',
      description: `A user has requested assistance with ${isIndividualRequest ? 'a' : 'pending'} referral${isIndividualRequest ? '' : 's'}`,
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
          name: '📊 Referrals',
          value: `${referralsToProcess.length} referral(s)`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'MarketPulse Referral System'
      }
    };

    // Add referral details
    if (referralsToProcess.length > 0) {
      const referralDetails = referralsToProcess.map((referral: any, index: number) => {
        return {
          name: `Referral ${index + 1}`,
          value: `Code: ${referral.referral_code}\nCreated: ${new Date(referral.created_at).toLocaleDateString()}`,
          inline: true
        };
      });

      embed.fields.push(...referralDetails);
    }

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
      return res.status(500).json({ error: 'Failed to send Discord notification' });
    }

    console.log('✅ Discord webhook sent successfully');

    // Update referral status to "requested" if this is an individual request
    if (isIndividualRequest && referralId) {
      try {
        const { error: updateError } = await supabaseAdmin
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
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Referral request sent successfully',
      updatedStatus: isIndividualRequest ? 'requested' : null
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 