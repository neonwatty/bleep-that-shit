import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe, getTierFromPriceId } from '@/lib/stripe/config';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Use service role client for webhook operations (bypasses RLS)
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for webhooks');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(supabase, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabase, invoice);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(supabase, invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Webhook handler failed: ${message}` }, { status: 500 });
  }
}

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof getServiceClient>,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.supabase_user_id;
  const tier = session.metadata?.tier;

  if (!userId) {
    console.error('No user ID in checkout session metadata');
    return;
  }

  // Get subscription details
  const subscriptionId = session.subscription as string;

  if (subscriptionId) {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price.id;
    const resolvedTier = (tier || getTierFromPriceId(priceId)) as
      | 'free'
      | 'starter'
      | 'pro'
      | 'team';

    // Update profile with subscription info
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_tier: resolvedTier,
        subscription_status: 'active',
        stripe_customer_id: session.customer as string,
      })
      .eq('id', userId);

    if (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }

    console.log(`Checkout completed for user ${userId}, tier: ${resolvedTier}`);
  }
}

async function handleSubscriptionUpdate(
  supabase: ReturnType<typeof getServiceClient>,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('id, subscription_tier')
    .eq('stripe_customer_id', customerId)
    .single();

  if (fetchError || !profile) {
    console.error('Could not find user for customer:', customerId);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const newTier = getTierFromPriceId(priceId);

  // Map Stripe subscription status to our status
  let subscriptionStatus: 'active' | 'cancelled' | 'past_due' = 'active';
  if (subscription.status === 'past_due') {
    subscriptionStatus = 'past_due';
  } else if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
    subscriptionStatus = 'cancelled';
  }

  // Calculate subscription end date from the subscription object
  // The period end is available on subscription.items or via API call
  let subscriptionEndsAt: string | null = null;
  if (subscription.cancel_at) {
    subscriptionEndsAt = new Date(subscription.cancel_at * 1000).toISOString();
  } else if (subscription.ended_at) {
    subscriptionEndsAt = new Date(subscription.ended_at * 1000).toISOString();
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_tier: newTier as 'free' | 'starter' | 'pro' | 'team',
      subscription_status: subscriptionStatus,
      subscription_ends_at: subscriptionEndsAt,
    })
    .eq('id', profile.id);

  if (error) {
    console.error('Failed to update subscription:', error);
    throw error;
  }

  console.log(
    `Subscription updated for user ${profile.id}: ${profile.subscription_tier} -> ${newTier}`
  );
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof getServiceClient>,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (fetchError || !profile) {
    console.error('Could not find user for customer:', customerId);
    return;
  }

  // Set to free tier when subscription is deleted
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_tier: 'free',
      subscription_status: 'cancelled',
      subscription_ends_at: new Date().toISOString(),
    })
    .eq('id', profile.id);

  if (error) {
    console.error('Failed to cancel subscription:', error);
    throw error;
  }

  console.log(`Subscription deleted for user ${profile.id}`);
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof getServiceClient>,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string;

  // Find user by Stripe customer ID
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (fetchError || !profile) {
    console.error('Could not find user for customer:', customerId);
    return;
  }

  // Update status to past_due
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'past_due',
    })
    .eq('id', profile.id);

  if (error) {
    console.error('Failed to update payment status:', error);
    throw error;
  }

  console.log(`Payment failed for user ${profile.id}`);
}

async function handleInvoicePaid(
  supabase: ReturnType<typeof getServiceClient>,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string;

  // Find user by Stripe customer ID
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('id, subscription_status')
    .eq('stripe_customer_id', customerId)
    .single();

  if (fetchError || !profile) {
    console.error('Could not find user for customer:', customerId);
    return;
  }

  // If status was past_due, restore to active
  if (profile.subscription_status === 'past_due') {
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
      })
      .eq('id', profile.id);

    if (error) {
      console.error('Failed to update payment status:', error);
      throw error;
    }

    console.log(`Payment successful, status restored for user ${profile.id}`);
  }
}
