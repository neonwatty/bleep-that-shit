import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer', () => {
  const originalDate = Date;

  beforeEach(() => {
    global.Date = class extends Date {
      constructor() {
        super('2025-01-15T00:00:00Z');
      }
      getFullYear() {
        return 2025;
      }
    } as any;
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  it('renders the creator attribution', () => {
    render(<Footer />);
    expect(screen.getByText('Created by')).toBeInTheDocument();
    expect(screen.getByText('neonwatty')).toBeInTheDocument();
  });

  it('renders the creator link with correct attributes', () => {
    render(<Footer />);
    const creatorLink = screen.getByRole('link', { name: 'neonwatty' });
    expect(creatorLink).toHaveAttribute('href', 'https://x.com/neonwatty');
    expect(creatorLink).toHaveAttribute('target', '_blank');
    expect(creatorLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders GitHub link with correct attributes', () => {
    render(<Footer />);
    const githubLink = screen.getByLabelText('GitHub repository');
    expect(githubLink).toHaveAttribute('href', 'https://github.com/neonwatty/bleep-that-shit');
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders X/Twitter link with correct attributes', () => {
    render(<Footer />);
    const twitterLink = screen.getByLabelText('Follow on X');
    expect(twitterLink).toHaveAttribute('href', 'https://x.com/neonwatty');
    expect(twitterLink).toHaveAttribute('target', '_blank');
    expect(twitterLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders blog link with correct attributes', () => {
    render(<Footer />);
    const blogLink = screen.getByLabelText('Visit blog');
    expect(blogLink).toHaveAttribute('href', 'https://neonwatty.com/');
    expect(blogLink).toHaveAttribute('target', '_blank');
    expect(blogLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('displays the current year in copyright', () => {
    render(<Footer />);
    expect(
      screen.getByText(/© 2025 Bleep That Sh\*t! All rights reserved\./i)
    ).toBeInTheDocument();
  });

  it('renders all social media icons', () => {
    const { container } = render(<Footer />);
    const githubIcon = container.querySelector('.fa-github');
    const twitterIcon = container.querySelector('.fa-x-twitter');
    const blogIcon = container.querySelector('.fa-globe');

    expect(githubIcon).toBeInTheDocument();
    expect(twitterIcon).toBeInTheDocument();
    expect(blogIcon).toBeInTheDocument();
  });

  it('renders newsletter subscribe button with correct attributes', () => {
    render(<Footer />);
    const newsletterButton = screen.getByRole('link', { name: /occasional updates on fun projects/i });
    expect(newsletterButton).toHaveAttribute('href', 'https://neonwatty.com/newsletter/');
    expect(newsletterButton).toHaveAttribute('target', '_blank');
    expect(newsletterButton).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('displays newsletter button with emoji', () => {
    render(<Footer />);
    expect(screen.getByText(/📬/)).toBeInTheDocument();
  });
});
