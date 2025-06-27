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
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: subscription?.prices?.currency!,
      minimumFractionDigits: 0
    }).format((subscription?.prices?.unit_amount || 0) / 100);

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
    <Card
      title="Your Plan"
      description={
        subscription
          ? `You are currently on the ${subscription?.prices?.products?.name} plan.`
          : 'You are not currently subscribed to any plan.'
      }
      footer={
        <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
          <p className="pb-4 sm:pb-0">Manage your subscription on Stripe.</p>
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </div>
          )}
          <Button
            variant="slim"
            onClick={handleStripePortalRequest}
            loading={isSubmitting}
          >
            Open customer portal
          </Button>
        </div>
      }
    >
      <div className="mt-8 mb-4 text-xl font-semibold">
        {subscription ? (
          `${subscriptionPrice}/${subscription?.prices?.interval}`
        ) : (
          <Link href="/">Choose your plan</Link>
        )}
      </div>
    </Card>
  );
}
