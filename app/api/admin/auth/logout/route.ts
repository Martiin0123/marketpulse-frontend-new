import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Clear authentication cookie
    const response = NextResponse.json({ 
      success: true,
      message: 'Logged out successfully'
    });
    
    // Remove the admin auth cookie
    response.cookies.set('admin_auth', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0 // Expire immediately
    });
    
    return response;
    
  } catch (error) {
    console.error('❌ Error in admin logout:', error);
    return NextResponse.json({ 
      error: 'Logout failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 