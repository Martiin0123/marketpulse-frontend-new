export async function POST(request) {
  console.log('🔍 DEBUG endpoint hit');
  
  try {
    const body = await request.json();
    console.log('📨 DEBUG request body:', body);
    
    return new Response(JSON.stringify({
      message: 'Debug endpoint working',
      received: body,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ DEBUG error:', error);
    return new Response(JSON.stringify({
      error: 'Debug endpoint error',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 