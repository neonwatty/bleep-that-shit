import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BottomTabBar } from './BottomTabBar';

// Mock usePathname
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

import { usePathname } from 'next/navigation';

describe('BottomTabBar', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/');
  });

  describe('Tab rendering', () => {
    it('renders all three tabs', () => {
      render(<BottomTabBar />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Bleep')).toBeInTheDocument();
      expect(screen.getByText('Sampler')).toBeInTheDocument();
    });

    it('renders Home tab with correct href', () => {
      render(<BottomTabBar />);

      const homeLink = screen.getByText('Home').closest('a');
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('renders Bleep tab with correct href', () => {
      render(<BottomTabBar />);

      const bleepLink = screen.getByText('Bleep').closest('a');
      expect(bleepLink).toHaveAttribute('href', '/bleep');
    });

    it('renders Sampler tab with correct href', () => {
      render(<BottomTabBar />);

      const samplerLink = screen.getByText('Sampler').closest('a');
      expect(samplerLink).toHaveAttribute('href', '/sampler');
    });
  });

  describe('Active state', () => {
    it('shows Home as active when on home page', () => {
      vi.mocked(usePathname).mockReturnValue('/');
      render(<BottomTabBar />);

      const homeLink = screen.getByText('Home').closest('a');
      expect(homeLink).toHaveClass('text-black');
    });

    it('shows Bleep as active when on bleep page', () => {
      vi.mocked(usePathname).mockReturnValue('/bleep');
      render(<BottomTabBar />);

      const bleepLink = screen.getByText('Bleep').closest('a');
      expect(bleepLink).toHaveClass('text-black');
    });

    it('shows Sampler as active when on sampler page', () => {
      vi.mocked(usePathname).mockReturnValue('/sampler');
      render(<BottomTabBar />);

      const samplerLink = screen.getByText('Sampler').closest('a');
      expect(samplerLink).toHaveClass('text-black');
    });

    it('shows inactive tabs in gray', () => {
      vi.mocked(usePathname).mockReturnValue('/');
      render(<BottomTabBar />);

      const bleepLink = screen.getByText('Bleep').closest('a');
      const samplerLink = screen.getByText('Sampler').closest('a');

      expect(bleepLink).toHaveClass('text-gray-500');
      expect(samplerLink).toHaveClass('text-gray-500');
    });
  });

  describe('Visibility', () => {
    it('is hidden on premium page', () => {
      vi.mocked(usePathname).mockReturnValue('/premium');
      const { container } = render(<BottomTabBar />);

      expect(container.firstChild).toBeNull();
    });

    it('is hidden on blog pages', () => {
      vi.mocked(usePathname).mockReturnValue('/blog/some-post');
      const { container } = render(<BottomTabBar />);

      expect(container.firstChild).toBeNull();
    });

    it('is visible on home page', () => {
      vi.mocked(usePathname).mockReturnValue('/');
      const { container } = render(<BottomTabBar />);

      expect(container.querySelector('nav')).toBeInTheDocument();
    });

    it('is visible on bleep page', () => {
      vi.mocked(usePathname).mockReturnValue('/bleep');
      const { container } = render(<BottomTabBar />);

      expect(container.querySelector('nav')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has fixed positioning', () => {
      const { container } = render(<BottomTabBar />);

      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('fixed');
      expect(nav).toHaveClass('bottom-0');
    });

    it('is hidden on desktop (md breakpoint)', () => {
      const { container } = render(<BottomTabBar />);

      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('md:hidden');
    });

    it('has backdrop blur effect', () => {
      const { container } = render(<BottomTabBar />);

      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('backdrop-blur-sm');
    });

    it('has high z-index for overlay', () => {
      const { container } = render(<BottomTabBar />);

      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('z-50');
    });
  });
});
