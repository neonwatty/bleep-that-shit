import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["700", "900"]
});

const merriweather = Merriweather({ 
  subsets: ["latin"],
  variable: "--font-merriweather",
  weight: ["400", "700"]
});

// Get base path for production
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  title: "Bleep That Sh*t!",
  description: "Effortlessly bleep out any words or phrases from your audio or video. 100% private in-browser processing.",
  icons: {
    icon: `${basePath}/icon.png`,
    apple: `${basePath}/icon.png`
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${merriweather.variable}`}>
      <head>
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" 
          crossOrigin="anonymous" 
        />
      </head>
      <body className="font-merriweather min-h-screen bg-pattern text-dark">
        <main className="w-full max-w-3xl md:max-w-4xl mx-auto flex flex-col flex-1 px-4 md:px-0">
          <Navbar />
          {children}
          <Footer />
        </main>
      </body>
      <GoogleAnalytics gaId="G-4ECB42TNZG" />
    </html>
  );
}
