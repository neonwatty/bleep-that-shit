'use client';

import Link from 'next/link';
import { PREMIUM_WAITLIST_FORM_URL, DISCORD_URL } from '@/lib/constants/externalLinks';
import { trackEvent } from '@/lib/analytics';

const features = [
  {
    emoji: '⚡',
    title: '10x Faster Processing',
    description: 'Server-side OpenAI Whisper API',
  },
  {
    emoji: '⏱️',
    title: '2+ Hour Files',
    description: 'No more 10-minute limits',
  },
  {
    emoji: '💾',
    title: 'Saved Projects',
    description: 'Pick up where you left off',
  },
  {
    emoji: '🔄',
    title: 'Project History',
    description: 'Re-edit and re-export anytime',
  },
];

const useCases = [
  {
    emoji: '👩‍🏫',
    title: 'Teachers & Educators',
    description:
      'Show real-world content in your classroom without worrying about inappropriate language.',
    quote:
      '"I use documentaries in my history class but had to skip certain clips. Now I can show the full video."',
    bgClass: 'from-blue-500/20 to-blue-600/10',
    borderClass: 'border-blue-500/30',
    quoteClass: 'text-blue-400',
  },
  {
    emoji: '🎙️',
    title: 'Podcasters',
    description:
      'Create ad-friendly versions of your 2+ hour episodes in minutes instead of hours.',
    quote:
      '"Our interviews get heated sometimes. Now I can quickly make a clean version for YouTube."',
    bgClass: 'from-purple-500/20 to-purple-600/10',
    borderClass: 'border-purple-500/30',
    quoteClass: 'text-purple-400',
  },
  {
    emoji: '🎬',
    title: 'YouTube Creators',
    description:
      'Keep your videos monetization-safe without losing authenticity or spending hours editing.',
    quote: '"My gaming videos always had slip-ups. Now I bleep them out in minutes."',
    bgClass: 'from-red-500/20 to-red-600/10',
    borderClass: 'border-red-500/30',
    quoteClass: 'text-red-400',
  },
  {
    emoji: '👥',
    title: 'Production Teams',
    description:
      'Standardize censoring across your team with shared wordsets and project collaboration.',
    quote:
      '"We process client videos daily. Shared wordsets mean everyone uses the same standards."',
    bgClass: 'from-green-500/20 to-green-600/10',
    borderClass: 'border-green-500/30',
    quoteClass: 'text-green-400',
  },
];

