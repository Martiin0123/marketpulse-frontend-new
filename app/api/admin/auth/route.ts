import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      console.error('❌ ADMIN_PASSWORD not set in environment variables');
      return NextResponse.json({ error: 'Admin access not configured' }, { status: 500 });
    }
    
    if (password !== adminPassword) {
      console.log('❌ Invalid admin password attempt');
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    console.log('✅ Admin authentication successful');
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('❌ Admin auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
} 