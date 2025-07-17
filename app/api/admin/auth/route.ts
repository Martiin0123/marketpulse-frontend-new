import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    // Get admin password from environment
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      return NextResponse.json({ 
        error: 'Admin access not configured' 
      }, { status: 500 });
    }
    
    // Check if password matches
    if (password !== adminPassword) {
      return NextResponse.json({ 
        error: 'Invalid password' 
      }, { status: 401 });
    }
    
    // Set authentication cookie
    const response = NextResponse.json({ 
      success: true,
      message: 'Authentication successful'
    });
    
    // Set secure HTTP-only cookie
    response.cookies.set('admin_auth', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 24 hours
    });
    
    return response;
    
  } catch (error) {
    console.error('❌ Error in admin authentication:', error);
    return NextResponse.json({ 
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 