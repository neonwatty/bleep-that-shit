import Link from 'next/link';

export default function Home() {
  return (
    <div className="editorial-section font-merriweather">
      {/* Hero Section */}
      <div
        data-testid="hero-section"
        className="mb-12 flex flex-col items-center justify-center pt-2 pb-8 text-center sm:mb-16 sm:pt-4 sm:pb-12 md:pt-6 md:pb-20"
      >
        <div className="flex w-full max-w-2xl flex-col gap-5">
          <h1
            className="font-inter mb-2 text-center text-2xl font-extrabold text-black sm:text-3xl md:text-4xl lg:text-5xl"
            style={{ lineHeight: 1.1 }}
          >
            Effortlessly bleep out any words or phrases from your audio or video.
          </h1>
          <div className="mb-1 text-center text-base text-black sm:text-lg md:text-xl lg:text-2xl">
            Keep your content ad-friendly 😇 or make someone sound naughty 😈.
          </div>
          <div className="mb-4 text-center text-sm text-black sm:text-base md:text-lg">
            <span className="inline-block rounded-full bg-yellow-200 px-4 py-2 font-bold">
              100% private. Everything happens in your browser.
            </span>
          </div>
          <div className="mb-4 text-center text-sm text-black sm:text-base md:text-lg">
            <span className="inline-block rounded-full bg-blue-200 px-4 py-2 font-semibold">
              ⏱️ Currently supports files up to 10 minutes
            </span>
          </div>
          <div className="mt-2 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/bleep" data-testid="bleep-button" className="btn btn-primary">
              Bleep Your Sh*t!
            </Link>
            <Link href="/sampler" data-testid="sampler-button" className="btn btn-pink">
              Try the Sampler
            </Link>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-auto my-10 h-0.5 w-24 rounded bg-black md:w-40"></div>

      {/* See It In Action Section */}
      <section className="editorial-section mb-16">
        <h2
          className="font-inter mb-4 text-left text-2xl font-extrabold text-black uppercase sm:text-3xl md:text-4xl"
          style={{ lineHeight: 1.1 }}
        >
          See It In Action
        </h2>
        <div className="mb-6">
          <iframe
            data-testid="demo-video"
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
          Watch a quick demo of bleeped video clips created with Bleep That Sh*t. See how easy it is
          to censor audio and video content right in your browser!
        </p>
      </section>

      {/* Divider */}
      <div className="mx-auto my-10 h-0.5 w-24 rounded bg-black md:w-40"></div>

      {/* How It Works Section */}
      <section data-testid="how-it-works-section" className="editorial-section relative mb-16">
        {/* Sticker SVG accent */}
        <svg
          width="60"
          height="60"
          viewBox="0 0 60 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute -top-8 right-0 rotate-12 md:-top-8 md:-right-8"
        >
          <circle cx="30" cy="30" r="30" fill="#fef9c3" />
          <text
            x="30"
            y="38"
            textAnchor="middle"
            fontSize="32"
            fill="#f59e42"
            fontFamily="Inter, Arial, sans-serif"
          >
            ⭐
          </text>
        </svg>
        <h2
          className="font-inter mb-6 text-left text-2xl font-extrabold text-black uppercase sm:text-3xl md:text-4xl"
          style={{ lineHeight: 1.1 }}
        >
          How It Works
        </h2>
        <ol className="mb-8 list-decimal pl-5 text-left text-base sm:pl-6 sm:text-lg md:text-xl">
          <li className="mb-2">
            <span className="font-bold">Upload</span> your audio (MP3) or video (MP4) file.
          </li>
          <li className="mb-2">
            <span className="font-bold">Transcribe</span> with your chosen model for a word-level
            transcript.
          </li>
          <li className="mb-2">
            <span className="font-bold">Censor</span> by picking words to bleep (exact, partial, or
            fuzzy match).
          </li>
          <li className="mb-2">
            <span className="font-bold">Preview & Download</span> your censored file.
          </li>
        </ol>
        <div className="grid grid-cols-1 gap-8 text-left sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-2 text-2xl md:text-3xl">🎵</div>
            <div className="font-inter mb-1 font-bold text-black uppercase">Upload</div>
            <div className="text-sm text-gray-800 sm:text-base md:text-lg">
              Drop in your audio (MP3) or video (MP4) file.
            </div>
          </div>
          <div>
            <div className="mb-2 text-2xl md:text-3xl">📣</div>
            <div className="font-inter mb-1 font-bold text-black uppercase">Transcribe</div>
            <div className="text-sm text-gray-800 sm:text-base md:text-lg">
              Choose a model and get a word-level transcript.
            </div>
          </div>
          <div>
            <div className="mb-2 text-2xl md:text-3xl">🔔</div>
            <div className="font-inter mb-1 font-bold text-black uppercase">Censor</div>
            <div className="text-sm text-gray-800 sm:text-base md:text-lg">
              Pick words to bleep (exact, partial, or fuzzy match).
            </div>
          </div>
          <div>
            <div className="mb-2 text-2xl md:text-3xl">⬇️</div>
            <div className="font-inter mb-1 font-bold text-black uppercase">Preview & Download</div>
            <div className="text-sm text-gray-800 sm:text-base md:text-lg">
              Hear the result and save your censored file.
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto my-10 h-0.5 w-24 rounded bg-black md:w-40"></div>

      {/* Privacy & Local Processing Section */}
      <section data-testid="privacy-section" className="editorial-section mb-16">
        <h2
          className="font-inter mb-4 text-left text-2xl font-extrabold text-black uppercase sm:text-3xl md:text-4xl"
          style={{ lineHeight: 1.1 }}
        >
          Privacy & Local Processing
        </h2>
        <div className="mb-2 flex items-center">
          <span className="mr-2 text-2xl">🔒</span>
          <span className="rounded bg-yellow-200 px-2 py-1 font-bold text-black">
            Your files never leave your device.
          </span>
        </div>
        <div className="text-left text-base text-gray-800 md:text-lg">
          All processing is done locally in your browser using cutting-edge technologies. No
          uploads, no cloud, no tracking. Your media and transcripts stay private.
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto my-10 h-0.5 w-24 rounded bg-black md:w-40"></div>

      {/* Technology Section */}
      <section data-testid="technology-section" className="editorial-section mb-16">
        <h2
          className="font-inter mb-4 text-left text-2xl font-extrabold text-black uppercase sm:text-3xl md:text-4xl"
          style={{ lineHeight: 1.1 }}
        >
          Powered by Open Source AI & Web Tech
        </h2>
        <div className="mb-6 grid grid-cols-1 gap-8 text-left sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-1 text-2xl">🤗</div>
            <div className="font-inter mb-1 font-bold text-black uppercase">huggingface.js</div>
            <div className="text-sm text-gray-800 sm:text-base md:text-lg">
              Local Whisper transcription
            </div>
          </div>
          <div>
            <div className="mb-1 text-2xl">🎬</div>
            <div className="font-inter mb-1 font-bold text-black uppercase">ffmpeg.wasm</div>
            <div className="text-sm text-gray-800 sm:text-base md:text-lg">
              In-browser audio/video processing
            </div>
          </div>
          <div>
            <div className="mb-1 text-2xl">🎚️</div>
            <div className="font-inter mb-1 font-bold text-black uppercase">Web Audio API</div>
            <div className="text-sm text-gray-800 sm:text-base md:text-lg">
              Precise audio editing & preview
            </div>
          </div>
          <div>
            <div className="mb-1 text-2xl">🎥</div>
            <div className="font-inter mb-1 font-bold text-black uppercase">Plyr</div>
            <div className="text-sm text-gray-800 sm:text-base md:text-lg">
              Beautiful, interactive media playback
            </div>
          </div>
        </div>
        <div className="mb-4 flex justify-center">
          <a
            data-testid="github-link"
            href="https://github.com/neonwatty/bleep-that-shit"
            target="_blank"
            rel="noopener"
            className="btn btn-secondary btn-blue flex items-center gap-2"
            aria-label="GitHub repository"
          >
            GitHub repo
          </a>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto my-10 h-0.5 w-24 rounded bg-black md:w-40"></div>

      {/* Community Section */}
      <section data-testid="community-section" className="editorial-section mb-16">
        <div className="flex flex-col items-center text-center">
          <h2
            className="font-inter mb-4 text-2xl font-extrabold text-black uppercase sm:text-3xl md:text-4xl"
            style={{ lineHeight: 1.1 }}
          >
            Join Our Community
          </h2>
          <p className="mb-6 max-w-xl text-base text-gray-800 sm:text-lg md:text-xl">
            Have questions, feature requests, or found a bug? Join our Discord community to get
            help, share feedback, and stay updated on new features and improvements.
          </p>
          <a
            data-testid="discord-link"
            href="https://discord.gg/8EUxqR93"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3.5 text-base font-semibold text-white transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg sm:text-lg"
          >
            <i className="fab fa-discord text-2xl"></i>
            <span>Join Discord</span>
          </a>
        </div>
      </section>
    </div>
  );
}
