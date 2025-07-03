import Pricing from '@/components/ui/Pricing/Pricing';
import { createClient } from '@/utils/supabase/server';
import {
  getProducts,
  getSubscription,
  getUser
} from '@/utils/supabase/queries';
import { headers } from 'next/headers';

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getData() {
  console.log('[SERVER] Starting data fetch');
  const headersList = headers();
  const supabase = createClient();
  try {
    const [user, products, subscription] = await Promise.all([
      getUser(supabase),
      getProducts(supabase),
      getSubscription(supabase)
    ]);

    console.log('[SERVER] Data fetch complete', {
      hasUser: !!user,
      productsCount: products?.length ?? 0,
      hasSubscription: !!subscription,
      url: headersList.get('x-url') || 'unknown'
    });

    return { user, products, subscription };
  } catch (error) {
    console.error('[SERVER] Error fetching data:', error);
    throw error;
  }
}

export default async function PricingPage() {
  const data = await getData();

  return (
    <Pricing
      user={data.user}
      products={data.products ?? []}
      subscription={data.subscription}
    />
  );
}
