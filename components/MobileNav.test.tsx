import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MobileNav } from './MobileNav';

describe('MobileNav', () => {
  describe('Mobile header', () => {
    it('renders logo link in mobile header', () => {
      render(<MobileNav />);

      const logos = screen.getAllByTestId('navbar-logo');
      expect(logos.length).toBeGreaterThan(0);
      expect(logos[0]).toHaveTextContent('Bleep That Sh*t!');
      expect(logos[0]).toHaveAttribute('href', '/');
    });

    it('renders centered logo in mobile header', () => {
      const { container } = render(<MobileNav />);

      // Mobile nav should have centered content
      const mobileNav = container.querySelector('.md\\:hidden');
      expect(mobileNav).toBeInTheDocument();
      expect(mobileNav?.querySelector('.justify-center')).toBeInTheDocument();
    });

    it('mobile header is sticky', () => {
      const { container } = render(<MobileNav />);

      const mobileNav = container.querySelector('.sticky');
      expect(mobileNav).toBeInTheDocument();
    });

    it('mobile header has backdrop blur effect', () => {
      const { container } = render(<MobileNav />);

      const mobileNav = container.querySelector('.backdrop-blur-sm');
      expect(mobileNav).toBeInTheDocument();
    });
  });

  describe('Desktop navigation', () => {
    it('renders desktop navigation with logo', () => {
      render(<MobileNav />);

      const logos = screen.getAllByTestId('navbar-logo');
      // Should have both mobile and desktop logos
      expect(logos.length).toBe(2);
    });

    it('renders Bleep link in desktop nav', () => {
      render(<MobileNav />);

      const bleepLinks = screen.getAllByTestId('navbar-bleep-link');
      expect(bleepLinks.length).toBe(1); // Only desktop nav has this link now
      expect(bleepLinks[0]).toHaveAttribute('href', '/bleep');
    });

    it('renders Sampler link in desktop nav', () => {
      render(<MobileNav />);

      const samplerLinks = screen.getAllByTestId('navbar-sampler-link');
      expect(samplerLinks.length).toBe(1); // Only desktop nav has this link now
      expect(samplerLinks[0]).toHaveAttribute('href', '/sampler');
    });

    it('desktop nav is hidden on mobile', () => {
      const { container } = render(<MobileNav />);

      const desktopNav = container.querySelector('.md\\:flex');
      expect(desktopNav).toBeInTheDocument();
      expect(desktopNav?.classList.contains('hidden')).toBe(true);
    });

    it('displays correct text for Bleep link', () => {
      render(<MobileNav />);

      const bleepLinks = screen.getAllByText('Bleep Your Sh*t!');
      expect(bleepLinks.length).toBeGreaterThan(0);
    });

    it('displays correct text for Sampler link', () => {
      render(<MobileNav />);

      const samplerLinks = screen.getAllByText('Transcription Sampler');
      expect(samplerLinks.length).toBeGreaterThan(0);
    });
  });
});
