import type { Metadata, Viewport } from 'next';
import { Inter, Merriweather } from 'next/font/google';
import './globals.css';
import { MobileNav } from '@/components/MobileNav';
import { BottomTabBar } from '@/components/BottomTabBar';
import { Footer } from '@/components/Footer';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { JsonLd } from '@/components/JsonLd';
import { organizationSchema, websiteSchema } from '@/lib/constants/structuredData';
import { AuthProvider } from '@/providers/AuthProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['700', '900'],
});

const merriweather = Merriweather({
  subsets: ['latin'],
  variable: '--font-merriweather',
  weight: ['400', '700'],
});

// Get base path for production
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const siteUrl = 'https://bleep-that-sht.com';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Bleep That Sh*t! - Free Audio & Video Censorship Tool',
    template: '%s | Bleep That Sh*t!',
  },
  description:
    'Effortlessly bleep out any words or phrases from your audio or video files. 100% private in-browser processing with AI-powered transcription. No uploads required.',
  keywords: [
    'audio censorship',
    'video censorship',
    'bleep audio',
    'censor words',
    'profanity filter',
    'content moderation',
    'audio editing',
    'video editing',
    'browser-based',
    'privacy-focused',
    'Whisper transcription',
    'free audio editor',
  ],
  authors: [{ name: 'Bleep That Sh*t!' }],
  creator: 'Bleep That Sh*t!',
  publisher: 'Bleep That Sh*t!',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [{ url: `${basePath}/favicon.ico` }, { url: `${basePath}/icon.png`, type: 'image/png' }],
    apple: `${basePath}/icon.png`,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Bleep That Sh*t!',
    title: 'Bleep That Sh*t! - Free Audio & Video Censorship Tool',
    description:
      'Effortlessly bleep out any words or phrases from your audio or video files. 100% private in-browser processing with AI-powered transcription.',
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Bleep That Sh*t! - Audio & Video Censorship Tool',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bleep That Sh*t! - Free Audio & Video Censorship Tool',
    description:
      'Effortlessly bleep out any words or phrases from your audio or video files. 100% private in-browser processing.',
    images: [`${siteUrl}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${merriweather.variable}`} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
          crossOrigin="anonymous"
        />
        <JsonLd data={[organizationSchema, websiteSchema]} />
      </head>
      <body className="font-merriweather bg-pattern text-dark min-h-screen" suppressHydrationWarning>
        <AuthProvider>
          <MobileNav />
          <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-20 md:max-w-4xl md:px-0 md:pb-0">
            {children}
            <Footer />
          </main>
          <BottomTabBar />
        </AuthProvider>
      </body>
      <GoogleAnalytics gaId="G-4ECB42TNZG" gadsId="AW-8611321497" />
    </html>
  );
}
