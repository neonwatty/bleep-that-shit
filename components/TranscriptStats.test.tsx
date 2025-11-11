import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TranscriptStats } from './TranscriptStats';

describe('TranscriptStats', () => {
  it('displays censored count', () => {
    render(<TranscriptStats censoredCount={5} totalCount={100} />);

    expect(screen.getByText(/5 of 100 words selected/)).toBeInTheDocument();
  });

  it('displays zero count', () => {
    render(<TranscriptStats censoredCount={0} totalCount={50} />);

    expect(screen.getByText(/0 of 50 words selected/)).toBeInTheDocument();
  });

  it('displays all words selected', () => {
    render(<TranscriptStats censoredCount={25} totalCount={25} />);

    expect(screen.getByText(/25 of 25 words selected/)).toBeInTheDocument();
  });
});
