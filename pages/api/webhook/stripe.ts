import type { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import {
  upsertProductRecord,
  upsertPriceRecord,
  manageSubscriptionStatusChange,
  deleteProductRecord,
  deletePriceRecord
} from '@/utils/supabase/admin';

export const config = {
  api: {
    bodyParser: false, // required to get raw body
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Create admin Supabase client for webhook
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Events for product/price management
const productPriceEvents = new Set([
  'product.created',
  'product.updated',
  'product.deleted',
  'price.created',
  'price.updated',
  'price.deleted'
]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  console.log('🔔 Stripe webhook received:', {
    method: req.method,
    url: req.url,
    headers: req.headers
  });

  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature']!;

    console.log('🔔 Webhook body length:', buf.length);
    console.log('🔔 Webhook signature present:', !!sig);
    console.log('🔔 Webhook secret configured:', !!webhookSecret);

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
      console.log('🔔 Webhook signature verified successfully');
      console.log('🔔 Event type:', event.type);
      console.log('🔔 Event ID:', event.id);
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('🔔 Processing webhook event:', event.type);
    
    // Handle product/price management events
    if (productPriceEvents.has(event.type)) {
      console.log('🔔 Handling product/price event:', event.type);
      try {
        switch (event.type) {
          case 'product.created':
          case 'product.updated':
            await upsertProductRecord(event.data.object as Stripe.Product);
            break;
          case 'price.created':
          case 'price.updated':
            await upsertPriceRecord(event.data.object as Stripe.Price);
            break;
          case 'price.deleted':
            await deletePriceRecord(event.data.object as Stripe.Price);
            break;
          case 'product.deleted':
            await deleteProductRecord(event.data.object as Stripe.Product);
            break;
          default:
            console.log(`🔔 Unhandled product/price event type: ${event.type}`);
        }
        console.log('✅ Product/price event processed successfully');
      } catch (error) {
        console.error('❌ Error processing product/price event:', error);
        return res.status(400).json({ error: 'Product/price event processing failed' });
      }
    }
    
    // Handle subscription and payment events
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('🔔 Handling checkout.session.completed');
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, supabaseAdmin);
        break;

      case 'customer.subscription.created':
        console.log('🔔 Handling customer.subscription.created');
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription, supabaseAdmin);
        // Also handle with admin utilities for customer sync
        try {
          await manageSubscriptionStatusChange(
            event.data.object.id,
            event.data.object.customer as string,
            true
          );
        } catch (error) {
          console.error('❌ Error in admin subscription handling:', error);
        }
        break;

      case 'customer.subscription.updated':
        console.log('🔔 Handling customer.subscription.updated');
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabaseAdmin);
        // Also handle with admin utilities for customer sync
        try {
          await manageSubscriptionStatusChange(
            event.data.object.id,
            event.data.object.customer as string,
            false
          );
        } catch (error) {
          console.error('❌ Error in admin subscription handling:', error);
        }
        break;

      case 'customer.subscription.deleted':
        console.log('🔔 Handling customer.subscription.deleted');
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabaseAdmin);
        // Also handle with admin utilities for customer sync
        try {
          await manageSubscriptionStatusChange(
            event.data.object.id,
            event.data.object.customer as string,
            false
          );
        } catch (error) {
          console.error('❌ Error in admin subscription handling:', error);
        }
        break;

      case 'invoice.payment_succeeded':
        console.log('🔔 Handling invoice.payment_succeeded');
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, supabaseAdmin);
        break;

      case 'invoice.payment_failed':
        console.log('🔔 Handling invoice.payment_failed');
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, supabaseAdmin);
        break;

      case 'charge.refunded':
        console.log('🔔 Handling charge.refunded');
        await handleChargeRefunded(event.data.object as Stripe.Charge, supabaseAdmin);
        break;

      default:
        if (!productPriceEvents.has(event.type)) {
          console.log(`🔔 Unhandled event type: ${event.type}`);
        }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  if (session.mode === 'subscription' && session.subscription) {
    console.log('Checkout session completed for subscription:', session.subscription);
    // Note: Subscription creation is now handled by customer.subscription.created event
    // This handler only logs successful checkout completion
  }
}

