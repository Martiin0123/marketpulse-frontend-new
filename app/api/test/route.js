export async function GET() {
  console.log('🧪 Test endpoint hit');
  
  return new Response(JSON.stringify({
    message: 'Test endpoint working',
    env: {
      hasBybitKey: !!process.env.BYBIT_API_KEY,
      hasBybitSecret: !!process.env.BYBIT_SECRET_KEY,
      bybitTestnet: process.env.BYBIT_TESTNET,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
} 