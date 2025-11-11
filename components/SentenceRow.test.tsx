import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SentenceRow } from './SentenceRow';

describe('SentenceRow', () => {
  const words = [
    { text: 'Hello', index: 0, start: 0.0, end: 0.5 },
    { text: 'world', index: 1, start: 0.5, end: 1.0 },
  ];

  it('renders sentence timestamp range', () => {
    render(<SentenceRow words={words} censoredIndices={new Set()} onToggleWord={vi.fn()} />);

    expect(screen.getByText(/0.0s - 1.0s/)).toBeInTheDocument();
  });

  it('renders all words in sentence', () => {
    render(<SentenceRow words={words} censoredIndices={new Set()} onToggleWord={vi.fn()} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('world')).toBeInTheDocument();
  });

  it('passes click handler to WordWrapper', async () => {
    const handleToggle = vi.fn();
    render(<SentenceRow words={words} censoredIndices={new Set()} onToggleWord={handleToggle} />);

    await userEvent.click(screen.getByText('Hello'));
    expect(handleToggle).toHaveBeenCalledWith(0);
  });

  it('marks censored words correctly', () => {
    const censoredIndices = new Set([1]);
    const { container } = render(
      <SentenceRow words={words} censoredIndices={censoredIndices} onToggleWord={vi.fn()} />
    );

    const wrappers = container.querySelectorAll('.word-wrapper');
    expect(wrappers[0]).toHaveClass('uncensored');
    expect(wrappers[1]).toHaveClass('censored');
  });

  it('highlights words matching search query', () => {
    const { container } = render(
      <SentenceRow
        words={words}
        censoredIndices={new Set()}
        onToggleWord={vi.fn()}
        searchQuery="hello"
      />
    );

    const wrappers = container.querySelectorAll('.word-wrapper');
    expect(wrappers[0]).toHaveClass('highlighted');
  });

  it('handles single-word sentences', () => {
    const singleWord = [{ text: 'Stop!', index: 0, start: 0.0, end: 0.5 }];
    render(<SentenceRow words={singleWord} censoredIndices={new Set()} onToggleWord={vi.fn()} />);

    expect(screen.getByText('Stop!')).toBeInTheDocument();
    expect(screen.getByText(/0.0s - 0.5s/)).toBeInTheDocument();
  });

  it('returns null for empty words array', () => {
    const { container } = render(
      <SentenceRow words={[]} censoredIndices={new Set()} onToggleWord={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });
});
