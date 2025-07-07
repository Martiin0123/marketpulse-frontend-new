import { createClient } from '@supabase/supabase-js';
import { addFollowerToWhitelist, removeFollowerFromWhitelist, getWhitelistStatus } from '@/utils/bybit/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


// Send Discord notification for whitelist request
async function sendDiscordNotification(whitelistData) {
  try {
    if (!process.env.DISCORD_WEBHOOK_URL_WHITELIST) {
      console.error('❌ Discord webhook URL not configured');
      return false;
    }

    const embed = {
      title: '🎯 New VIP Whitelist Request',
      description: 'A VIP user has submitted their Bybit UID for whitelist access',
      color: 0x8b5cf6, // Purple color
      fields: [
        {
          name: '👤 User Information',
          value: `**Name:** ${whitelistData.userName}\n**Email:** ${whitelistData.userEmail}\n**User ID:** ${whitelistData.userId}`,
          inline: false
        },
        {
          name: '🔢 Bybit UID',
          value: `\`${whitelistData.bybitUid}\``,
          inline: true
        },
        {
          name: '📅 Submitted At',
          value: new Date().toLocaleString('en-US', {
            timeZone: 'UTC',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          inline: true
        },
        {
          name: '⚡ Action Required',
          value: 'Please add this user to the Bybit whitelist for automatic trading access',
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'MarketPulse VIP Whitelist System'
      }
    };

    const response = await fetch(process.env.DISCORD_WEBHOOK_URL_WHITELIST, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed]
      })
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status}`);
    }

    console.log('✅ Discord notification sent for whitelist request');
    return true;
  } catch (error) {
    console.error('❌ Error sending Discord notification:', error);
    return false;
  }
}

// Get whitelist status for a user
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameter: userId'
      }), { status: 400 });
    }
    
    // Validate that the user ID is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid user ID format'
      }), { status: 400 });
    }
    
    // Get user's whitelist request status
    const { data: whitelistRequest, error } = await supabase
      .from('whitelist_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch whitelist status',
        details: error.message
      }), { status: 500 });
    }
    
    return new Response(JSON.stringify({ 
      hasRequest: !!whitelistRequest,
      request: whitelistRequest || null
    }), { status: 200 });
    
  } catch (error) {
    console.error('Error fetching whitelist status:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message
    }), { status: 500 });
  }
}

// Add user to whitelist
export async function POST(request) {
  try {
    const body = await request.json();
    const { bybitUid, userId, userEmail, userName } = body;
    
    if (!bybitUid || !userId || !userEmail) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: bybitUid, userId, userEmail'
      }), { status: 400 });
    }

    // Validate Bybit UID format (should be numeric, 8-10 digits)
    const uidRegex = /^\d{8,10}$/;
    if (!uidRegex.test(bybitUid)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid Bybit UID format. Please enter a valid 8-10 digit numeric UID.'
      }), { status: 400 });
    }
    
    // Validate that the user ID is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid user ID format'
      }), { status: 400 });
    }

    // Check if user already has a pending or approved whitelist request
    const { data: existingRequest, error: checkError } = await supabase
      .from('whitelist_requests')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'approved'])
      .single();
    
    if (existingRequest) {
      return new Response(JSON.stringify({ 
        error: existingRequest.status === 'approved' 
          ? 'You are already whitelisted for automatic trading access'
          : 'You already have a pending whitelist request. Please wait for approval.'
      }), { status: 409 });
    }
    
    // Create whitelist request in database
    const { data: whitelistRequest, error: requestError } = await supabase
      .from('whitelist_requests')
      .insert([{
        user_id: userId,
        bybit_uid: bybitUid,
        user_email: userEmail,
        user_name: userName,
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (requestError) {
      console.error('Database error creating whitelist request:', requestError);
      return new Response(JSON.stringify({ 
        error: 'Failed to create whitelist request',
        details: requestError.message
      }), { status: 500 });
    }
    
    // Send Discord notification
    const discordSent = await sendDiscordNotification({
      bybitUid,
      userId,
      userEmail,
      userName
    });
    
    console.log('✅ Whitelist request created:', {
      requestId: whitelistRequest.id,
      userId,
      bybitUid,
      discordSent
    });
    
    return new Response(JSON.stringify({ 
      message: 'Whitelist request submitted successfully',
      requestId: whitelistRequest.id,
      status: 'pending',
      discordNotification: discordSent ? 'sent' : 'failed'
    }), { status: 201 });
    
  } catch (error) {
    console.error('Error creating whitelist request:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message
    }), { status: 500 });
  }
}

// Approve whitelist request
export async function PUT(request) {
  try {
    const body = await request.json();
    const { requestId, leaderId, followerId, approve = true } = body;
    
    if (!requestId) {
      return new Response(JSON.stringify({ 
        error: 'Missing required field: requestId'
      }), { status: 400 });
    }
    
    if (approve) {
      // Add user to whitelist
      try {
        await addFollowerToWhitelist(leaderId, followerId);
        
        // Update request status
        const { error: updateError } = await supabase
          .from('whitelist_requests')
          .update({ 
            status: 'approved',
            approved_at: new Date().toISOString()
          })
          .eq('id', requestId);
        
        if (updateError) {
          throw updateError;
        }
        
        // Log the approval
        await supabase
          .from('whitelist_actions')
          .insert([{
            leader_id: leaderId,
            follower_id: followerId,
            action: 'approved',
            request_id: requestId,
            created_at: new Date().toISOString()
          }]);
        
        console.log('✅ Whitelist request approved:', { requestId, leaderId, followerId });
        
        return new Response(JSON.stringify({ 
          message: 'Whitelist request approved successfully',
          requestId,
          leaderId,
          followerId,
          status: 'approved'
        }), { status: 200 });
        
      } catch (error) {
        console.error('Error approving whitelist request:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to approve whitelist request',
          details: error.message
        }), { status: 500 });
      }
    } else {
      // Reject request
      const { error: updateError } = await supabase
        .from('whitelist_requests')
        .update({ 
          status: 'rejected',
          rejected_at: new Date().toISOString()
        })
        .eq('id', requestId);
      
      if (updateError) {
        return new Response(JSON.stringify({ 
          error: 'Failed to reject whitelist request',
          details: updateError.message
        }), { status: 500 });
      }
      
      console.log('❌ Whitelist request rejected:', { requestId });
      
      return new Response(JSON.stringify({ 
        message: 'Whitelist request rejected successfully',
        requestId,
        status: 'rejected'
      }), { status: 200 });
    }
    
  } catch (error) {
    console.error('Error updating whitelist request:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message
    }), { status: 500 });
  }
}

// Remove user from whitelist
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const leaderId = searchParams.get('leaderId');
    const followerId = searchParams.get('followerId');
    
    if (!leaderId || !followerId) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameters: leaderId, followerId'
      }), { status: 400 });
    }
    
    // Remove from whitelist
    await removeFollowerFromWhitelist(leaderId, followerId);
    
    // Log the removal
    await supabase
      .from('whitelist_actions')
      .insert([{
        leader_id: leaderId,
        follower_id: followerId,
        action: 'removed',
        created_at: new Date().toISOString()
      }]);
    
    console.log('✅ User removed from whitelist:', { leaderId, followerId });
    
    return new Response(JSON.stringify({ 
      message: 'User removed from whitelist successfully',
      leaderId,
      followerId
    }), { status: 200 });
    
  } catch (error) {
    console.error('Error removing user from whitelist:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message
    }), { status: 500 });
  }
} 