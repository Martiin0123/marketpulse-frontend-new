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
  AlertTriangle
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

  // Feature lists for different plans
  const getFeatures = (productName: string) => {
    const baseFeatures = [
      {
        icon: <TrendingUp className="w-5 h-5" />,
        text: 'Live trading signals'
      },
      {
        icon: <Star className="w-5 h-5" />,
        text: 'Proven by real traders worldwide'
      }
    ];

    const proFeatures = [
      {
        icon: <TrendingUp className="w-5 h-5" />,
        text: 'Live trading signals'
      },
      {
        icon: <Bell className="w-5 h-5" />,
        text: 'Instant notifications'
      }
    ];

    const premiumFeatures = [
      {
        icon: <TrendingUp className="w-5 h-5" />,
        text: 'Live trading signals'
      },
      {
        icon: <Shield className="w-5 h-5" />,
        text: 'Priority support'
      }
    ];

    if (
      productName?.toLowerCase().includes('premium') ||
      productName?.toLowerCase().includes('pro')
    ) {
      return premiumFeatures;
    } else if (
      productName?.toLowerCase().includes('professional') ||
      productName?.toLowerCase().includes('standard')
    ) {
      return proFeatures;
    }
    return baseFeatures;
  };

  if (!products.length) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-16 w-16 text-orange-400 mb-6" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-6 sm:text-6xl">
              No Pricing Plans Available
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Subscription pricing plans need to be created. Set them up in your{' '}
              <a
                className="text-purple-400 underline hover:text-purple-300 transition-colors"
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
    <section className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(168,85,247,0.1),_rgba(0,0,0,0))]"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"></div>

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
            <div className="inline-flex items-center px-4 py-2 bg-purple-500/10 backdrop-blur-sm rounded-full border border-purple-500/30 mb-6">
              <Star className="w-4 h-4 text-purple-400 mr-2" />
              <span className="text-purple-200 text-sm font-medium">
                Choose Your Plan
              </span>
            </div>

            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-6 sm:text-7xl">
              Market<span className="text-white">Pulse</span> Plans
            </h1>

            <p className="max-w-3xl mx-auto text-xl text-gray-300 sm:text-2xl mb-12 leading-relaxed">
              Get real-time trading signals, advanced technical analysis, and
              market insights to make informed trading decisions
            </p>

            {/* Billing Interval Toggle */}
            <div className="relative inline-flex bg-gray-800/50 backdrop-blur-sm rounded-2xl p-2 border border-gray-700/50 shadow-xl mb-12">
              {intervals.includes('month') && (
                <button
                  onClick={() => setBillingInterval('month')}
                  type="button"
                  className={`${
                    billingInterval === 'month'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  } relative px-8 py-3 text-sm font-medium rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                >
                  Monthly
                </button>
              )}
              {intervals.includes('year') && (
                <button
                  onClick={() => setBillingInterval('year')}
                  type="button"
                  className={`${
                    billingInterval === 'year'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  } relative px-8 py-3 text-sm font-medium rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                >
                  Yearly
                  <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-300 font-medium">
                    Save 20%
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-8 max-w-7xl mx-auto mb-20">
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
              const features = getFeatures(product.name || '');

              return (
                <div
                  key={product.id}
                  className={cn(
                    'relative bg-gray-800/30 backdrop-blur-sm rounded-3xl border p-10 transition-all duration-500 hover:scale-105 hover:shadow-2xl',
                    {
                      'border-purple-500/50 shadow-2xl shadow-purple-500/25 bg-gray-800/40':
                        isPopular,
                      'border-green-500/50 shadow-2xl shadow-green-500/25 bg-gray-800/40':
                        isCurrentPlan,
                      'border-gray-700/50 hover:border-gray-600/50 bg-gray-800/20':
                        !isPopular && !isCurrentPlan
                    }
                  )}
                >
                  {/* Popular Badge */}
                  {isPopular && (
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-full text-white text-sm font-bold flex items-center shadow-lg">
                        <Star className="w-4 h-4 mr-2" />
                        Most Popular
                      </div>
                    </div>
                  )}

                  {/* Current Plan Badge */}
                  {isCurrentPlan && (
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-2 rounded-full text-white text-sm font-bold flex items-center shadow-lg">
                        <Check className="w-4 h-4 mr-2" />
                        Current Plan
                      </div>
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="text-center mb-10">
                    <h3 className="text-3xl font-bold text-white mb-4">
                      {product.name}
                    </h3>
                    <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                      {product.description}
                    </p>

                    {/* Price */}
                    <div className="mb-8">
                      <span className="text-6xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        {priceString}
                      </span>
                      <span className="text-gray-400 text-xl ml-2">
                        /{billingInterval}
                      </span>
                    </div>

                    {/* CTA Button */}
                    {isCurrentPlan ? (
                      <Button
                        variant="slim"
                        onClick={handleViewDashboard}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 text-lg font-bold rounded-2xl transition-all shadow-lg"
                      >
                        View Dashboard
                      </Button>
                    ) : (
                      <Button
                        variant="slim"
                        type="button"
                        loading={priceIdLoading === price.id}
                        onClick={() => handleStripeCheckout(price)}
                        className={cn(
                          'w-full py-4 text-lg font-bold rounded-2xl transition-all shadow-lg',
                          isPopular
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-white'
                        )}
                      >
                        {subscription ? 'Change Plan' : 'Get Started'}
                      </Button>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-6">
                    <h4 className="text-xl font-bold text-white mb-6 text-center">
                      What's included:
                    </h4>
                    {features.map((feature, featureIndex) => (
                      <div
                        key={featureIndex}
                        className="flex items-center space-x-4 p-3 rounded-xl bg-gray-700/30 hover:bg-gray-700/50 transition-all"
                      >
                        <div className="flex-shrink-0 w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <div className="text-purple-400">{feature.icon}</div>
                        </div>
                        <span className="text-gray-200 font-medium">
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Features Highlight Section */}
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 backdrop-blur-sm rounded-full border border-blue-500/30 mb-8">
              <Shield className="w-4 h-4 text-blue-400 mr-2" />
              <span className="text-blue-200 text-sm font-medium">
                Why Choose MarketPulse?
              </span>
            </div>

            <h2 className="text-4xl font-bold text-white mb-6">
              Advanced Trading Technology
            </h2>
            <p className="text-xl text-gray-300 mb-16 max-w-3xl mx-auto leading-relaxed">
              Advanced trading signals and market analysis to help you make
              profitable decisions with confidence
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
              <div className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="w-10 h-10 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Real-Time Signals
                </h3>
                <p className="text-gray-400 text-lg leading-relaxed">
                  Get instant buy/sell signals based on advanced technical
                  analysis and market trends
                </p>
              </div>

              <div className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Technical Analysis
                </h3>
                <p className="text-gray-400 text-lg leading-relaxed">
                  RSI, MACD, and other indicators to validate trading
                  opportunities and market conditions
                </p>
              </div>

              <div className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Risk Management
                </h3>
                <p className="text-gray-400 text-lg leading-relaxed">
                  Built-in risk assessment and position sizing to help protect
                  your investments
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
