'use client';

import Button from '@/components/ui/Button';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { createStripePortal } from '@/utils/stripe/server';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { Tables } from '@/types_db';

type Subscription = Tables<'subscriptions'>;
type Price = Tables<'prices'>;
type Product = Tables<'products'>;

type SubscriptionWithPriceAndProduct = Subscription & {
  prices:
    | (Price & {
        products: Product | null;
      })
    | null;
};

interface Props {
  subscription: SubscriptionWithPriceAndProduct | null;
}

export default function CustomerPortalForm({ subscription }: Props) {
  const router = useRouter();
  const currentPath = usePathname();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscriptionPrice =
    subscription &&
    subscription?.prices?.currency &&
    subscription?.prices?.unit_amount &&
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: subscription.prices.currency,
      minimumFractionDigits: 0
    }).format((subscription.prices.unit_amount || 0) / 100);

  const handleStripePortalRequest = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const redirectUrl = await createStripePortal(currentPath);
      
      // Check if redirectUrl is an error redirect
      if (redirectUrl.includes('error=')) {
        const urlParams = new URLSearchParams(redirectUrl.split('?')[1]);
        const errorMessage = urlParams.get('error') || 'Unknown error occurred';
        setError(errorMessage);
        setIsSubmitting(false);
        return;
      }
      
      setIsSubmitting(false);
      return router.push(redirectUrl);
    } catch (err) {
      console.error('Portal creation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create billing portal');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Subscription Details */}
      <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-medium">Plan Details</h4>
            <p className="text-slate-400 text-sm">
              {subscription
                ? `${subscription?.prices?.products?.name || 'Subscription'} plan`
                : 'No active subscription'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-white">
              {subscription ? (
                subscriptionPrice ? (
                  `${subscriptionPrice}/${subscription?.prices?.interval}`
                ) : (
                  `${subscription?.prices?.products?.name || 'Active'}`
                )
              ) : (
                <Link href="/pricing" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Choose Plan
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <p className="text-red-300 font-medium text-sm">Error</p>
          </div>
          <p className="text-red-200 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Stripe Portal Button */}
      <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600">
        <div>
          <h4 className="text-white font-medium">Billing Management</h4>
          <p className="text-slate-400 text-sm">
            Manage your subscription, payment methods, and billing history
          </p>
        </div>
        <button
          onClick={handleStripePortalRequest}
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Opening...' : 'Manage Billing'}
        </button>
      </div>
    </div>
  );
}
