'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/utils/auth-context';
import { Tables } from '@/types_db';
import { trackEvent } from '@/utils/amplitude';
import {
  CheckCircle,
  ArrowRight,
  Zap,
  Crown,
  Shield,
  Check,
  Clock
} from 'lucide-react';
import Button from '@/components/ui/Button';
import cn from 'classnames';

type Product = Tables<'products'>;
type Price = Tables<'prices'>;
type Subscription = Tables<'subscriptions'>;

interface ProductWithPrices extends Product {
  prices: Price[];
}

interface PriceWithProduct extends Price {
  products: Product | null;
}

interface SubscriptionWithProduct extends Subscription {
  prices: PriceWithProduct | null;
}

interface PricingPlansProps {
  products: ProductWithPrices[];
  user: any;
  subscription?: SubscriptionWithProduct | null;
  showTimer?: boolean;
  showHeader?: boolean;
  showGuarantee?: boolean;
  className?: string;
}

type BillingInterval = 'month' | 'year';

export default function PricingPlans({
  products,
  user,
  subscription,
  showTimer = true,
  showHeader = true,
  showGuarantee = true,
  className = ''
}: PricingPlansProps) {
  const router = useRouter();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('month');
  const [priceIdLoading, setPriceIdLoading] = useState<string>();
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Countdown timer logic
  useEffect(() => {
    if (!showTimer) return;
    
    const targetDate = new Date('2025-08-01T23:59:59Z');

    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [showTimer]);

  const isExpired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  // Track pricing section view
  useEffect(() => {
    trackEvent('Pricing Section Viewed', {
      page_location: window.location.pathname,
      user_authenticated: !!user,
      has_subscription: !!subscription,
      current_plan: subscription?.prices?.products?.name || 'none',
      products_available: products.length,
      show_timer: showTimer,
      show_header: showHeader,
      show_guarantee: showGuarantee,
      timestamp: new Date().toISOString()
    });
  }, [user, subscription, products.length, showTimer, showHeader, showGuarantee]);

  const handleGetStarted = async (planType: string, price?: Price) => {
    const eventData = {
      plan_type: planType,
      user_authenticated: !!user,
      price_id: price?.id,
      amount: price?.unit_amount ? (price.unit_amount / 100) : 0,
      currency: price?.currency,
      interval: price?.interval || billingInterval,
      billing_interval: billingInterval,
      page_location: window.location.pathname,
      has_subscription: !!subscription,
      current_plan: subscription?.prices?.products?.name || 'none',
      timestamp: new Date().toISOString()
    };

    // Main event
    trackEvent('Pricing Plan Clicked', eventData);

    // Specific event based on plan type
    if (planType === 'free') {
      trackEvent('Free Plan Selected', eventData);
      // For free plan, just redirect to Discord
      window.open('https://discord.gg/GDY4ZcXzes', '_blank');
      return;
    } else if (planType.includes('vip')) {
      trackEvent('VIP Plan Selected', eventData);
    } else {
      trackEvent('Premium Plan Selected', eventData);
    }

    // Track conversion funnel event
    trackEvent('Pricing CTA Clicked', {
      ...eventData,
      cta_text: planType === 'free' ? 'Join Community' : 
                planType.includes('vip') ? 'Get VIP Access' : 'Get Started',
      next_step: user ? 'stripe_checkout' : 'signin_page'
    });

    if (!user) {
      router.push('/signin');
      return;
    }

    if (!price) {
      console.error('No price provided for checkout');
      return;
    }

    // Set loading state
    setPriceIdLoading(price.id);

    try {
      // Import the server action
      const { checkoutWithStripe } = await import('@/utils/stripe/server');
      
      // Call the checkout function
      const result = await checkoutWithStripe(price);
      
      if (result.errorRedirect) {
        // Handle error
        console.error('Checkout error:', result.errorRedirect);
        // You might want to show an error message to the user
        return;
      }

      if (result.sessionId) {
        // Redirect to Stripe Checkout
        const { getStripe } = await import('@/utils/stripe/client');
        const stripe = await getStripe();
        
        if (stripe) {
          await stripe.redirectToCheckout({ sessionId: result.sessionId });
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
      // Handle error - maybe show a toast or error message
    } finally {
      setPriceIdLoading(undefined);
    }
  };

  // Get prices for the selected billing interval
  const getPricesForInterval = (product: ProductWithPrices) => {
    return (
      product.prices?.filter(
        (price) => price.interval === billingInterval && price.active
      ) || []
    );
  };

  // Sort products by price amount
  const sortedProducts = products
    .map((product) => {
      const prices = getPricesForInterval(product);
      const price = prices[0];
      return {
        product,
        price,
        priceAmount: price?.unit_amount || 0
      };
    })
    .filter((item) => item.price)
    .sort((a, b) => a.priceAmount - b.priceAmount);


  // Original prices for highlighting discounts
  const originalPrices = {
    premium: { month: 99, year: 999 },
    vip: { month: 299, year: 2590 }
  };

  const getOriginalPrice = (productName: string) => {
    const isVip = productName?.toLowerCase().includes('vip');
    const isPremium = productName?.toLowerCase().includes('premium');

    if (isVip) {
      return originalPrices.vip[billingInterval];
    } else if (isPremium) {
      return originalPrices.premium[billingInterval];
    }
    return null;
  };

  return (
    <div className={cn('relative z-10', className)}>
      {/* Header */}
      {showHeader && (
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Choose Your
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500">
              {' '}
              Trading Plan
            </span>
          </h2>

          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-8">
            Join thousands of traders using our AI-powered signals. Get real-time
            alerts, risk-free guarantee, and earn rewards.
          </p>

          {/* Billing Toggle */}
          <div className="relative inline-flex bg-slate-800/50 backdrop-blur-sm rounded-full border border-slate-700/50 shadow-xl mb-8">
            <button
              onClick={() => {
                setBillingInterval('month');
                trackEvent('Billing Interval Changed', {
                  interval: 'month',
                  previous_interval: billingInterval,
                  page_location: window.location.pathname,
                  user_authenticated: !!user,
                  timestamp: new Date().toISOString()
                });
              }}
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
              onClick={() => {
                setBillingInterval('year');
                trackEvent('Billing Interval Changed', {
                  interval: 'year',
                  previous_interval: billingInterval,
                  page_location: window.location.pathname,
                  user_authenticated: !!user,
                  savings_highlighted: true,
                  timestamp: new Date().toISOString()
                });
              }}
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
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Free Plan */}
        <div className="relative bg-slate-800/30 backdrop-blur-sm rounded-3xl border border-slate-700/50 hover:border-slate-600/50 p-8 transition-all duration-500 hover:scale-105 hover:shadow-2xl group">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-500/20 to-slate-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <Shield className="w-8 h-8 text-slate-400" />
            </div>

            <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
            <p className="text-slate-400 text-sm mb-6">Start your journey</p>

            <div className="mb-6">
              <span className="text-4xl font-bold bg-gradient-to-r from-slate-400 to-slate-300 bg-clip-text text-transparent">
                €0
              </span>
              <span className="text-slate-400 text-lg ml-2">/month</span>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-white">Discord Community Access</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-white">Basic Trading Resources</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-white">Educational Content</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-white">Community Support</span>
            </div>
          </div>

          <Button
            onClick={() => handleGetStarted('free')}
            variant="secondary"
            size="lg"
            className="w-full group"
          >
            Join Community
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        {/* Dynamic Stripe Products */}
        {sortedProducts.map((item, index) => {
          const { product, price } = item;
          if (!price) return null;

          const priceString = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: price.currency!,
            minimumFractionDigits: 0
          }).format((price?.unit_amount || 0) / 100);

          const originalPrice = getOriginalPrice(product.name);
          const originalPriceString =
            originalPrice && price.currency
              ? new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: price.currency!,
                  minimumFractionDigits: 0
                }).format(originalPrice)
              : null;

          const isPopular = index === 0; // First paid plan is most popular
          const isVip = product.name?.toLowerCase().includes('vip');
          const isCurrentPlan =
            subscription?.prices?.products?.name === product.name;

          return (
            <div
              key={product.id}
              className={cn(
                'relative p-8 transition-all duration-500 hover:scale-105 hover:shadow-2xl group',
                {
                  'bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 backdrop-blur-sm rounded-3xl border-2 border-emerald-500/40 hover:border-emerald-400/50':
                    isPopular,
                  'bg-slate-800/30 backdrop-blur-sm rounded-3xl border border-slate-700/50 hover:border-slate-600/50':
                    !isPopular,
                  'border-emerald-500/50 shadow-2xl shadow-emerald-500/25 bg-slate-800/40':
                    isCurrentPlan
                }
              )}
              onMouseEnter={() => {
                trackEvent('Pricing Card Hovered', {
                  plan_type: product.name?.toLowerCase() || 'unknown',
                  price_amount: price?.unit_amount ? (price.unit_amount / 100) : 0,
                  currency: price?.currency,
                  interval: price?.interval || billingInterval,
                  is_popular: isPopular,
                  is_current_plan: isCurrentPlan,
                  page_location: window.location.pathname,
                  user_authenticated: !!user,
                  timestamp: new Date().toISOString()
                });
              }}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-emerald-500 to-green-500 px-8 py-2 rounded-full text-white text-sm font-bold flex items-center shadow-lg">
                    <Check className="w-4 h-4 mr-2" />
                    Current Plan
                  </div>
                </div>
              )}

              {/* Timer Badge */}
              {showTimer && !isExpired && (
                <div className="absolute -top-4 right-4 z-10">
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1 rounded-full text-white text-xs font-medium flex items-center shadow-lg">
                    <Clock className="w-3 h-3 mr-1" />
                    {timeLeft.days}d {timeLeft.hours}h
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <div
                  className={`w-16 h-16 ${
                    isVip
                      ? 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/20'
                      : 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20'
                  } rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  {isVip ? (
                    <Crown className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <Zap className="w-8 h-8 text-blue-400" />
                  )}
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">
                  {product.name}
                </h3>
                <p className="text-slate-400 text-sm mb-6">
                  {product.description || 'Advanced trading features'}
                </p>

                <div className="mb-6">
                  {originalPriceString && (
                    <div className="mb-2">
                      <span className="text-lg text-slate-400 line-through">
                        {originalPriceString}
                      </span>
                      <span className="text-xs text-orange-400 ml-2">
                        Original Price
                      </span>
                    </div>
                  )}
                  <span
                    className={`text-4xl font-bold ${
                      isVip
                        ? 'bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500'
                        : 'bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500'
                    } bg-clip-text text-transparent`}
                  >
                    {priceString}
                  </span>
                  <span className="text-slate-400 text-lg ml-2">
                    /{billingInterval}
                  </span>
                </div>

                {billingInterval === 'year' && (
                  <div className="inline-flex items-center px-3 py-1 bg-emerald-500/20 rounded-full text-xs text-emerald-300 font-medium mb-6">
                    Save 20%
                  </div>
                )}
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="text-white">Real-time Trading Signals</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="text-white">Advanced Analytics Dashboard</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="text-white">Discord Community Access</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="text-white">Mobile Notifications</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="text-white">No Loss Guarantee</span>
                </div>
                {isVip && (
                  <>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <span className="text-white">Priority Signal Alerts</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <span className="text-white">Exclusive VIP Discord</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <span className="text-white">1-on-1 Support</span>
                    </div>
                  </>
                )}
              </div>

              <Button
                onClick={() => handleGetStarted(product.name?.toLowerCase() || 'premium', price)}
                variant="primary"
                size="lg"
                disabled={priceIdLoading === price.id}
                className={`w-full group ${
                  isVip
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400'
                    : ''
                } ${priceIdLoading === price.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {priceIdLoading === price.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    {isVip ? 'Get VIP Access' : 'Get Started'}
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* No Loss Guarantee */}
      {showGuarantee && (
        <div className="text-center mt-12">
          <div className="inline-flex items-center px-6 py-3 bg-emerald-500/10 backdrop-blur-sm rounded-full border border-emerald-500/30">
            <Shield className="w-5 h-5 text-emerald-400 mr-3" />
            <span className="text-emerald-200 text-sm font-medium">
              No Loss Guarantee
            </span>
          </div>
          <div className="mt-4 max-w-2xl mx-auto">
            <p className="text-lg text-white font-semibold mb-2">
              If our signal performance for the month is negative, you get your
              subscription fee refunded — automatically.
            </p>
            <p className="text-slate-300 text-sm">
              You are never judged by your trades, only ours.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}