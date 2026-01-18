'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { version as packageVersion } from '../package.json';
import { FEEDBACK_FORM_URL } from '@/lib/constants/externalLinks';

// Use release tag version in production, fallback to package.json
const version = process.env.NEXT_PUBLIC_APP_VERSION || packageVersion;

export function Footer() {
  const pathname = usePathname();

  // Hide footer on premium landing page (has its own footer)
  if (pathname === '/premium') {
    return null;
  }

  return (
    <footer className="mx-auto mt-12 w-full border-t-2 border-black bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="text-lg font-bold text-black">
              Bleep That Sh*t!
            </Link>
            <p className="mt-2 text-sm text-gray-600">
              Free online tool to bleep and censor words in your videos. No download required.
            </p>
            {/* Social Links */}
            <div className="mt-4 flex gap-4">
              <a
                href="https://github.com/neonwatty/bleep-that-shit"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 transition-colors hover:text-black"
                aria-label="GitHub repository"
              >
                <i className="fab fa-github text-xl"></i>
              </a>
              <a
                href="https://x.com/neonwatty"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 transition-colors hover:text-black"
                aria-label="Follow on X"
              >
                <i className="fab fa-x-twitter text-xl"></i>
              </a>
              <a
                href="https://discord.gg/XuzjVXyjH4"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 transition-colors hover:text-black"
                aria-label="Join Discord community"
              >
                <i className="fab fa-discord text-xl"></i>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-3 font-semibold text-black">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-600 hover:text-black">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/bleep" className="text-gray-600 hover:text-black">
                  Bleep Tool
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-600 hover:text-black">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/for-educators" className="text-gray-600 hover:text-black">
                  For Educators
                </Link>
              </li>
              <li>
                <Link href="/premium" className="text-gray-600 hover:text-black">
                  Premium
                </Link>
              </li>
              <li>
                <Link href="/sampler" className="text-gray-600 hover:text-black">
                  Sound Sampler
                </Link>
              </li>
            </ul>
          </div>

          {/* Popular Guides */}
          <div>
            <h3 className="mb-3 font-semibold text-black">Popular Guides</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/blog/how-to-bleep-words-in-video"
                  className="text-gray-600 hover:text-black"
                >
                  How to Bleep Words in Video
                </Link>
              </li>
              <li>
                <Link
                  href="/blog/censor-videos-for-classroom-teacher-guide"
                  className="text-gray-600 hover:text-black"
                >
                  Censor Videos for Classroom
                </Link>
              </li>
              <li>
                <Link
                  href="/blog/bleep-youtube-videos-before-upload"
                  className="text-gray-600 hover:text-black"
                >
                  Bleep YouTube Videos
                </Link>
              </li>
              <li>
                <Link
                  href="/blog/censor-audio-video-online-free"
                  className="text-gray-600 hover:text-black"
                >
                  Censor Audio & Video Free
                </Link>
              </li>
              <li>
                <Link
                  href="/blog/how-to-censor-videos-on-chromebook"
                  className="text-gray-600 hover:text-black"
                >
                  Censor Videos on Chromebook
                </Link>
              </li>
            </ul>
          </div>

          {/* More Resources */}
          <div>
            <h3 className="mb-3 font-semibold text-black">More Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/blog/bleep-out-words-video-free-online"
                  className="text-gray-600 hover:text-black"
                >
                  Bleep Out Words Free Online
                </Link>
              </li>
              <li>
                <Link
                  href="/blog/bleep-words-video-without-capcut-imovie-premiere"
                  className="text-gray-600 hover:text-black"
                >
                  Bleep Without CapCut/iMovie
                </Link>
              </li>
              <li>
                <a
                  href={FEEDBACK_FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-black"
                >
                  Share Feedback
                </a>
              </li>
            </ul>
            {/* CTA Button */}
            <div className="mt-4">
              <Link
                href="/bleep"
                className="inline-block rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-gray-800"
              >
                Try It Free →
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-6 sm:flex-row">
          <div className="text-center text-sm text-gray-600">
            Created by{' '}
            <a
              href="https://x.com/neonwatty"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-black hover:underline"
            >
              neonwatty
            </a>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>© {new Date().getFullYear()} Bleep That Sh*t!</span>
            <span>•</span>
            <span>v{version}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
