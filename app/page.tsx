import Link from 'next/link'

export default function Home() {
  return (
    <div className="editorial-section font-merriweather px-4 md:px-0">
      {/* Hero Section */}
      <div className="mb-16 flex flex-col items-center justify-center text-center pt-6 md:pt-10 pb-12 md:pb-20 px-2 md:px-0">
        <div className="w-full max-w-2xl flex flex-col gap-5">
          <h1 className="font-inter text-2xl md:text-4xl font-extrabold text-black mb-2 text-center" style={{lineHeight: 1.1}}>
            Effortlessly bleep out any words or phrases from your audio or video.
          </h1>
          <div className="text-base md:text-xl text-black mb-1 text-center">
            Keep your content ad-friendly 😇 or make someone sound naughty 😈.
          </div>
          <div className="text-sm md:text-base text-black mb-4 text-center">
            <span className="bg-yellow-200 px-4 py-2 rounded-full font-bold inline-block">
              100% private. Everything happens in your browser.
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mt-2 justify-center items-center">
            <Link href="/bleep" className="btn btn-primary">
              Bleep Your Sh*t!
            </Link>
            <Link href="/sampler" className="btn btn-pink">
              Try the Sampler
            </Link>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-auto my-10 h-0.5 bg-black w-24 md:w-40 rounded"></div>

      {/* See It In Action Section */}
      <section className="editorial-section mb-16">
        <h2 className="font-inter text-2xl md:text-3xl font-extrabold uppercase text-black mb-4 text-left" style={{lineHeight: 1.1}}>
          See It In Action
        </h2>
        <div className="mb-6">
          <iframe 
            width="100%" 
            height="220" 
            className="rounded-xl border border-gray-200 w-full h-full min-h-[180px] md:min-h-[320px]" 
            src="https://www.youtube.com/embed/wJzTvINvEbo" 
            title="Bleep That Sh*t Demo" 
            frameBorder="0" 
            allowFullScreen
          ></iframe>
        </div>
        <p className="text-base md:text-lg text-gray-900 max-w-2xl text-left">
          Watch a quick demo of bleeped video clips created with Bleep That Sh*t. See how easy it is to censor audio and video content right in your browser!
        </p>
      </section>

      {/* Divider */}
      <div className="mx-auto my-10 h-0.5 bg-black w-24 md:w-40 rounded"></div>

      {/* How It Works Section */}
      <section className="editorial-section mb-16 relative">
        {/* Sticker SVG accent */}
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute right-0 -top-8 md:-right-8 md:-top-8 rotate-12">
          <circle cx="30" cy="30" r="30" fill="#fef9c3"/>
          <text x="30" y="38" textAnchor="middle" fontSize="32" fill="#f59e42" fontFamily="Inter, Arial, sans-serif">⭐</text>
        </svg>
        <h2 className="font-inter text-2xl md:text-3xl font-extrabold uppercase text-black mb-6 text-left" style={{lineHeight: 1.1}}>
          How It Works
        </h2>
        <ol className="list-decimal pl-6 text-left text-base md:text-lg mb-8">
          <li className="mb-2"><span className="font-bold">Upload</span> your audio (MP3) or video (MP4) file.</li>
          <li className="mb-2"><span className="font-bold">Transcribe</span> with your chosen model for a word-level transcript.</li>
          <li className="mb-2"><span className="font-bold">Censor</span> by picking words to bleep (exact, partial, or fuzzy match).</li>
          <li className="mb-2"><span className="font-bold">Preview & Download</span> your censored file.</li>
        </ol>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-left">
          <div>
            <div className="text-2xl md:text-3xl mb-2">🎵</div>
            <div className="font-inter font-bold uppercase text-black mb-1">Upload</div>
            <div className="text-sm md:text-base text-gray-800">Drop in your audio (MP3) or video (MP4) file.</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl mb-2">📣</div>
            <div className="font-inter font-bold uppercase text-black mb-1">Transcribe</div>
            <div className="text-sm md:text-base text-gray-800">Choose a model and get a word-level transcript.</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl mb-2">🔔</div>
            <div className="font-inter font-bold uppercase text-black mb-1">Censor</div>
            <div className="text-sm md:text-base text-gray-800">Pick words to bleep (exact, partial, or fuzzy match).</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl mb-2">⬇️</div>
            <div className="font-inter font-bold uppercase text-black mb-1">Preview & Download</div>
            <div className="text-sm md:text-base text-gray-800">Hear the result and save your censored file.</div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto my-10 h-0.5 bg-black w-24 md:w-40 rounded"></div>

      {/* Privacy & Local Processing Section */}
      <section className="editorial-section mb-16">
        <h2 className="font-inter text-2xl md:text-3xl font-extrabold uppercase text-black mb-4 text-left" style={{lineHeight: 1.1}}>
          Privacy & Local Processing
        </h2>
        <div className="flex items-center mb-2">
          <span className="text-2xl mr-2">🔒</span>
          <span className="bg-yellow-200 px-2 py-1 rounded text-black font-bold">
            Your files never leave your device.
          </span>
        </div>
        <div className="text-sm md:text-base text-gray-800 text-left">
          All processing is done locally in your browser using cutting-edge technologies. No uploads, no cloud, no tracking. Your media and transcripts stay private.
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto my-10 h-0.5 bg-black w-24 md:w-40 rounded"></div>

      {/* Technology Section */}
      <section className="editorial-section mb-16">
        <h2 className="font-inter text-2xl md:text-3xl font-extrabold uppercase text-black mb-4 text-left" style={{lineHeight: 1.1}}>
          Powered by Open Source AI & Web Tech
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-left mb-6">
          <div>
            <div className="text-2xl mb-1">🤗</div>
            <div className="font-inter font-bold uppercase text-black mb-1">huggingface.js</div>
            <div className="text-sm md:text-base text-gray-800">Local Whisper transcription</div>
          </div>
          <div>
            <div className="text-2xl mb-1">🎬</div>
            <div className="font-inter font-bold uppercase text-black mb-1">ffmpeg.wasm</div>
            <div className="text-sm md:text-base text-gray-800">In-browser audio/video processing</div>
          </div>
          <div>
            <div className="text-2xl mb-1">🎚️</div>
            <div className="font-inter font-bold uppercase text-black mb-1">Web Audio API</div>
            <div className="text-sm md:text-base text-gray-800">Precise audio editing & preview</div>
          </div>
          <div>
            <div className="text-2xl mb-1">🎥</div>
            <div className="font-inter font-bold uppercase text-black mb-1">Plyr</div>
            <div className="text-sm md:text-base text-gray-800">Beautiful, interactive media playback</div>
          </div>
        </div>
        <div className="flex justify-center mb-4">
          <a 
            href="https://github.com/neonwatty/bleep-that-sh*t" 
            target="_blank" 
            rel="noopener" 
            className="btn btn-secondary btn-blue flex items-center gap-2" 
            aria-label="GitHub repository"
          >
            GitHub repo
          </a>
        </div>
      </section>
    </div>
  );
}
