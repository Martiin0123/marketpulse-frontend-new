'use client';

import Button from '@/components/ui/Button';
import type { Tables } from '@/types_db';
import { getStripe } from '@/utils/stripe/client';
import { checkoutWithStripe } from '@/utils/stripe/server';
import { getErrorRedirect } from '@/utils/helpers';
import { User } from '@supabase/supabase-js';
import cn from 'classnames';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Check,
  Star,
  TrendingUp,
  Shield,
  Zap,
  BarChart3,
  Bell,
  Eye,
  Clock,
  Target,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

type Subscription = Tables<'subscriptions'>;
type Product = Tables<'products'>;
type Price = Tables<'prices'>;
interface ProductWithPrices extends Product {
  prices: Price[];
}
interface PriceWithProduct extends Price {
  products: Product | null;
}
interface SubscriptionWithProduct extends Subscription {
  prices: PriceWithProduct | null;
}

interface Props {
  user: User | null | undefined;
  products: ProductWithPrices[];
  subscription: SubscriptionWithProduct | null;
}

type BillingInterval = 'day' | 'week' | 'month' | 'year';

export default function Pricing({ user, products, subscription }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>('month');
  const [priceIdLoading, setPriceIdLoading] = useState<string>();
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    console.log('[CLIENT] Component mounted with:', {
      isUserAuthenticated: !!user,
      userId: user?.id,
      hasProducts: products.length > 0,
      hasSubscription: !!subscription
    });
  }, [user, products, subscription]);

  useEffect(() => {
    console.log('[CLIENT] Subscription data received:', subscription);
  }, [subscription]);

  // Get unique intervals from products
  const intervals = Array.from(
    new Set(
      products.flatMap((product) =>
        product?.prices?.map((price) => price?.interval)
      )
    )
  ).filter(Boolean) as BillingInterval[];

  // Debug logging
  console.log('[CLIENT] Available intervals:', intervals);
  console.log(
    '[CLIENT] Products with prices:',
    products.map((p) => ({
      name: p.name,
      prices: p.prices?.map((price) => ({
        interval: price.interval,
        unit_amount: price.unit_amount
      }))
    }))
  );

  useEffect(() => {
    if (intervals.length > 0 && !intervals.includes(billingInterval)) {
      setBillingInterval(intervals[0]);
    }
  }, [intervals, billingInterval]);

  useEffect(() => {
    const message = searchParams?.get('message');
    if (message === 'subscription_required') {
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 8000);
    }
  }, [searchParams]);

  const handleStripeCheckout = async (price: Price) => {
    setPriceIdLoading(price.id);

    if (!user) {
      setPriceIdLoading(undefined);
      return router.push('/signin/signup');
    }

    try {
      const { errorRedirect, sessionId } = await checkoutWithStripe(
        price,
        pathname || '/'
      );

      if (errorRedirect) {
        setPriceIdLoading(undefined);
        return router.push(errorRedirect);
      }

      if (!sessionId) {
        setPriceIdLoading(undefined);
        return router.push(
          getErrorRedirect(
            pathname || '/',
            'An unknown error occurred.',
            'Please try again later or contact a system administrator.'
          )
        );
      }

      const stripe = await getStripe();
      await stripe?.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('[CLIENT] Checkout error:', error);
      router.push(
        getErrorRedirect(
          pathname || '/',
          'An error occurred during checkout.',
          'Please try again later.'
        )
      );
    } finally {
      setPriceIdLoading(undefined);
    }
  };

  const handleViewDashboard = () => {
    router.push('/dashboard');
  };

  if (!products.length) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-16 w-16 text-orange-400 mb-6" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent mb-6 sm:text-6xl">
              No Pricing Plans Available
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              Subscription pricing plans need to be created. Set them up in your{' '}
              <a
                className="text-blue-400 underline hover:text-blue-300 transition-colors"
                href="https://dashboard.stripe.com/products"
                rel="noopener noreferrer"
                target="_blank"
              >
                Stripe Dashboard
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(59,130,246,0.1),_rgba(0,0,0,0))]"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>

      {/* Subscription Required Message */}
      {showMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-pulse">
          <div className="bg-orange-500/20 backdrop-blur-sm border border-orange-500/50 rounded-xl px-6 py-3 flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <span className="text-orange-200 font-medium">
              Please subscribe to access trading signals and dashboard features
            </span>
          </div>
        </div>
      )}

      <div className="relative">
        <div className="max-w-7xl px-4 py-16 mx-auto sm:py-24 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 backdrop-blur-sm rounded-full border border-blue-500/30 mb-6">
              <Sparkles className="w-4 h-4 text-blue-400 mr-2" />
              <span className="text-blue-200 text-sm font-medium">
                Choose Your Plan
              </span>
            </div>

            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent mb-6 sm:text-7xl">
              PrimeScope<span className="text-white"> Plans</span>
            </h1>

            <p className="max-w-3xl mx-auto text-xl text-slate-300 sm:text-2xl mb-12 leading-relaxed">
              Get real-time trading signals, advanced technical analysis, and
              market insights to make informed trading decisions
            </p>

            {/* Billing Interval Toggle */}
            <div className="relative inline-flex bg-slate-800/50 backdrop-blur-sm rounded-full p-2 border border-slate-700/50 shadow-xl mb-12">
              <button
                onClick={() => setBillingInterval('month')}
                type="button"
                className={`${
                  billingInterval === 'month'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                } relative px-8 py-3 text-sm font-medium rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:scale-105`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('year')}
                type="button"
                className={`${
                  billingInterval === 'year'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                } relative px-8 py-3 text-sm font-medium rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:scale-105`}
              >
                Yearly
                <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-300 font-medium">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {/* No Loss Guarantee */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-6 py-3 bg-emerald-500/10 backdrop-blur-sm rounded-full border border-emerald-500/30">
              <Shield className="w-5 h-5 text-emerald-400 mr-3" />
              <span className="text-emerald-200 text-sm font-medium">
                No Loss Guarantee
              </span>
            </div>
            <div className="mt-4 max-w-2xl mx-auto">
              <p className="text-lg text-white font-semibold mb-2">
                If our own signal performance for the month is negative, you get
                your subscription fee refunded — automatically.
              </p>
              <p className="text-slate-300 text-sm">
                You are never judged by your trades, only ours.
              </p>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="flex justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl w-full">
              {products.map((product, index) => {
                const price = product?.prices?.find(
                  (price) => price.interval === billingInterval
                );
                if (!price) return null;

                const priceString = new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: price.currency!,
                  minimumFractionDigits: 0
                }).format((price?.unit_amount || 0) / 100);

                const isPopular =
                  index === 1 || product.name?.toLowerCase().includes('pro');
                const isCurrentPlan =
                  subscription?.prices?.products?.name === product.name;

                return (
                  <div
                    key={product.id}
                    className={cn(
                      'relative bg-slate-800/30 backdrop-blur-sm rounded-3xl border p-8 transition-all duration-500 hover:scale-105 hover:shadow-2xl group',
                      {
                        'border-blue-500/50 shadow-2xl shadow-blue-500/25 bg-slate-800/40':
                          isPopular,
                        'border-emerald-500/50 shadow-2xl shadow-emerald-500/25 bg-slate-800/40':
                          isCurrentPlan,
                        'border-purple-500/50 shadow-2xl shadow-purple-500/25 bg-slate-800/40':
                          index === 2,
                        'border-slate-700/50 hover:border-slate-600/50 bg-slate-800/20':
                          !isPopular && !isCurrentPlan && index !== 2
                      }
                    )}
                  >
                    {/* Popular Badge */}
                    {isPopular && (
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-2 rounded-full text-white text-sm font-bold flex items-center shadow-lg">
                          <Star className="w-4 h-4 mr-2" />
                          Most Popular
                        </div>
                      </div>
                    )}

                    {/* Current Plan Badge */}
                    {isCurrentPlan && (
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                        <div className="bg-gradient-to-r from-emerald-500 to-green-500 px-6 py-2 rounded-full text-white text-sm font-bold flex items-center shadow-lg">
                          <Check className="w-4 h-4 mr-2" />
                          Current Plan
                        </div>
                      </div>
                    )}

                    {/* Limited Badge for 3rd option */}
                    {index === 2 && (
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-full text-white text-sm font-bold flex items-center shadow-lg">
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          only 10 Spots
                        </div>
                      </div>
                    )}

                    {/* Plan Header */}
                    <div className="text-center mb-8">
                      {/* Price */}
                      <div className="mb-6">
                        <span className="text-5xl font-bold bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
                          {priceString}
                        </span>
                        <span className="text-slate-400 text-lg ml-2">
                          /{billingInterval}
                        </span>
                      </div>

                      <h3 className="text-2xl font-bold text-white mb-4">
                        {product.name}
                      </h3>
                      <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                        {product.description}
                      </p>

                      {/* Feature Indicators */}
                      <div className="mb-6">
                        {index === 0 && (
                          <div className="flex items-center space-x-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                            <Bell className="w-4 h-4 text-blue-400" />
                            <div>
                              <p className="text-blue-200 text-sm font-medium">
                                Free Trading Signals
                              </p>
                              <p className="text-slate-400 text-xs">
                                Occasional signals (limited frequency)
                              </p>
                            </div>
                          </div>
                        )}

                        {index === 1 && (
                          <div className="flex items-center space-x-2 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                            <Zap className="w-4 h-4 text-emerald-400" />
                            <div>
                              <p className="text-emerald-200 text-sm font-medium">
                                All Discord Trading Signals
                              </p>
                              <p className="text-slate-400 text-xs">
                                Real-time signals via Discord
                              </p>
                            </div>
                          </div>
                        )}

                        {index === 2 && (
                          <div className="flex items-center space-x-2 p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                            <BarChart3 className="w-4 h-4 text-purple-400" />
                            <div>
                              <p className="text-purple-200 text-sm font-medium">
                                Automatic Trading API
                              </p>
                              <p className="text-slate-400 text-xs">
                                Full automation with API access
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Additional info boxes for balance */}
                      {index === 0 && (
                        <div className="mb-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                          <p className="text-blue-200 text-sm font-medium mb-2">
                            🎯 Perfect for Beginners
                          </p>
                          <p className="text-slate-400 text-xs">
                            Try our signals risk-free and upgrade when you're
                            ready
                          </p>
                        </div>
                      )}

                      {index === 1 && (
                        <div className="mb-6 p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                          <p className="text-emerald-200 text-sm font-medium mb-2">
                            ⚡ Most Popular Choice
                          </p>
                          <p className="text-slate-400 text-xs">
                            Join 500+ traders getting real-time Discord signals
                          </p>
                        </div>
                      )}

                      {/* Limited spots notice for 3rd option */}
                      {index === 2 && (
                        <div className="mb-6 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                          <p className="text-purple-200 text-sm font-medium mb-2">
                            ⚠️ Limited Availability
                          </p>
                          <p className="text-slate-400 text-xs">
                            Only accepting qualified traders. Application
                            required.
                          </p>
                        </div>
                      )}

                      {/* CTA Button */}
                      {isCurrentPlan ? (
                        <Button
                          variant="slim"
                          onClick={handleViewDashboard}
                          className="w-full group-hover:scale-105 transition-transform duration-300"
                        >
                          View Dashboard
                        </Button>
                      ) : index === 2 ? (
                        // Special handling for 3rd option (limited spots)
                        <Button
                          variant="slim"
                          type="button"
                          onClick={() =>
                            window.open(
                              'mailto:apply@marketpulse.com?subject=Application for Premium Plan',
                              '_blank'
                            )
                          }
                          className="w-full group-hover:scale-105 transition-transform duration-300 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                          Apply Now
                        </Button>
                      ) : (
                        <Button
                          variant="slim"
                          type="button"
                          loading={priceIdLoading === price.id}
                          onClick={() => handleStripeCheckout(price)}
                          className="w-full group-hover:scale-105 transition-transform duration-300"
                        >
                          {subscription
                            ? 'Change Plan'
                            : index === 0
                              ? 'Start Free, Upgrade Later'
                              : 'Start Trading Smarter'}
                        </Button>
                      )}

                      {/* Yearly price not available message */}
                      {billingInterval === 'year' && !price && (
                        <div className="mt-4 p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                          <p className="text-orange-200 text-sm text-center">
                            Yearly pricing not available for this plan
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
