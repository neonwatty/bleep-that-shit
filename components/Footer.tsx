export function Footer() {
  return (
    <footer className="mx-auto mt-12 w-full max-w-4xl border-t-2 border-black px-2 py-8 md:px-0">
      <div className="flex flex-col items-center gap-4">
        <div className="text-center text-sm text-gray-700">
          Created by{' '}
          <a
            href="https://x.com/neonwatty"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-black hover:underline"
          >
            neonwatty
          </a>
        </div>
        <div className="flex gap-6">
          <a
            href="https://github.com/neonwatty/bleep-that-shit"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 transition-colors hover:text-black"
            aria-label="GitHub repository"
          >
            <i className="fab fa-github text-2xl"></i>
          </a>
          <a
            href="https://x.com/neonwatty"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 transition-colors hover:text-black"
            aria-label="Follow on X"
          >
            <i className="fab fa-x-twitter text-2xl"></i>
          </a>
          <a
            href="https://neonwatty.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 transition-colors hover:text-black"
            aria-label="Visit blog"
          >
            <i className="fas fa-globe text-2xl"></i>
          </a>
        </div>
        <a
          href="https://neonwatty.com/newsletter/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:from-violet-700 hover:to-indigo-700 hover:shadow-lg"
        >
          📬 Get updates on fun projects
        </a>
        <div className="text-center text-xs text-gray-600">
          © {new Date().getFullYear()} Bleep That Sh*t! All rights reserved.
        </div>
      </div>
    </footer>
  );
}
