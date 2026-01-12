import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';
import { FEEDBACK_FORM_URL } from '@/lib/constants/externalLinks';

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

  it('renders blog link in Quick Links section', () => {
    render(<Footer />);
    const blogLink = screen.getByRole('link', { name: 'Blog' });
    expect(blogLink).toHaveAttribute('href', '/blog');
  });

  it('renders Discord link with correct attributes', () => {
    render(<Footer />);
    const discordLink = screen.getByLabelText('Join Discord community');
    expect(discordLink).toHaveAttribute('href', 'https://discord.gg/XuzjVXyjH4');
    expect(discordLink).toHaveAttribute('target', '_blank');
    expect(discordLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('displays the current year in copyright', () => {
    render(<Footer />);
    expect(screen.getByText(/© 2025 Bleep That Sh\*t!/i)).toBeInTheDocument();
  });

  it('renders all social media icons', () => {
    const { container } = render(<Footer />);
    const githubIcon = container.querySelector('.fa-github');
    const twitterIcon = container.querySelector('.fa-x-twitter');
    const discordIcon = container.querySelector('.fa-discord');

    expect(githubIcon).toBeInTheDocument();
    expect(twitterIcon).toBeInTheDocument();
    expect(discordIcon).toBeInTheDocument();
  });

  it('renders feedback link in More Resources section', () => {
    render(<Footer />);
    const feedbackLink = screen.getByRole('link', { name: 'Share Feedback' });
    expect(feedbackLink).toHaveAttribute('href', FEEDBACK_FORM_URL);
    expect(feedbackLink).toHaveAttribute('target', '_blank');
    expect(feedbackLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders Quick Links section with key pages', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Bleep Tool' })).toHaveAttribute('href', '/bleep');
    expect(screen.getByRole('link', { name: 'For Educators' })).toHaveAttribute(
      'href',
      '/for-educators'
    );
    expect(screen.getByRole('link', { name: 'Premium' })).toHaveAttribute('href', '/premium');
    expect(screen.getByRole('link', { name: 'Sound Sampler' })).toHaveAttribute('href', '/sampler');
  });
});
