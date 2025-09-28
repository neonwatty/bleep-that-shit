import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Navbar } from './Navbar';

describe('Navbar', () => {
  it('renders the app title', () => {
    render(<Navbar />);
    expect(screen.getByText('Bleep That Sh*t!')).toBeInTheDocument();
  });

  it('renders the title as a link to home', () => {
    render(<Navbar />);
    const titleLink = screen.getByRole('link', { name: 'Bleep That Sh*t!' });
    expect(titleLink).toHaveAttribute('href', '/');
  });

  it('renders the "Bleep Your Sh*t!" button', () => {
    render(<Navbar />);
    const bleepButton = screen.getByRole('link', { name: /Bleep Your Sh\*t!/i });
    expect(bleepButton).toBeInTheDocument();
    expect(bleepButton).toHaveAttribute('href', '/bleep');
  });

  it('renders the "Transcription Sampler" button', () => {
    render(<Navbar />);
    const samplerButton = screen.getByRole('link', { name: /Transcription Sampler/i });
    expect(samplerButton).toBeInTheDocument();
    expect(samplerButton).toHaveAttribute('href', '/sampler');
  });

  it('has correct styling classes for responsive layout', () => {
    const { container } = render(<Navbar />);
    const nav = container.querySelector('nav');
    expect(nav).toHaveClass('flex-col');
    expect(nav).toHaveClass('sm:flex-row');
  });
});
