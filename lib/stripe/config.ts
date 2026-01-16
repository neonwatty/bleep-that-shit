import Stripe from 'stripe';

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

// Subscription tier configuration
export const SUBSCRIPTION_TIERS = {
  starter: {
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    price: 9,
    cloudMinutes: 60,
    maxFileLength: 30, // minutes
    storage: '5 GB',
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    price: 19,
    cloudMinutes: 300,
    maxFileLength: 120, // minutes
    storage: '25 GB',
  },
  team: {
    name: 'Team',
    priceId: process.env.STRIPE_TEAM_PRICE_ID!,
    price: 39,
    cloudMinutes: 600,
    maxFileLength: 120, // minutes
    storage: '100 GB',
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS | 'free';

// Map Stripe price IDs to tier names
export function getTierFromPriceId(priceId: string): SubscriptionTier {
  for (const [tier, config] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (config.priceId === priceId) {
      return tier as SubscriptionTier;
    }
  }
  return 'free';
}

// Get price ID from tier name
export function getPriceIdFromTier(tier: SubscriptionTier): string | null {
  if (tier === 'free') return null;
  return SUBSCRIPTION_TIERS[tier]?.priceId || null;
}
