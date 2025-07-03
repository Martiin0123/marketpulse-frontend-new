import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET() {
  try {
    const supabase = createClient();
    
    // Get all products regardless of status
    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select('*');

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return NextResponse.json({ error: productsError.message }, { status: 500 });
    }

    // Get all prices regardless of status
    const { data: allPrices, error: pricesError } = await supabase
      .from('prices')
      .select('*');

    if (pricesError) {
      console.error('Error fetching prices:', pricesError);
      return NextResponse.json({ error: pricesError.message }, { status: 500 });
    }

    return NextResponse.json({
      products: allProducts,
      prices: allPrices
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 