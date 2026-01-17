/**
 * Feature flags for controlling feature visibility across environments.
 *
 * Set NEXT_PUBLIC_AUTH_ENABLED=true in your Vercel staging environment
 * to enable auth features. Leave it unset or false for production.
 */

export const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';
