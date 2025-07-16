import PricingPlans from '@/components/ui/PricingPlans/PricingPlans';
import ChatWidget from '@/components/ui/ChatWidget/ChatWidget';
import { createClient } from '@/utils/supabase/server';
import {
  getProducts,
  getSubscription,
  getUser
} from '@/utils/supabase/queries';
import { headers } from 'next/headers';
import { Sparkles } from 'lucide-react';

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
    <>
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 backdrop-blur-sm rounded-full border border-blue-500/30 mb-6">
            <Sparkles className="w-4 h-4 text-blue-400 mr-2" />
            <span className="text-blue-200 text-sm font-medium">
              Choose Your Plan
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Start Trading with
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500">
              {' '}
              AI Precision
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Join thousands of traders using our AI-powered signals. Get real-time
            alerts, risk-free guarantee, and earn rewards.
          </p>
        </div>
        
        <PricingPlans
          user={data.user}
          products={data.products ?? []}
          subscription={data.subscription}
          showTimer={true}
          showHeader={false}
          showGuarantee={true}
        />
      </section>
      <ChatWidget />
    </>
  );
}