export default function PremiumPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero - Split Layout */}
      <section className="flex min-h-screen flex-col lg:flex-row">
        {/* Left: Typography */}
        <div className="relative flex flex-1 flex-col justify-center px-8 py-16 lg:px-16">
          {/* Gradient orb */}
          <div className="absolute top-20 left-0 h-96 w-96 rounded-full bg-indigo-600 opacity-20 blur-[180px]" />

          <div className="relative z-10">
            <span className="mb-6 inline-block rounded bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1 text-xs font-bold tracking-wider uppercase">
              Coming Soon
            </span>

            <h1 className="font-inter leading-[0.85] font-black tracking-tight uppercase">
              <span className="block text-5xl md:text-7xl lg:text-8xl">Bleep</span>
              <span className="block bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-5xl text-transparent md:text-7xl lg:text-8xl">
                Faster.
              </span>
              <span className="block bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-5xl text-transparent md:text-7xl lg:text-8xl">
                Longer.
              </span>
              <span className="block bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-5xl text-transparent md:text-7xl lg:text-8xl">
                Smarter.
              </span>
            </h1>

            <p className="font-merriweather mt-8 max-w-md text-xl text-gray-400">
              Premium unlocks server-powered processing, 2+ hour files, and saved projects.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href="#waitlist"
                className="inline-block bg-white px-8 py-4 text-center text-lg font-bold text-black transition-all hover:bg-gray-100"
                onClick={() => trackEvent('premium_cta_clicked', { location: 'hero' })}
              >
                Join Waitlist →
              </a>
              <a
                href="#features"
                className="inline-block border border-gray-700 px-8 py-4 text-center text-lg font-bold transition-all hover:bg-white/5"
              >
                See Features
              </a>
            </div>
          </div>
        </div>

        {/* Right: Feature Stack */}
        <div className="flex flex-1 items-center justify-center bg-gray-950/50 px-8 py-16 lg:px-16">
          <div className="w-full max-w-md space-y-4">
            {features.map(feature => (
              <div
                key={feature.title}
                className="rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[2px]"
              >
                <div className="flex items-center gap-4 rounded-xl bg-black p-6">
                  <div className="text-4xl">{feature.emoji}</div>
                  <div>
                    <h3 className="font-inter text-lg font-bold">{feature.title}</h3>
                    <p className="text-sm text-gray-500">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
            <div className="pt-4 text-center">
              <p className="text-sm text-gray-600">+ Team sharing, priority support, and more</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            <div>
              <div className="text-3xl font-black md:text-4xl">10K+</div>
              <div className="text-sm text-white/70">Files Processed</div>
            </div>
            <div>
              <div className="text-3xl font-black md:text-4xl">500+</div>
              <div className="text-sm text-white/70">Discord Members</div>
            </div>
            <div>
              <div className="text-3xl font-black md:text-4xl">100%</div>
              <div className="text-sm text-white/70">Privacy First</div>
            </div>
            <div>
              <div className="text-3xl font-black md:text-4xl">10x</div>
              <div className="text-sm text-white/70">Faster (Premium)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="features" className="bg-black px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-inter mb-4 text-center text-3xl font-black uppercase md:text-5xl">
            Built For Creators
          </h2>
          <p className="mx-auto mb-16 max-w-xl text-center text-gray-500">
            Whether you&apos;re a teacher, podcaster, or content creator - premium gives you the
            tools to work faster.
          </p>

          <div className="space-y-16">
            {useCases.map((useCase, index) => (
              <div
                key={useCase.title}
                className={`flex flex-col items-center gap-8 ${
                  index % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'
                }`}
              >
                <div
                  className={`flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-2xl border bg-gradient-to-br ${useCase.bgClass} ${useCase.borderClass}`}
                >
                  <span className="text-6xl">{useCase.emoji}</span>
                </div>
                <div className={index % 2 === 1 ? 'md:text-right' : ''}>
                  <h3 className="font-inter mb-2 text-2xl font-bold uppercase">{useCase.title}</h3>
                  <p className="font-merriweather mb-3 text-lg text-gray-400">
                    {useCase.description}
                  </p>
                  <p className={`text-sm italic ${useCase.quoteClass}`}>{useCase.quote}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free vs Premium Comparison */}
      <section className="bg-gray-950 px-4 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-inter mb-12 text-3xl font-black uppercase">Free Stays Free</h2>

          <div className="grid gap-8 text-left md:grid-cols-2">
            <div>
              <h3 className="font-inter mb-4 text-lg font-bold text-gray-500 uppercase">
                Free Forever
              </h3>
              <ul className="space-y-3 text-gray-400">
                <li>✓ 10 minute files</li>
                <li>✓ Browser processing</li>
                <li>✓ 100% private</li>
                <li>✓ Save wordsets locally</li>
              </ul>
            </div>
            <div>
              <h3 className="font-inter mb-4 text-lg font-bold text-indigo-400 uppercase">
                Premium Adds
              </h3>
              <ul className="space-y-3">
                <li>✓ 2+ hour files</li>
                <li>✓ 10x faster server processing</li>
                <li>✓ Saved projects</li>
                <li>✓ Project history & re-export</li>
                <li>✓ Team features</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist CTA */}
      <section id="waitlist" className="relative overflow-hidden bg-black px-4 py-24">
        {/* Gradient background */}
        <div className="absolute bottom-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 transform rounded-full bg-gradient-to-t from-indigo-600/20 to-transparent blur-3xl" />

        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <h2 className="font-inter mb-8 text-5xl leading-none font-black uppercase md:text-7xl">
            Get
            <br />
            Early
            <br />
            Access
          </h2>
          <p className="font-merriweather mb-4 text-xl text-gray-400">
            Join the waitlist and lock in <span className="font-bold text-white">50% off</span> for
            3 months.
          </p>
          <p className="mb-8 text-gray-600">
            Free version stays free forever. Premium is for power users.
          </p>
          <a
            href={PREMIUM_WAITLIST_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-12 py-5 text-xl font-bold shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 hover:from-indigo-500 hover:to-purple-500"
            onClick={() => trackEvent('premium_waitlist_clicked', { location: 'cta_section' })}
          >
            Join Premium Waitlist →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-900 bg-black px-4 py-8 text-center">
        <Link href="/" className="text-gray-500 transition-colors hover:text-white">
          ← Back to Bleep That Sh*t!
        </Link>
        <div className="mt-4">
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 transition-colors hover:text-indigo-400"
            aria-label="Join our Discord"
          >
            <i className="fab fa-discord text-xl" />
          </a>
        </div>
      </footer>
    </div>
  );
}
