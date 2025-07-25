'use server';

import Stripe from 'stripe';
import { stripe } from '@/utils/stripe/config';
import { createClient } from '@/utils/supabase/server';
import { createOrRetrieveCustomer } from '@/utils/supabase/admin';
import {
  getURL,
  getErrorRedirect,
  calculateTrialEndUnixTimestamp
} from '@/utils/helpers';
import { Tables } from '@/types_db';
import { cookies } from 'next/headers';

type Price = Tables<'prices'>;

type CheckoutResponse = {
  errorRedirect?: string;
  sessionId?: string;
};

export async function checkoutWithStripe(
  price: Price,
  redirectPath: string = '/thank-you'
): Promise<CheckoutResponse> {
  console.log('[SERVER] Starting checkout process');
  
  try {
    // Get the user from Supabase auth
    const cookieStore = cookies();
    const supabase = createClient();
    const {
      error,
      data: { user }
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('[SERVER] Auth error:', error);
      throw new Error('Could not get user session.');
    }

    console.log('[SERVER] User authenticated:', user.id);

    // Retrieve or create the customer in Stripe
    let customer: string;
    try {
      customer = await createOrRetrieveCustomer({
        uuid: user?.id || '',
        email: user?.email || ''
      });
      console.log('[SERVER] Customer retrieved/created:', customer);
    } catch (err) {
      console.error('[SERVER] Customer error:', err);
      throw new Error('Unable to access customer record.');
    }

    // Determine subscription type based on price
    const subscriptionType = price.description?.toLowerCase().includes('vip') ? 'VIP' : 'Premium';

    let params: Stripe.Checkout.SessionCreateParams = {
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer,
      customer_update: {
        address: 'auto'
      },
      line_items: [
        {
          price: price.id,
          quantity: 1
        }
      ],
      cancel_url: getURL(),
      success_url: `${getURL(redirectPath)}?session_id={CHECKOUT_SESSION_ID}&subscription_type=${subscriptionType}`,
      metadata: {
        subscription_type: subscriptionType,
        user_id: user.id
      }
    };

    console.log('[SERVER] Trial period:', price.trial_period_days);
    if (price.type === 'recurring') {
      params = {
        ...params,
        mode: 'subscription',
        subscription_data: {
          trial_end: calculateTrialEndUnixTimestamp(price.trial_period_days)
        }
      };
    } else if (price.type === 'one_time') {
      params = {
        ...params,
        mode: 'payment'
      };
    }

    // Create a checkout session in Stripe
    let session;
    try {
      session = await stripe.checkout.sessions.create(params);
      console.log('[SERVER] Checkout session created:', session.id);
    } catch (err) {
      console.error('[SERVER] Stripe session error:', err);
      throw new Error('Unable to create checkout session.');
    }

    // Instead of returning a Response, just return the data or error.
    if (session) {
      return { sessionId: session.id };
    } else {
      throw new Error('Unable to create checkout session.');
    }
  } catch (error) {
    console.error('[SERVER] Checkout error:', error);
    if (error instanceof Error) {
      return {
        errorRedirect: getErrorRedirect(
          redirectPath,
          error.message,
          'Please try again later or contact a system administrator.'
        )
      };
    } else {
      return {
        errorRedirect: getErrorRedirect(
          redirectPath,
          'An unknown error occurred.',
          'Please try again later or contact a system administrator.'
        )
      };
    }
  }
}

export async function createStripePortal(currentPath: string) {
  try {
    const supabase = createClient();
    const {
      error,
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      if (error) {
        console.error('Supabase auth error:', error);
      }
      throw new Error('Could not get user session.');
    }

    console.log('User found:', user.id, user.email);

    let customer;
    try {
      customer = await createOrRetrieveCustomer({
        uuid: user.id || '',
        email: user.email || ''
      });
    } catch (err) {
      console.error('Customer creation/retrieval error:', err);
      throw new Error('Unable to access customer record.');
    }

    console.log('Stripe Customer ID:', customer);

    if (!customer) {
      throw new Error('Could not get customer.');
    }

    try {
      // Check if customer exists in Stripe before creating portal session
      const stripeCustomer = await stripe.customers.retrieve(customer);
      
      // Type guard to ensure we have a non-deleted customer
      if (stripeCustomer.deleted) {
        throw new Error('Customer has been deleted in Stripe');
      }
      
      console.log('Stripe customer details:', {
        id: stripeCustomer.id,
        email: stripeCustomer.email,
        created: stripeCustomer.created
      });

      const { url } = await stripe.billingPortal.sessions.create({
        customer,
        return_url: getURL('/account')
      });
      
      if (!url) {
        throw new Error('Could not create billing portal - no URL returned');
      }
      
      console.log('Billing portal URL created successfully');
      return url;
    } catch (err) {
      console.error('Stripe billing portal error:', err);
      
      // More specific error handling
      if (err instanceof Error) {
        if (err.message.includes('customer')) {
          throw new Error('Customer not found in Stripe. Please ensure you have a valid subscription or payment method.');
        } else if (err.message.includes('billing_portal')) {
          throw new Error('Billing portal not configured. Please configure the customer portal in your Stripe Dashboard.');
        } else {
          throw new Error(`Stripe error: ${err.message}`);
        }
      }
      
      throw new Error('Could not create billing portal');
    }
  } catch (error) {
    console.error('createStripePortal error:', error);
    throw error;
  }
}
