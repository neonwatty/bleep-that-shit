import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TranscriptReview } from './TranscriptReview';

describe('TranscriptReview', () => {
  const chunks = [
    { text: 'Hello', timestamp: [0.0, 0.5] as [number, number] },
    { text: 'world.', timestamp: [0.5, 1.0] as [number, number] },
    { text: 'How', timestamp: [1.0, 1.3] as [number, number] },
    { text: 'are', timestamp: [1.3, 1.6] as [number, number] },
    { text: 'you?', timestamp: [1.6, 2.0] as [number, number] },
  ];

  it('shows placeholder when no transcript available', () => {
    render(<TranscriptReview chunks={[]} censoredIndices={new Set()} onToggleWord={vi.fn()} />);

    expect(screen.getByText(/No transcript available/)).toBeInTheDocument();
  });

  it('renders transcript with sentences', () => {
    render(<TranscriptReview chunks={chunks} censoredIndices={new Set()} onToggleWord={vi.fn()} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('world.')).toBeInTheDocument();
  });

  it('displays stats with correct counts', () => {
    const censoredIndices = new Set([0, 2]);
    render(
      <TranscriptReview chunks={chunks} censoredIndices={censoredIndices} onToggleWord={vi.fn()} />
    );

    expect(screen.getByText(/2 of 5 words selected/)).toBeInTheDocument();
  });

  it('toggles expansion when button clicked', async () => {
    const handleToggle = vi.fn();
    render(
      <TranscriptReview
        chunks={chunks}
        censoredIndices={new Set()}
        onToggleWord={vi.fn()}
        isExpanded={true}
        onToggleExpanded={handleToggle}
      />
    );

    const toggleButton = screen.getByRole('button', { name: /Collapse Transcript/ });
    await userEvent.click(toggleButton);
    expect(handleToggle).toHaveBeenCalled();
  });

  it('shows Expand text when collapsed', () => {
    render(
      <TranscriptReview
        chunks={chunks}
        censoredIndices={new Set()}
        onToggleWord={vi.fn()}
        isExpanded={false}
        onToggleExpanded={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Expand Transcript/ })).toBeInTheDocument();
  });

  it('hides transcript content when collapsed', () => {
    render(
      <TranscriptReview
        chunks={chunks}
        censoredIndices={new Set()}
        onToggleWord={vi.fn()}
        isExpanded={false}
        onToggleExpanded={vi.fn()}
      />
    );

    // Transcript text should not be visible
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  it('filters words based on search query', () => {
    render(
      <TranscriptReview
        chunks={chunks}
        censoredIndices={new Set()}
        onToggleWord={vi.fn()}
        searchQuery="how"
      />
    );

    expect(screen.getByText('How')).toBeInTheDocument();
    // Words not matching search should not appear
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  it('shows no results message when search has no matches', () => {
    render(
      <TranscriptReview
        chunks={chunks}
        censoredIndices={new Set()}
        onToggleWord={vi.fn()}
        searchQuery="xyz"
      />
    );

    expect(screen.getByText(/No words match your search query/)).toBeInTheDocument();
  });

  it('propagates click handler to words', async () => {
    const handleToggle = vi.fn();
    render(
      <TranscriptReview chunks={chunks} censoredIndices={new Set()} onToggleWord={handleToggle} />
    );

    await userEvent.click(screen.getByText('Hello'));
    expect(handleToggle).toHaveBeenCalledWith(0);
  });

  it('groups words into sentences correctly', () => {
    render(<TranscriptReview chunks={chunks} censoredIndices={new Set()} onToggleWord={vi.fn()} />);

    // Should have two sentences: "Hello world." and "How are you?"
    const timestamps = screen.getAllByText(/\d+\.\d+s - \d+\.\d+s/);
    expect(timestamps.length).toBeGreaterThanOrEqual(2);
  });

  it('renders search input when onSearchChange is provided', () => {
    render(
      <TranscriptReview
        chunks={chunks}
        censoredIndices={new Set()}
        onToggleWord={vi.fn()}
        onSearchChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('search-transcript-input')).toBeInTheDocument();
  });

  it('does not render search input when onSearchChange is not provided', () => {
    render(<TranscriptReview chunks={chunks} censoredIndices={new Set()} onToggleWord={vi.fn()} />);

    expect(screen.queryByTestId('search-transcript-input')).not.toBeInTheDocument();
  });

  it('hides search input when collapsed', () => {
    render(
      <TranscriptReview
        chunks={chunks}
        censoredIndices={new Set()}
        onToggleWord={vi.fn()}
        onSearchChange={vi.fn()}
        isExpanded={false}
        onToggleExpanded={vi.fn()}
      />
    );

    expect(screen.queryByTestId('search-transcript-input')).not.toBeInTheDocument();
  });

  it('calls onSearchChange when search input changes', async () => {
    const handleSearchChange = vi.fn();
    render(
      <TranscriptReview
        chunks={chunks}
        censoredIndices={new Set()}
        onToggleWord={vi.fn()}
        onSearchChange={handleSearchChange}
      />
    );

    const searchInput = screen.getByTestId('search-transcript-input');
    await userEvent.type(searchInput, 'hello');

    expect(handleSearchChange).toHaveBeenCalled();
  });
});
