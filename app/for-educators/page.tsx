import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import {
  SITE_URL,
  createBreadcrumbSchema,
  createFAQPageSchema,
  educatorFAQItems,
} from '@/lib/constants/structuredData';

const educatorPageSchemas = [
  {
    '@type': 'WebPage',
    '@id': `${SITE_URL}/for-educators#webpage`,
    url: `${SITE_URL}/for-educators`,
    name: 'Video Censoring Tool for Educators',
    description:
      'Free browser-based tool for teachers to censor inappropriate language from educational videos.',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#application` },
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: ['teacher', 'professor', 'instructional designer'],
    },
  },
  createBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'For Educators', url: `${SITE_URL}/for-educators` },
  ]),
  createFAQPageSchema(educatorFAQItems),
];

export default function ForEducatorsPage() {
  return (
    <>
      <JsonLd data={educatorPageSchemas} />
      <div className="editorial-section font-merriweather">
        {/* Hero Section */}
        <div className="mb-12 flex flex-col items-center justify-center pt-2 pb-8 text-center sm:mb-16 sm:pt-4 sm:pb-12 md:pt-6 md:pb-20">
          <div className="flex w-full max-w-2xl flex-col gap-5">
            <h1
              className="font-inter mb-2 text-center text-2xl font-extrabold text-black sm:text-3xl md:text-4xl lg:text-5xl"
              style={{ lineHeight: 1.1 }}
            >
              Make Any Video Classroom-Appropriate in Minutes
            </h1>
            <div className="mb-1 text-center text-base text-black sm:text-lg md:text-xl lg:text-2xl">
              Censor inappropriate language from documentaries, YouTube videos, and educational
              content without complex software or IT approval.
            </div>
            <div className="mb-4 text-center text-sm text-black sm:text-base md:text-lg">
              <span className="inline-block rounded-full bg-yellow-200 px-4 py-2 font-bold">
                100% private. Your files never leave your device.
              </span>
            </div>
            <div className="mt-2 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/bleep" className="btn btn-primary">
                Start Censoring - Free
              </Link>
              <a href="#how-it-works" className="btn btn-secondary">
                See How It Works
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-auto my-10 h-0.5 w-24 rounded bg-black md:w-40"></div>

        {/* Use Cases Section */}
        <section className="editorial-section mb-16">
          <h2
            className="font-inter mb-6 text-left text-2xl font-extrabold text-black uppercase sm:text-3xl md:text-4xl"
            style={{ lineHeight: 1.1 }}
          >
            Perfect For
          </h2>
          <div className="grid grid-cols-1 gap-6 text-left sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="mb-2 text-2xl">🎬</div>
              <div className="font-inter mb-1 font-bold text-black">Documentary Clips</div>
              <div className="text-sm text-gray-800 sm:text-base">
                Show civil rights documentaries, war footage, and historical content without
                inappropriate quotes.
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="mb-2 text-2xl">📺</div>
              <div className="font-inter mb-1 font-bold text-black">YouTube Educational Videos</div>
              <div className="text-sm text-gray-800 sm:text-base">
                Use creator content that&apos;s 99% appropriate but has occasional language issues.
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="mb-2 text-2xl">🎤</div>
              <div className="font-inter mb-1 font-bold text-black">TED Talks & Lectures</div>
              <div className="text-sm text-gray-800 sm:text-base">
                Clean up guest speakers and academic presentations for any audience.
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="mb-2 text-2xl">🎥</div>
              <div className="font-inter mb-1 font-bold text-black">
                Film Clips for English Class
              </div>
              <div className="text-sm text-gray-800 sm:text-base">
                Use movie adaptations without worrying about rating concerns.
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="mb-2 text-2xl">📰</div>
              <div className="font-inter mb-1 font-bold text-black">News & Current Events</div>
              <div className="text-sm text-gray-800 sm:text-base">
                Show unscripted interview moments and breaking news safely.
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="mb-2 text-2xl">📜</div>
              <div className="font-inter mb-1 font-bold text-black">Primary Source Recordings</div>
              <div className="text-sm text-gray-800 sm:text-base">
                Use historical audio and video with authentic but sometimes raw content.
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="mx-auto my-10 h-0.5 w-24 rounded bg-black md:w-40"></div>

        {/* Why Educators Choose Us */}
        <section className="editorial-section mb-16">
          <h2
            className="font-inter mb-6 text-left text-2xl font-extrabold text-black uppercase sm:text-3xl md:text-4xl"
            style={{ lineHeight: 1.1 }}
          >
            Why Educators Choose Us
          </h2>
          <div className="grid grid-cols-1 gap-6 text-left sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💻</span>
              <div>
                <div className="font-inter mb-1 font-bold text-black">Works on Chromebooks</div>
                <div className="text-sm text-gray-800 sm:text-base">
                  No software to install. Works on school-managed devices with restricted
                  permissions.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <div className="font-inter mb-1 font-bold text-black">FERPA-Compliant Privacy</div>
                <div className="text-sm text-gray-800 sm:text-base">
                  Files never upload to any server. Everything processes locally in your browser.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🚫</span>
              <div>
                <div className="font-inter mb-1 font-bold text-black">No IT Approval Needed</div>
                <div className="text-sm text-gray-800 sm:text-base">
                  It&apos;s just a website. No downloads, no admin permissions, no IT tickets.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🆓</span>
              <div>
                <div className="font-inter mb-1 font-bold text-black">Free for Educators</div>
                <div className="text-sm text-gray-800 sm:text-base">
                  No subscription fees, no limits. 100% free for classroom use.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <div className="font-inter mb-1 font-bold text-black">
                  Fast Enough for Lesson Prep
                </div>
                <div className="text-sm text-gray-800 sm:text-base">
                  Censor a 10-minute video in 2-3 minutes. Perfect for busy teachers.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <div className="font-inter mb-1 font-bold text-black">Custom Word Lists</div>
                <div className="text-sm text-gray-800 sm:text-base">
                  Create grade-level-specific filters. Reuse them all year.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="mx-auto my-10 h-0.5 w-24 rounded bg-black md:w-40"></div>

        {/* How It Works Section */}
        <section id="how-it-works" className="editorial-section mb-16">
          <h2
            className="font-inter mb-6 text-left text-2xl font-extrabold text-black uppercase sm:text-3xl md:text-4xl"
            style={{ lineHeight: 1.1 }}
          >
            How It Works
          </h2>
          <ol className="mb-8 list-decimal pl-5 text-left text-base sm:pl-6 sm:text-lg md:text-xl">
            <li className="mb-2">
              <span className="font-bold">Upload</span> your video (MP4) or audio (MP3) file.
            </li>
            <li className="mb-2">
              <span className="font-bold">Transcribe</span> with AI for word-level timestamps.
            </li>
            <li className="mb-2">
              <span className="font-bold">Select</span> words to censor or apply your saved word
              lists.
            </li>
            <li className="mb-2">
              <span className="font-bold">Preview & Download</span> your classroom-ready file.
            </li>
          </ol>
          <div className="grid grid-cols-1 gap-8 text-left sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="mb-2 text-2xl md:text-3xl">📤</div>
              <div className="font-inter mb-1 font-bold text-black uppercase">Upload</div>
              <div className="text-sm text-gray-800 sm:text-base md:text-lg">
                Drop in your video (MP4) or audio (MP3) file.
              </div>
            </div>
            <div>
              <div className="mb-2 text-2xl md:text-3xl">🤖</div>
              <div className="font-inter mb-1 font-bold text-black uppercase">Transcribe</div>
              <div className="text-sm text-gray-800 sm:text-base md:text-lg">
                AI generates a word-level transcript automatically.
              </div>
            </div>
            <div>
              <div className="mb-2 text-2xl md:text-3xl">✏️</div>
              <div className="font-inter mb-1 font-bold text-black uppercase">Select</div>
              <div className="text-sm text-gray-800 sm:text-base md:text-lg">
                Pick words to bleep or apply pre-made word lists.
              </div>
            </div>
            <div>
              <div className="mb-2 text-2xl md:text-3xl">⬇️</div>
              <div className="font-inter mb-1 font-bold text-black uppercase">Download</div>
              <div className="text-sm text-gray-800 sm:text-base md:text-lg">
                Preview and save your classroom-ready file.
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="mx-auto my-10 h-0.5 w-24 rounded bg-black md:w-40"></div>

        {/* Demo Video Section */}
        <section className="editorial-section mb-16">
          <h2
            className="font-inter mb-4 text-left text-2xl font-extrabold text-black uppercase sm:text-3xl md:text-4xl"
            style={{ lineHeight: 1.1 }}
          >
            See It In Action
          </h2>
          <div className="mb-6">
            <iframe
              width="100%"
              height="220"
              className="h-full min-h-[180px] w-full rounded-xl border border-gray-200 md:min-h-[320px]"
              src="https://www.youtube.com/embed/wJzTvINvEbo"
              title="Bleep That Sh*t Demo"
              frameBorder="0"
              allowFullScreen
            ></iframe>
          </div>
          <p className="max-w-2xl text-left text-base text-gray-900 sm:text-lg md:text-xl">
            Watch a quick demo showing the complete workflow. From upload to download, you&apos;ll
            see how easy it is to make any video classroom-appropriate.
          </p>
        </section>

        {/* Divider */}
        <div className="mx-auto my-10 h-0.5 w-24 rounded bg-black md:w-40"></div>

        {/* FAQ Section */}
        <section className="editorial-section mb-16">
          <h2
            className="font-inter mb-6 text-left text-2xl font-extrabold text-black uppercase sm:text-3xl md:text-4xl"
            style={{ lineHeight: 1.1 }}
          >
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {educatorFAQItems.map((item, index) => (
              <details
                key={index}
                className="group rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-gray-300"
              >
                <summary className="font-inter cursor-pointer list-none font-bold text-black">
                  <span className="flex items-center justify-between">
                    <span>{item.question}</span>
                    <span className="ml-4 text-gray-400 transition-transform group-open:rotate-180">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </span>
                  </span>
                </summary>
                <p className="mt-3 text-gray-700">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="mx-auto my-10 h-0.5 w-24 rounded bg-black md:w-40"></div>

        {/* Final CTA Section */}
        <section className="editorial-section mb-16 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-8 text-center text-white md:p-12">
          <h2
            className="font-inter mb-4 text-2xl font-extrabold sm:text-3xl md:text-4xl"
            style={{ lineHeight: 1.1 }}
          >
            Ready to Make Your Next Video Classroom-Appropriate?
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-base sm:text-lg md:text-xl">
            No account needed. No software to install. Just upload, censor, and download.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/bleep"
              className="rounded-full bg-white px-8 py-4 text-lg font-bold text-indigo-600 shadow-lg transition-all hover:scale-105 hover:bg-gray-100"
            >
              Start Censoring - Free
            </Link>
            <Link
              href="/bleep?sample=bob-ross"
              className="rounded-full border-2 border-white px-8 py-4 text-lg font-bold text-white transition-all hover:bg-white hover:text-indigo-600"
            >
              Try Sample Video
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
