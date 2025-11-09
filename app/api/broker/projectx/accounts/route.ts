import { NextRequest, NextResponse } from 'next/server';
import { ProjectXClient } from '@/utils/projectx/client';

/**
 * API route to fetch Project X accounts
 * This proxies the request server-side to avoid CORS issues
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, apiUsername, apiServiceType, customApiUrl } = body;

    console.log('📥 ProjectX accounts API route called:', {
      hasApiKey: !!apiKey,
      hasApiUsername: !!apiUsername,
      apiServiceType,
      customApiUrl
    });

    if (!apiKey || !apiUsername) {
      return NextResponse.json(
        { error: 'API key and username are required' },
        { status: 400 }
      );
    }

    // Initialize client
    const client = new ProjectXClient(
      apiKey,
      apiUsername,
      undefined,
      undefined,
      undefined,
      undefined,
      apiServiceType || 'topstepx'
    );

    // Override base URL if custom URL is provided
    if (customApiUrl) {
      client.setBaseUrl(customApiUrl);
      console.log('🔧 Using custom API URL:', customApiUrl);
    }

    console.log('🔍 Fetching accounts from ProjectX...');
    
    // Fetch accounts (server-side, no CORS issues)
    const accounts = await client.getAccounts();

    console.log('✅ Successfully fetched accounts:', accounts.length);

    return NextResponse.json({ accounts });
  } catch (error: any) {
    console.error('❌ Error fetching Project X accounts:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch accounts',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: error.message?.includes('404') ? 404 : 500 }
    );
  }
}

