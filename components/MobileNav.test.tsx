import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileNav } from './MobileNav';
import { WalkthroughProvider } from './walkthrough/WalkthroughProvider';

// Wrapper to provide WalkthroughContext
const renderMobileNav = () =>
  render(
    <WalkthroughProvider>
      <MobileNav />
    </WalkthroughProvider>
  );

describe('MobileNav', () => {
  describe('Logo rendering', () => {
    it('renders logo link on mobile navigation', () => {
      renderMobileNav();

      const logos = screen.getAllByTestId('navbar-logo');
      expect(logos.length).toBeGreaterThan(0);
      logos.forEach(logo => {
        expect(logo).toHaveTextContent('Bleep That Sh*t!');
        expect(logo).toHaveAttribute('href', '/');
      });
    });
  });

  describe('Hamburger menu', () => {
    it('renders hamburger menu button with correct aria-label', () => {
      renderMobileNav();

      const menuButton = screen.getByLabelText('Toggle menu');
      expect(menuButton).toBeInTheDocument();
    });

    it('menu drawer is initially closed', () => {
      const { container } = renderMobileNav();

      const drawer = container.querySelector('.translate-x-full');
      expect(drawer).toBeInTheDocument();
    });

    it('opens menu drawer when hamburger is clicked', () => {
      const { container } = renderMobileNav();

      const menuButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(menuButton);

      const drawer = container.querySelector('.translate-x-0');
      expect(drawer).toBeInTheDocument();
    });

    it('closes menu drawer when hamburger is clicked again', () => {
      const { container } = renderMobileNav();

      const menuButton = screen.getByLabelText('Toggle menu');

      // Open menu
      fireEvent.click(menuButton);
      expect(container.querySelector('.translate-x-0')).toBeInTheDocument();

      // Close menu
      fireEvent.click(menuButton);
      expect(container.querySelector('.translate-x-full')).toBeInTheDocument();
    });

    it('shows menu header when drawer is open', () => {
      renderMobileNav();

      const menuButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(menuButton);

      expect(screen.getByText('Menu')).toBeInTheDocument();
    });

    it('renders close button in drawer with correct aria-label', () => {
      renderMobileNav();

      const menuButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(menuButton);

      expect(screen.getByLabelText('Close menu')).toBeInTheDocument();
    });

    it('closes menu when close button is clicked', () => {
      const { container } = renderMobileNav();

      const menuButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(menuButton);

      const closeButton = screen.getByLabelText('Close menu');
      fireEvent.click(closeButton);

      expect(container.querySelector('.translate-x-full')).toBeInTheDocument();
    });

    it('closes menu when overlay is clicked', () => {
      const { container } = renderMobileNav();

      const menuButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(menuButton);

      // Find and click overlay
      const overlay = container.querySelector('.bg-black\\/50');
      if (overlay) fireEvent.click(overlay);

      expect(container.querySelector('.translate-x-full')).toBeInTheDocument();
    });

    it('overlay is not visible when menu is closed', () => {
      const { container } = renderMobileNav();

      const overlay = container.querySelector('.opacity-0');
      expect(overlay).toBeInTheDocument();
    });

    it('overlay is visible when menu is open', () => {
      const { container } = renderMobileNav();

      const menuButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(menuButton);

      const overlay = container.querySelector('.opacity-100');
      expect(overlay).toBeInTheDocument();
    });
  });

  describe('Navigation links', () => {
    it('renders Home link in mobile menu', () => {
      renderMobileNav();

      const menuButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(menuButton);

      const homeLink = screen.getByText('Home').closest('a');
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('renders Bleep link in mobile menu', () => {
      renderMobileNav();

      const menuButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(menuButton);

      const bleepLinks = screen.getAllByTestId('navbar-bleep-link');
      expect(bleepLinks.length).toBeGreaterThan(0);
      bleepLinks.forEach(link => {
        expect(link).toHaveAttribute('href', '/bleep');
      });
    });

    it('renders Sampler link in mobile menu', () => {
      renderMobileNav();

      const menuButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(menuButton);

      const samplerLinks = screen.getAllByTestId('navbar-sampler-link');
      expect(samplerLinks.length).toBeGreaterThan(0);
      samplerLinks.forEach(link => {
        expect(link).toHaveAttribute('href', '/sampler');
      });
    });

    it('displays correct text for Bleep link', () => {
      renderMobileNav();

      const menuButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(menuButton);

      const bleepLinks = screen.getAllByText('Bleep Your Sh*t!');
      expect(bleepLinks.length).toBeGreaterThan(0);
    });

    it('displays correct text for Sampler link', () => {
      renderMobileNav();

      const menuButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(menuButton);

      const samplerLinks = screen.getAllByText('Transcription Sampler');
      expect(samplerLinks.length).toBeGreaterThan(0);
    });

    it('closes menu when Home link is clicked', () => {
      const { container } = renderMobileNav();

      const menuButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(menuButton);

      const homeLink = screen.getByText('Home').closest('a');
      if (homeLink) fireEvent.click(homeLink);

      expect(container.querySelector('.translate-x-full')).toBeInTheDocument();
    });

    it('closes menu when Bleep link is clicked', () => {
      const { container } = renderMobileNav();

      const menuButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(menuButton);

      const bleepLinks = screen.getAllByText('Bleep Your Sh*t!');
      const bleepLink = bleepLinks[0]?.closest('a');
      if (bleepLink) fireEvent.click(bleepLink);

      expect(container.querySelector('.translate-x-full')).toBeInTheDocument();
    });

    it('closes menu when Sampler link is clicked', () => {
      const { container } = renderMobileNav();

      const menuButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(menuButton);

      const samplerLinks = screen.getAllByText('Transcription Sampler');
      const samplerLink = samplerLinks[0]?.closest('a');
      if (samplerLink) fireEvent.click(samplerLink);

      expect(container.querySelector('.translate-x-full')).toBeInTheDocument();
    });
  });

  describe('Social links', () => {
    it('renders GitHub social link', () => {
      renderMobileNav();

      const menuButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(menuButton);

      const githubLink = screen.getByLabelText('GitHub');
      expect(githubLink).toHaveAttribute('href', 'https://github.com/neonwatty/bleep-that-shit');
      expect(githubLink).toHaveAttribute('target', '_blank');
      expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders X (Twitter) social link', () => {
      renderMobileNav();

      const menuButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(menuButton);

      const xLink = screen.getByLabelText('X');
      expect(xLink).toHaveAttribute('href', 'https://x.com/neonwatty');
      expect(xLink).toHaveAttribute('target', '_blank');
      expect(xLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders Blog social link', () => {
      renderMobileNav();

      const menuButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(menuButton);

      const blogLink = screen.getByLabelText('Blog');
      expect(blogLink).toHaveAttribute('href', 'https://neonwatty.com/');
      expect(blogLink).toHaveAttribute('target', '_blank');
      expect(blogLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders Discord social link', () => {
      renderMobileNav();

      const menuButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(menuButton);

      const discordLink = screen.getByLabelText('Discord');
      expect(discordLink).toHaveAttribute('href', 'https://discord.gg/XuzjVXyjH4');
      expect(discordLink).toHaveAttribute('target', '_blank');
      expect(discordLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Desktop navigation', () => {
    it('renders desktop navigation elements', () => {
      renderMobileNav();

      const logos = screen.getAllByTestId('navbar-logo');
      expect(logos.length).toBe(2); // One for mobile, one for desktop
    });

    it('renders Bleep link in desktop nav', () => {
      renderMobileNav();

      const bleepLinks = screen.getAllByTestId('navbar-bleep-link');
      expect(bleepLinks.length).toBe(2); // One for mobile, one for desktop
    });

    it('renders Sampler link in desktop nav', () => {
      renderMobileNav();

      const samplerLinks = screen.getAllByTestId('navbar-sampler-link');
      expect(samplerLinks.length).toBe(2); // One for mobile, one for desktop
    });
  });
});
