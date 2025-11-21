'use client';

import { useState } from 'react';
import Link from 'next/link';

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b-2 border-black bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link
            href="/"
            data-testid="navbar-logo"
            className="font-inter text-xl font-extrabold tracking-tight text-black uppercase"
          >
            Bleep That Sh*t!
          </Link>

          {/* Hamburger Menu Button */}
          <button
            onClick={toggleMenu}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-gray-100 focus:outline-none active:bg-gray-200"
            aria-label="Toggle menu"
          >
            <div className="flex w-6 flex-col gap-1.5">
              <span
                className={`block h-0.5 w-full bg-black transition-transform duration-200 ${
                  isOpen ? 'translate-y-2 rotate-45' : ''
                }`}
              />
              <span
                className={`block h-0.5 w-full bg-black transition-opacity duration-200 ${
                  isOpen ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`block h-0.5 w-full bg-black transition-transform duration-200 ${
                  isOpen ? '-translate-y-2 -rotate-45' : ''
                }`}
              />
            </div>
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <div
          className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 ${
            isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={closeMenu}
        />

        {/* Mobile Menu Drawer */}
        <div
          className={`fixed top-0 right-0 z-50 h-full w-72 transform bg-white shadow-xl transition-transform duration-200 ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Menu Header */}
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="font-inter text-lg font-bold uppercase">Menu</h2>
            <button
              onClick={closeMenu}
              className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-gray-100 active:bg-gray-200"
              aria-label="Close menu"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Menu Items */}
          <div className="space-y-4 p-4">
            <Link
              href="/"
              onClick={closeMenu}
              className="block rounded-lg px-4 py-3 text-gray-900 transition-colors hover:bg-gray-100"
            >
              <div className="flex items-center">
                <span className="mr-3 text-2xl">🏠</span>
                <span className="font-semibold">Home</span>
              </div>
            </Link>

            <Link
              href="/bleep"
              onClick={closeMenu}
              data-testid="navbar-bleep-link"
              className="block rounded-lg bg-black px-4 py-3 text-white"
            >
              <div className="flex items-center">
                <span className="mr-3 text-2xl">🎵</span>
                <span className="font-semibold">Bleep Your Sh*t!</span>
              </div>
            </Link>

            <Link
              href="/sampler"
              onClick={closeMenu}
              data-testid="navbar-sampler-link"
              className="block rounded-lg bg-pink-500 px-4 py-3 text-white"
            >
              <div className="flex items-center">
                <span className="mr-3 text-2xl">🎙️</span>
                <span className="font-semibold">Transcription Sampler</span>
              </div>
            </Link>
          </div>

          {/* Social Links */}
          <div className="absolute right-0 bottom-0 left-0 border-t p-4">
            <div className="flex justify-center gap-6">
              <a
                href="https://github.com/neonwatty/bleep-that-shit"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 hover:text-black"
                aria-label="GitHub"
              >
                <i className="fab fa-github text-2xl"></i>
              </a>
              <a
                href="https://x.com/neonwatty"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 hover:text-black"
                aria-label="X"
              >
                <i className="fab fa-x-twitter text-2xl"></i>
              </a>
              <a
                href="https://neonwatty.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 hover:text-black"
                aria-label="Blog"
              >
                <i className="fas fa-globe text-2xl"></i>
              </a>
              <a
                href="https://discord.gg/8EUxqR93"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 hover:text-black"
                aria-label="Discord"
              >
                <i className="fab fa-discord text-2xl"></i>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop Navigation (unchanged) */}
      <nav className="mx-auto mb-4 hidden w-full max-w-4xl flex-col items-center justify-between border-b-2 border-black px-2 py-6 sm:flex-row md:flex md:px-0">
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
    </>
  );
}
