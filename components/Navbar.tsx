import Link from 'next/link';

export function Navbar() {
  return (
    <nav
      data-testid="main-navbar"
      className="mx-auto mb-4 flex w-full max-w-4xl flex-col items-center justify-between border-b-2 border-black px-2 py-6 sm:flex-row md:px-0"
    >
      <div className="mb-4 text-3xl font-extrabold tracking-tight text-black uppercase sm:mb-0 md:text-4xl">
        <Link href="/" data-testid="navbar-logo" className="font-inter hover:underline">
          Bleep That Sh*t!
        </Link>
      </div>

      <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:gap-6">
        <Link
          href="/bleep"
          data-testid="navbar-bleep-link"
          className="font-inter w-full rounded-full bg-black px-6 py-2 text-center text-base font-bold tracking-wider text-white uppercase transition-all hover:bg-gray-900 sm:w-auto"
        >
          Bleep Your Sh*t!
        </Link>
        <Link
          href="/sampler"
          data-testid="navbar-sampler-link"
          className="font-inter w-full rounded-full bg-pink-500 px-6 py-2 text-center text-base font-bold tracking-wider text-white uppercase transition-all hover:bg-pink-600 sm:w-auto"
        >
          Transcription Sampler
        </Link>
      </div>
    </nav>
  );
}
