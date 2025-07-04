import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, supabase);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, supabase);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, supabase);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabase);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge, supabase);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  if (session.mode === 'subscription' && session.subscription) {
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    
    // Get customer details
    const customer = await stripe.customers.retrieve(customerId);
    
    if (customer.deleted) {
      console.log('Customer was deleted');
      return;
    }
    
    const userEmail = customer.email;
    
    if (!userEmail) return;
    
    // Find user by email
    const { data: user } = await supabase.auth.admin.listUsers();
    const userRecord = user.users.find((u: any) => u.email === userEmail);
    
    if (!userRecord) return;
    
    // Create or update subscription record
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    await supabase
      .from('subscriptions')
      .upsert({
        id: subscriptionId,
        user_id: userRecord.id,
        status: subscription.status,
        price_id: subscription.items.data[0]?.price.id,
        quantity: subscription.items.data[0]?.quantity,
        cancel_at_period_end: subscription.cancel_at_period_end,
        created: new Date(subscription.created * 1000).toISOString(),
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        metadata: subscription.metadata
      });
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
  // Update subscription record
  await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
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