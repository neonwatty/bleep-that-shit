import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WordWrapper } from './WordWrapper';

describe('WordWrapper', () => {
  it('renders word text correctly', () => {
    render(
      <WordWrapper
        word="test"
        index={0}
        start={1.0}
        end={1.5}
        isCensored={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('applies censored styling when isCensored=true', () => {
    const { container } = render(
      <WordWrapper word="bad" index={0} start={1.0} end={1.5} isCensored={true} onClick={vi.fn()} />
    );

    const wrapper = container.querySelector('.word-wrapper');
    expect(wrapper).toHaveClass('censored');
  });

  it('applies uncensored styling when isCensored=false', () => {
    const { container } = render(
      <WordWrapper
        word="good"
        index={0}
        start={1.0}
        end={1.5}
        isCensored={false}
        onClick={vi.fn()}
      />
    );

    const wrapper = container.querySelector('.word-wrapper');
    expect(wrapper).toHaveClass('uncensored');
  });

  it('calls onClick with correct index when clicked', async () => {
    const handleClick = vi.fn();
    render(
      <WordWrapper
        word="test"
        index={5}
        start={1.0}
        end={1.5}
        isCensored={false}
        onClick={handleClick}
      />
    );

    await userEvent.click(screen.getByText('test'));
    expect(handleClick).toHaveBeenCalledWith(5);
  });

  it('shows timestamp tooltip', () => {
    const { container } = render(
      <WordWrapper
        word="test"
        index={0}
        start={1.23}
        end={2.45}
        isCensored={false}
        onClick={vi.fn()}
      />
    );

    const timestamp = container.querySelector('.timestamp');
    expect(timestamp).toBeInTheDocument();
    expect(timestamp).toHaveTextContent('1.23s - 2.45s');
  });

  it('applies highlighted class when isHighlighted=true', () => {
    const { container } = render(
      <WordWrapper
        word="test"
        index={0}
        start={1.0}
        end={1.5}
        isCensored={false}
        isHighlighted={true}
        onClick={vi.fn()}
      />
    );

    const wrapper = container.querySelector('.word-wrapper');
    expect(wrapper).toHaveClass('highlighted');
  });

  it('has proper accessibility attributes', () => {
    const { container } = render(
      <WordWrapper
        word="test"
        index={0}
        start={1.0}
        end={1.5}
        isCensored={true}
        onClick={vi.fn()}
      />
    );

    const wrapper = container.querySelector('.word-wrapper');
    expect(wrapper).toHaveAttribute('role', 'button');
    expect(wrapper).toHaveAttribute('aria-pressed', 'true');
    expect(wrapper).toHaveAttribute('tabIndex', '0');
  });

  it('handles keyboard Enter key', async () => {
    const handleClick = vi.fn();
    render(
      <WordWrapper
        word="test"
        index={5}
        start={1.0}
        end={1.5}
        isCensored={false}
        onClick={handleClick}
      />
    );

    const wrapper = screen.getByRole('button');
    wrapper.focus();
    await userEvent.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledWith(5);
  });

  it('handles keyboard Space key', async () => {
    const handleClick = vi.fn();
    render(
      <WordWrapper
        word="test"
        index={5}
        start={1.0}
        end={1.5}
        isCensored={false}
        onClick={handleClick}
      />
    );

    const wrapper = screen.getByRole('button');
    wrapper.focus();
    await userEvent.keyboard(' ');
    expect(handleClick).toHaveBeenCalledWith(5);
  });
});
