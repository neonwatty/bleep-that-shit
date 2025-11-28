import Link from 'next/link';

export function BlogCTA() {
  return (
    <div className="my-12 rounded-xl bg-gradient-to-r from-yellow-100 to-pink-100 p-8 text-center">
      <h3 className="font-inter mb-3 text-xl font-bold text-black">Ready to Bleep Your Content?</h3>
      <p className="mb-6 text-gray-700">
        Try our free in-browser tool - no uploads required, 100% private processing.
      </p>
      <Link
        href="/bleep"
        className="inline-block rounded-full bg-black px-6 py-3 font-bold text-white transition-all hover:scale-105 hover:bg-gray-800"
      >
        Bleep Your Sh*t!
      </Link>
    </div>
  );
}
