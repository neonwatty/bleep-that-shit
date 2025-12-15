import { Metadata } from 'next';
import { SITE_URL } from '@/lib/constants/structuredData';

export const metadata: Metadata = {
  title: 'Premium Features - Coming Soon | Bleep That Sh*t!',
  description:
    'Process 2+ hour files with 10x faster server-side processing. Save projects, re-edit anytime. Join the waitlist for early access.',
  openGraph: {
    title: 'Bleep That Sh*t! Premium - Coming Soon',
    description:
      'Process 2+ hour files 10x faster. Save projects. Team features. Join the waitlist for 50% off.',
    url: `${SITE_URL}/premium`,
    type: 'website',
  },
  alternates: {
    canonical: `${SITE_URL}/premium`,
  },
};

export default function PremiumLayout({ children }: { children: React.ReactNode }) {
  return children;
}
