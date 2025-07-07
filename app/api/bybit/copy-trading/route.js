import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Get copy trading information
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const leaderId = searchParams.get('leaderId')
    
    if (leaderId) {
      // Get specific leader information
      const { data: leader, error } = await supabase
        .from('copy_trading_leaders')
        .select('*')
        .eq('leader_id', leaderId)
        .single()
      
      if (error) {
        return new Response(JSON.stringify({ 
          error: 'Leader not found',
          details: error.message
        }), { status: 404 })
      }
      
      return new Response(JSON.stringify({ 
        leader: leader
      }), { status: 200 })
    } else {
      // Get all available leaders
      const { data: leaders, error } = await supabase
        .from('copy_trading_leaders')
        .select('*')
        .eq('status', 'active')
        .order('total_pnl', { ascending: false })
      
      if (error) {
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch leaders',
          details: error.message
        }), { status: 500 })
      }
      
      return new Response(JSON.stringify({ 
        leaders: leaders
      }), { status: 200 })
    }
  } catch (error) {
    console.error('Error fetching copy trading data:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message
    }), { status: 500 })
  }
}

// Create copy trading relationship
export async function POST(request) {
  try {
    const body = await request.json()
    const { leaderId, followerId, copyAmount, copyRatio, riskLevel } = body
    
    if (!leaderId || !followerId || !copyAmount || !copyRatio) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: leaderId, followerId, copyAmount, copyRatio'
      }), { status: 400 })
    }
    
    // Validate copy amount and ratio
    if (parseFloat(copyAmount) <= 0) {
      return new Response(JSON.stringify({ 
        error: 'Copy amount must be greater than 0'
      }), { status: 400 })
    }
    
    if (parseFloat(copyRatio) <= 0 || parseFloat(copyRatio) > 1) {
      return new Response(JSON.stringify({ 
        error: 'Copy ratio must be between 0 and 1'
      }), { status: 400 })
    }
    
    // Check if leader exists and is active
    const { data: leader, error: leaderError } = await supabase
      .from('copy_trading_leaders')
      .select('*')
      .eq('leader_id', leaderId)
      .eq('status', 'active')
      .single()
    
    if (leaderError || !leader) {
      return new Response(JSON.stringify({ 
        error: 'Leader not found or inactive'
      }), { status: 404 })
    }
    
    // Check if relationship already exists
    const { data: existingRelationship, error: checkError } = await supabase
      .from('copy_trading_relationships')
      .select('*')
      .eq('leader_id', leaderId)
      .eq('follower_id', followerId)
      .single()
    
    if (existingRelationship) {
      return new Response(JSON.stringify({ 
        error: 'Copy trading relationship already exists'
      }), { status: 409 })
    }
    
    // Create copy trading relationship
    const { data: relationship, error: createError } = await supabase
      .from('copy_trading_relationships')
      .insert([{
        leader_id: leaderId,
        follower_id: followerId,
        copy_amount: copyAmount,
        copy_ratio: copyRatio,
        risk_level: riskLevel || 'medium',
        status: 'active',
        created_at: new Date().toISOString()
      }])
      .select()
      .single()
    
    if (createError) {
      return new Response(JSON.stringify({ 
        error: 'Failed to create copy trading relationship',
        details: createError.message
      }), { status: 500 })
    }
    
    console.log('✅ Copy trading relationship created:', {
      leaderId,
      followerId,
      copyAmount,
      copyRatio
    })
    
    return new Response(JSON.stringify({ 
      message: 'Copy trading relationship created successfully',
      relationship: relationship
    }), { status: 201 })
    
  } catch (error) {
    console.error('Error creating copy trading relationship:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message
    }), { status: 500 })
  }
}

// Update copy trading relationship
export async function PUT(request) {
  try {
    const body = await request.json()
    const { relationshipId, copyAmount, copyRatio, riskLevel, status } = body
    
    if (!relationshipId) {
      return new Response(JSON.stringify({ 
        error: 'Missing required field: relationshipId'
      }), { status: 400 })
    }
    
    const updateData = {}
    if (copyAmount !== undefined) updateData.copy_amount = copyAmount
    if (copyRatio !== undefined) updateData.copy_ratio = copyRatio
    if (riskLevel !== undefined) updateData.risk_level = riskLevel
    if (status !== undefined) updateData.status = status
    
    const { data: relationship, error } = await supabase
      .from('copy_trading_relationships')
      .update(updateData)
      .eq('id', relationshipId)
      .select()
      .single()
    
    if (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to update copy trading relationship',
        details: error.message
      }), { status: 500 })
    }
    
    console.log('✅ Copy trading relationship updated:', {
      relationshipId,
      updates: updateData
    })
    
    return new Response(JSON.stringify({ 
      message: 'Copy trading relationship updated successfully',
      relationship: relationship
    }), { status: 200 })
    
  } catch (error) {
    console.error('Error updating copy trading relationship:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message
    }), { status: 500 })
  }
}

// Delete copy trading relationship
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const relationshipId = searchParams.get('relationshipId')
    
    if (!relationshipId) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameter: relationshipId'
      }), { status: 400 })
    }
    
    const { error } = await supabase
      .from('copy_trading_relationships')
      .delete()
      .eq('id', relationshipId)
    
    if (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to delete copy trading relationship',
        details: error.message
      }), { status: 500 })
    }
    
    console.log('✅ Copy trading relationship deleted:', { relationshipId })
    
    return new Response(JSON.stringify({ 
      message: 'Copy trading relationship deleted successfully'
    }), { status: 200 })
    
  } catch (error) {
    console.error('Error deleting copy trading relationship:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message
    }), { status: 500 })
  }
} 