import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check for admin authentication cookie
    const authCookie = request.cookies.get('admin_auth');
    
    if (!authCookie || authCookie.value !== 'authenticated') {
      return NextResponse.json({ 
        authenticated: false 
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      authenticated: true 
    });
    
  } catch (error) {
    console.error('❌ Error checking admin authentication:', error);
    return NextResponse.json({ 
      authenticated: false,
      error: 'Authentication check failed'
    }, { status: 500 });
  }
} 