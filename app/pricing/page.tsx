import PricingPlans from '@/components/ui/PricingPlans/PricingPlans';
import ChatWidget from '@/components/ui/ChatWidget/ChatWidget';
import { createClient } from '@/utils/supabase/server';
import {
  getProducts,
  getSubscription,
  getUser
} from '@/utils/supabase/queries';
import { headers } from 'next/headers';
import { Sparkles, Zap, BookOpen } from 'lucide-react';

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

// Helper function to categorize products by type
function categorizeProducts(products: any[]) {
  const signalsProducts: any[] = [];
  const journalProducts: any[] = [];

  products.forEach((product) => {
    const metadata = product.metadata as any;
    const productType = metadata?.product_type || metadata?.category;
    const productName = (product.name || '').toLowerCase();

    // Check metadata first, then fallback to name matching
    if (
      productType === 'signals' ||
      productName.includes('signal') ||
      productName.includes('premium') ||
      productName.includes('vip')
    ) {
      // Only add if not already a journal product
      if (!productType === 'journal' && !productName.includes('journal')) {
        signalsProducts.push(product);
      }
    }

    if (
      productType === 'journal' ||
      productName.includes('journal') ||
      productName.includes('tradesyncer') ||
      productName.includes('copy trade')
    ) {
      journalProducts.push(product);
    }
  });

  return { signalsProducts, journalProducts };
}

export default async function PricingPage() {
  const data = await getData();
  const { signalsProducts, journalProducts } = categorizeProducts(
    data.products ?? []
  );

  return (
    <>
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 backdrop-blur-sm rounded-full border border-blue-500/30 mb-6">
            <Sparkles className="w-4 h-4 text-blue-400 mr-2" />
            <span className="text-blue-200 text-sm font-medium">
              Choose Your Products
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Power Your Trading with
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500">
              {' '}
              Professional Tools
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Subscribe to our AI-powered trading signals or advanced journal with
            copy trading. Mix and match to build your perfect trading setup.
          </p>
        </div>

        {/* Trading Signals Section */}
        {signalsProducts.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">
                  Trading Signals Bot
                </h2>
                <p className="text-slate-400">
                  AI-powered trading signals delivered in real-time
                </p>
              </div>
            </div>

            <PricingPlans
              user={data.user}
              products={signalsProducts}
              subscription={data.subscription}
              showTimer={false}
              showHeader={false}
              showGuarantee={true}
            />
          </div>
        )}

        {/* Trading Journal Section */}
        {journalProducts.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">
                  Trading Journal with TradeSyncer
                </h2>
                <p className="text-slate-400">
                  Advanced journal with automatic trade syncing and copy trading
                </p>
              </div>
            </div>

            <PricingPlans
              user={data.user}
              products={journalProducts}
              subscription={data.subscription}
              showTimer={false}
              showHeader={false}
              showGuarantee={false}
            />
          </div>
        )}

        {/* Fallback: Show all products if categorization didn't work */}
        {signalsProducts.length === 0 && journalProducts.length === 0 && (
          <PricingPlans
            user={data.user}
            products={data.products ?? []}
            subscription={data.subscription}
            showTimer={true}
            showHeader={false}
            showGuarantee={true}
          />
        )}
      </section>
      <ChatWidget />
    </>
  );
}
