import { Metadata } from 'next';
import { SITE_URL } from '@/lib/constants/structuredData';

export const metadata: Metadata = {
  title: 'For Educators - Censor Videos for Classroom Use | Bleep That Sh*t!',
  description:
    'Free tool for teachers to censor inappropriate language from educational videos. Works on Chromebooks, no installation required. FERPA-compliant privacy with 100% browser-based processing.',
  keywords: [
    'censor videos for classroom',
    'teacher video editing',
    'educational video censoring',
    'school appropriate videos',
    'bleep words for teachers',
    'FERPA compliant video editing',
    'Chromebook video editing',
    'classroom video tool',
    'documentary censoring for students',
    'free video censor for educators',
  ],
  openGraph: {
    title: 'For Educators - Make Videos Classroom-Appropriate | Bleep That Sh*t!',
    description:
      'Free tool for teachers to censor inappropriate language from educational videos. No installation, works on Chromebooks, 100% private.',
    url: `${SITE_URL}/for-educators`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'For Educators - Make Videos Classroom-Appropriate',
    description:
      'Free tool for teachers to censor educational videos. Works on Chromebooks, no installation required.',
  },
  alternates: {
    canonical: `${SITE_URL}/for-educators`,
  },
};

export default function EducatorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
