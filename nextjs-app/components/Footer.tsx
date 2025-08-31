export function Footer() {
  return (
    <footer className="w-full max-w-4xl mx-auto py-8 px-2 md:px-0 mt-12 border-t-2 border-black">
      <div className="flex flex-col items-center gap-4">
        <div className="text-center text-sm text-gray-700">
          Built with love using Next.js, Whisper, and FFmpeg
        </div>
        <div className="flex gap-6">
          <a 
            href="https://github.com/neonwatty/bleep-that-sh*t" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-700 hover:text-black transition-colors"
            aria-label="GitHub repository"
          >
            <i className="fab fa-github text-2xl"></i>
          </a>
        </div>
        <div className="text-center text-xs text-gray-600">
          © {new Date().getFullYear()} Bleep That Sh*t! All rights reserved.
        </div>
      </div>
    </footer>
  )
}