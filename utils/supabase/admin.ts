import { toDateTime } from '@/utils/helpers';
import { stripe } from '@/utils/stripe/config';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import type { Database, Tables, TablesInsert } from 'types_db';

type Product = Tables<'products'>;
type Price = Tables<'prices'>;

// Change to control trial period length
const TRIAL_PERIOD_DAYS = 0;

// Note: supabaseAdmin uses the SERVICE_ROLE_KEY which you must only use in a secure server-side context
// as it has admin privileges and overwrites RLS policies!
let supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

const getSupabaseAdmin = () => {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and service role key are required');
    }
    
    supabaseAdmin = createClient<Database>(supabaseUrl, supabaseKey);
  }
  return supabaseAdmin;
};

const upsertProductRecord = async (product: Stripe.Product) => {
  const supabase = getSupabaseAdmin();
  const productData: Product = {
    id: product.id,
    active: product.active,
    name: product.name,
    description: product.description ?? null,
    image: product.images?.[0] ?? null,
    metadata: product.metadata
  };

  const { error: upsertError } = await supabase
    .from('products')
    .upsert([productData]);
  if (upsertError)
    throw new Error(`Product insert/update failed: ${upsertError.message}`);
  console.log(`Product inserted/updated: ${product.id}`);
};

const upsertPriceRecord = async (
  price: Stripe.Price,
  retryCount = 0,
  maxRetries = 3
) => {
  const supabase = getSupabaseAdmin();
  const priceData: Price = {
    id: price.id,
    product_id: typeof price.product === 'string' ? price.product : '',
    active: price.active,
    currency: price.currency,
    description: price.nickname || null,
    type: price.type,
    unit_amount: price.unit_amount ?? null,
    interval: price.recurring?.interval ?? null,
    interval_count: price.recurring?.interval_count ?? null,
    trial_period_days: price.recurring?.trial_period_days ?? TRIAL_PERIOD_DAYS,
    metadata: price.metadata || null
  };

  const { error: upsertError } = await supabase
    .from('prices')
    .upsert([priceData]);

  if (upsertError?.message.includes('foreign key constraint')) {
    if (retryCount < maxRetries) {
      console.log(`Retry attempt ${retryCount + 1} for price ID: ${price.id}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await upsertPriceRecord(price, retryCount + 1, maxRetries);
    } else {
      throw new Error(
        `Price insert/update failed after ${maxRetries} retries: ${upsertError.message}`
      );
    }
  } else if (upsertError) {
    throw new Error(`Price insert/update failed: ${upsertError.message}`);
  } else {
    console.log(`Price inserted/updated: ${price.id}`);
  }
};

const deleteProductRecord = async (product: Stripe.Product) => {
  const supabase = getSupabaseAdmin();
  const { error: deletionError } = await supabase
    .from('products')
    .delete()
    .eq('id', product.id);
  if (deletionError)
    throw new Error(`Product deletion failed: ${deletionError.message}`);
  console.log(`Product deleted: ${product.id}`);
};

const deletePriceRecord = async (price: Stripe.Price) => {
  const supabase = getSupabaseAdmin();
  const { error: deletionError } = await supabase
    .from('prices')
    .delete()
    .eq('id', price.id);
  if (deletionError) throw new Error(`Price deletion failed: ${deletionError.message}`);
  console.log(`Price deleted: ${price.id}`);
};

const upsertCustomerToSupabase = async (uuid: string, customerId: string) => {
  try {
    console.log('[ADMIN] Upserting customer to Supabase:', { uuid, customerId });
    const supabase = getSupabaseAdmin();
    const { error: upsertError } = await supabase
      .from('customers')
      .upsert([{ id: uuid, stripe_customer_id: customerId }]);

    if (upsertError) {
      console.error('[ADMIN] Supabase customer upsert error:', upsertError);
      throw new Error(`Supabase customer record creation failed: ${upsertError.message}`);
    }

    console.log('[ADMIN] Successfully upserted customer to Supabase');
    return customerId;
  } catch (error) {
    console.error('[ADMIN] Upsert customer error:', error);
    throw error;
  }
};

const createCustomerInStripe = async (uuid: string, email: string) => {
  try {
    console.log('[ADMIN] Creating Stripe customer with data:', { uuid, email });
    const customerData = { metadata: { supabaseUUID: uuid }, email: email };
    const newCustomer = await stripe.customers.create(customerData);
    
    if (!newCustomer) {
      console.error('[ADMIN] Stripe customer creation returned null');
      throw new Error('Stripe customer creation failed.');
    }
    
    console.log('[ADMIN] Successfully created Stripe customer:', newCustomer.id);
    return newCustomer.id;
  } catch (error) {
    console.error('[ADMIN] Stripe customer creation error:', error);
    throw new Error(`Stripe customer creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const createOrRetrieveCustomer = async ({
  email,
  uuid
}: {
  email: string;
  uuid: string;
}) => {
  console.log('[ADMIN] Starting createOrRetrieveCustomer with:', { email, uuid });
  
  const supabase = getSupabaseAdmin();
  
  // Check if the customer already exists in Supabase
  const { data: existingSupabaseCustomer, error: queryError } =
    await supabase
      .from('customers')
      .select('*')
      .eq('id', uuid)
      .maybeSingle();

  if (queryError) {
    console.error('[ADMIN] Supabase customer lookup error:', queryError);
    throw new Error(`Supabase customer lookup failed: ${queryError.message}`);
  }

  console.log('[ADMIN] Existing Supabase customer:', existingSupabaseCustomer);

  // Retrieve the Stripe customer ID using the Supabase customer ID, with email fallback
  let stripeCustomerId: string | undefined;
  if (existingSupabaseCustomer?.stripe_customer_id) {
    try {
      console.log('[ADMIN] Retrieving existing Stripe customer:', existingSupabaseCustomer.stripe_customer_id);
      const existingStripeCustomer = await stripe.customers.retrieve(
        existingSupabaseCustomer.stripe_customer_id
      );
      stripeCustomerId = existingStripeCustomer.id;
      console.log('[ADMIN] Retrieved existing Stripe customer:', stripeCustomerId);
    } catch (stripeError) {
      console.error('[ADMIN] Stripe customer retrieval error:', stripeError);
      // If the Stripe customer doesn't exist, we'll create a new one
      stripeCustomerId = undefined;
    }
  } else {
    // If Stripe ID is missing from Supabase, try to retrieve Stripe customer ID by email
    try {
      console.log('[ADMIN] Searching for Stripe customer by email:', email);
      const stripeCustomers = await stripe.customers.list({ email: email });
      stripeCustomerId =
        stripeCustomers.data.length > 0 ? stripeCustomers.data[0].id : undefined;
      console.log('[ADMIN] Found Stripe customers by email:', stripeCustomers.data.length);
    } catch (stripeError) {
      console.error('[ADMIN] Stripe customer search error:', stripeError);
      stripeCustomerId = undefined;
    }
  }

  // If still no stripeCustomerId, create a new customer in Stripe
  let stripeIdToInsert: string;
  if (stripeCustomerId) {
    stripeIdToInsert = stripeCustomerId;
    console.log('[ADMIN] Using existing Stripe customer ID:', stripeIdToInsert);
  } else {
    console.log('[ADMIN] Creating new Stripe customer for:', { uuid, email });
    stripeIdToInsert = await createCustomerInStripe(uuid, email);
    console.log('[ADMIN] Created new Stripe customer ID:', stripeIdToInsert);
  }
  
  if (!stripeIdToInsert) {
    console.error('[ADMIN] Failed to get or create Stripe customer ID');
    throw new Error('Stripe customer creation failed.');
  }

  if (existingSupabaseCustomer && stripeCustomerId) {
    // If Supabase has a record but doesn't match Stripe, update Supabase record
    if (existingSupabaseCustomer.stripe_customer_id !== stripeCustomerId) {
      console.log('[ADMIN] Updating Supabase customer record with new Stripe ID');
      const { error: updateError } = await supabase
        .from('customers')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', uuid);

      if (updateError) {
        console.error('[ADMIN] Supabase customer update error:', updateError);
        throw new Error(
          `Supabase customer record update failed: ${updateError.message}`
        );
      }
      console.warn(
        `Supabase customer record mismatched Stripe ID. Supabase record updated.`
      );
    }
    // If Supabase has a record and matches Stripe, return Stripe customer ID
    console.log('[ADMIN] Returning existing Stripe customer ID:', stripeCustomerId);
    return stripeCustomerId;
  } else {
    console.warn(
      `Supabase customer record was missing. A new record was created.`
    );

    // If Supabase has no record, create a new record and return Stripe customer ID
    console.log('[ADMIN] Creating new Supabase customer record');
    const upsertedStripeCustomer = await upsertCustomerToSupabase(
      uuid,
      stripeIdToInsert
    );
    if (!upsertedStripeCustomer) {
      console.error('[ADMIN] Failed to upsert customer to Supabase');
      throw new Error('Supabase customer record creation failed.');
    }

    console.log('[ADMIN] Successfully created customer record, returning:', upsertedStripeCustomer);
    return upsertedStripeCustomer;
  }
};

/**
 * Copies the billing details from the payment method to the customer object.
 */
const copyBillingDetailsToCustomer = async (
  uuid: string,
  payment_method: Stripe.PaymentMethod
) => {
  const supabase = getSupabaseAdmin();
  // Ensure payment_method.customer is a string (customer ID)
  const customer = payment_method.customer as string;
  const { name, phone, address } = payment_method.billing_details;
  if (!name || !phone || !address) return;
  
  // Convert address to proper format for Stripe, handling null values
  const stripeAddress = {
    city: address.city || undefined,
    country: address.country || undefined,
    line1: address.line1 || undefined,
    line2: address.line2 || undefined,
    postal_code: address.postal_code || undefined,
    state: address.state || undefined
  };
  
  await stripe.customers.update(customer, { name, phone, address: stripeAddress });
  
  const { error: updateError } = await supabase
    .from('users')
    .update({
      billing_address: { ...address },
      payment_method: { ...payment_method[payment_method.type] }
    })
    .eq('id', uuid);
  if (updateError) throw new Error(`Customer update failed: ${updateError.message}`);
};

const manageSubscriptionStatusChange = async (
  subscriptionId: string,
  customerId: string,
  createAction = false
) => {
  const supabase = getSupabaseAdmin();
  // Get customer's UUID from mapping table.
  const { data: customerData, error: noCustomerError } = await supabase
    .from('customers')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (noCustomerError)
    throw new Error(`Customer lookup failed: ${noCustomerError.message}`);

  const { id: uuid } = customerData!;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method']
  });

  // Get the product name to determine the role
  const priceId = subscription.items.data[0].price.id;
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
    subscriptionId,
    productName: priceData?.products?.name,
    role
  });

  // Upsert the latest status of the subscription object.
  const subscriptionData: TablesInsert<'subscriptions'> = {
    id: subscription.id,
    user_id: uuid,
    metadata: subscription.metadata,
    status: subscription.status,
    price_id: subscription.items.data[0].price.id,
    // Subscription quantity - default to 1 if not specified
    quantity: subscription.items.data[0].quantity || 1,
    role: role, // Set the determined role
    cancel_at_period_end: subscription.cancel_at_period_end,
    cancel_at: subscription.cancel_at
      ? toDateTime(subscription.cancel_at).toISOString()
      : null,
    canceled_at: subscription.canceled_at
      ? toDateTime(subscription.canceled_at).toISOString()
      : null,
    current_period_start: toDateTime(
      subscription.current_period_start
    ).toISOString(),
    current_period_end: toDateTime(
      subscription.current_period_end
    ).toISOString(),
    created: toDateTime(subscription.created).toISOString(),
    ended_at: subscription.ended_at
      ? toDateTime(subscription.ended_at).toISOString()
      : null,
    trial_start: subscription.trial_start
      ? toDateTime(subscription.trial_start).toISOString()
      : null,
    trial_end: subscription.trial_end
      ? toDateTime(subscription.trial_end).toISOString()
      : null
  };

  const { error: upsertError } = await supabase
    .from('subscriptions')
    .upsert([subscriptionData]);
  if (upsertError)
    throw new Error(`Subscription insert/update failed: ${upsertError.message}`);
  console.log(
    `Inserted/updated subscription [${subscription.id}] for user [${uuid}]`
  );

  // For a new subscription copy the billing details to the customer object.
  // NOTE: This is a costly operation and should happen at the very end.
  if (createAction && subscription.default_payment_method && uuid)
    await copyBillingDetailsToCustomer(
      uuid,
      subscription.default_payment_method as Stripe.PaymentMethod
    );
};

export {
  upsertProductRecord,
  upsertPriceRecord,
  deleteProductRecord,
  deletePriceRecord,
  createOrRetrieveCustomer,
  manageSubscriptionStatusChange
};
