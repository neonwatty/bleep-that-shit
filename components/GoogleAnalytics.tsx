'use client';

import Script from 'next/script';

interface GoogleAnalyticsProps {
  gaId: string;
  /** Optional Google Ads conversion ID for conversion tracking (format: AW-XXXXXXXXX) */
  gadsId?: string;
}

export function GoogleAnalytics({ gaId, gadsId }: GoogleAnalyticsProps) {
  // Build the gtag config script
  // If gadsId is provided, also configure Google Ads for conversion tracking
  const configScript = gadsId
    ? `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}');
            gtag('config', '${gadsId}');
          `
    : `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}');
          `;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: configScript,
        }}
      />
    </>
  );
}