async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  supabase: any
) {
  try {
    console.log('Processing subscription.created event:', subscription.id);
    
    // Get customer details
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    
    if (customer.deleted) {
      console.log('Customer was deleted, skipping subscription creation');
      return;
    }
    
    const userEmail = customer.email;
    
    if (!userEmail) {
      console.error('No email found for customer:', subscription.customer);
      return;
    }
    
    // Find user by email using admin client
    const { data: user } = await supabase.auth.admin.listUsers();
    const userRecord = user.users.find((u: any) => u.email === userEmail);
    
    if (!userRecord) {
      console.error('No user found for email:', userEmail);
      return;
    }
    
    console.log('Creating subscription record for user:', userRecord.id);
    
    // Check if subscription already exists to prevent duplicates
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('id', subscription.id)
      .single();
    
    if (existingSubscription) {
      console.log('Subscription already exists, skipping:', subscription.id);
      return;
    }
    
    // Get the product name to determine the role
    const priceId = subscription.items.data[0]?.price.id;
    const { data: priceData } = await supabase
      .from('prices')
      .select(`
        products:product_id (
          name
        )
      `)
      .eq('id', priceId)
      .single();

    // Determine role based on product name
    let role = 'free';
    if (priceData?.products?.name) {
      const productName = priceData.products.name.toLowerCase();
      if (productName.includes('premium') || productName.includes('vip')) {
        role = 'premium';
      } else if (productName.includes('pro')) {
        role = 'pro';
      } else {
        role = 'free';
      }
    }

    console.log('Determined role for subscription:', {
      subscriptionId: subscription.id,
      productName: priceData?.products?.name,
      role
    });

    // Create subscription record with idempotent upsert
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        id: subscription.id,
        user_id: userRecord.id,
        status: subscription.status,
        price_id: subscription.items.data[0]?.price.id,
        quantity: subscription.items.data[0]?.quantity || 1,
        role: role, // Set the determined role
        cancel_at_period_end: subscription.cancel_at_period_end,
        created: new Date(subscription.created * 1000).toISOString(),
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        metadata: subscription.metadata
      }, {
        onConflict: 'id'
      });
    
    if (error) {
      console.error('Error creating subscription record:', error);
    } else {
      console.log('Subscription record created successfully:', subscription.id);
    }
  } catch (error) {
    console.error('Error in handleSubscriptionCreated:', error);
  }
}

async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: any
) {
  if (invoice.subscription) {
    // Update subscription status if needed
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    
    await supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
      })
      .eq('id', subscription.id);
  }
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: any
) {
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    
    // Cancel referral if subscription becomes past_due or unpaid
    if (['past_due', 'unpaid', 'canceled'].includes(subscription.status)) {
      await supabase
        .from('referrals')
        .update({
          status: 'cancelled',
          refunded_at: new Date().toISOString()
        })
        .eq('referee_id', subscription.customer)
        .eq('status', 'subscribed')
        .gte('subscribed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Within 30 days
    }
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: any
) {
  // Get the product name to determine the role
  const priceId = subscription.items.data[0]?.price.id;
  const { data: priceData } = await supabase
    .from('prices')
    .select(`
      products:product_id (
        name
      )
    `)
    .eq('id', priceId)
    .single();

  // Determine role based on product name
  let role = 'free';
  if (priceData?.products?.name) {
    const productName = priceData.products.name.toLowerCase();
    if (productName.includes('premium') || productName.includes('vip')) {
      role = 'premium';
    } else if (productName.includes('pro')) {
      role = 'pro';
    } else {
      role = 'free';
    }
  }

  console.log('Updated role for subscription:', {
    subscriptionId: subscription.id,
    productName: priceData?.products?.name,
    role
  });

  // Update subscription record
  await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      role: role, // Update the role
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null
    })
    .eq('id', subscription.id);
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: any
) {
  // Update subscription record
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      ended_at: new Date(subscription.ended_at! * 1000).toISOString()
    })
    .eq('id', subscription.id);
}

async function handleChargeRefunded(
  charge: Stripe.Charge,
  supabase: any
) {
  if (charge.invoice) {
    const invoice = await stripe.invoices.retrieve(charge.invoice as string);
    
    if (invoice.subscription) {
      // Find the user associated with this subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('id', invoice.subscription)
        .single();
      
      if (subscription) {
        // Cancel any pending referral rewards for this user
        await supabase
          .from('referral_rewards')
          .update({ status: 'cancelled' })
          .in('referral_id', 
            supabase
              .from('referrals')
              .select('id')
              .eq('referee_id', subscription.user_id)
              .in('status', ['subscribed', 'active'])
          );
        
        // Update referral status to cancelled
        await supabase
          .from('referrals')
          .update({ 
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('referee_id', subscription.user_id)
          .in('status', ['subscribed', 'active']);
      }
    }
  }
} 