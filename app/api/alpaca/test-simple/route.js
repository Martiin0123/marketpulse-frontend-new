export async function GET() {
  try {
    console.log('🧪 Testing basic API route...')

    return new Response(JSON.stringify({
      success: true,
      message: 'Basic API route working!',
      environment: {
        node_env: process.env.NODE_ENV,
        alpaca_api_key_configured: !!process.env.ALPACA_API_KEY,
        alpaca_secret_key_configured: !!process.env.ALPACA_SECRET_KEY
      }
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Basic API test failed:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Basic API test failed',
      details: error.message
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
} 