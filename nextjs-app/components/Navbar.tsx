import Link from 'next/link'

export function Navbar() {
  return (
    <nav className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between py-6 px-2 md:px-0 mb-4 border-b-2 border-black">
      <div className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-black mb-4 sm:mb-0">
        <Link href="/" className="hover:underline font-inter">
          Bleep That Sh*t!
        </Link>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 w-full sm:w-auto">
        <Link 
          href="/bleep" 
          className="bg-black text-white font-bold px-6 py-2 rounded-full uppercase tracking-wider text-base hover:bg-gray-900 transition-all w-full sm:w-auto text-center font-inter"
        >
          Bleep Your Sh*t!
        </Link>
        <Link 
          href="/sampler" 
          className="bg-pink-500 text-white font-bold px-6 py-2 rounded-full uppercase tracking-wider text-base hover:bg-pink-600 transition-all w-full sm:w-auto text-center font-inter"
        >
          Transcription Sampler
        </Link>
      </div>
    </nav>
  )
}