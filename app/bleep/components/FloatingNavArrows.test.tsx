import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloatingNavArrows } from './FloatingNavArrows';

describe('FloatingNavArrows', () => {
  const defaultProps = {
    showBack: false,
    showForward: false,
    onBack: vi.fn(),
    onForward: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visibility', () => {
    it('renders nothing when both arrows are hidden', () => {
      const { container } = render(<FloatingNavArrows {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders only back arrow when showBack is true', () => {
      render(<FloatingNavArrows {...defaultProps} showBack={true} />);

      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    });

    it('renders only forward arrow when showForward is true', () => {
      render(<FloatingNavArrows {...defaultProps} showForward={true} />);

      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    it('renders both arrows when both are true', () => {
      render(<FloatingNavArrows {...defaultProps} showBack={true} showForward={true} />);

      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });
  });

  describe('Click handlers', () => {
    it('calls onBack when back arrow is clicked', () => {
      const onBack = vi.fn();
      render(<FloatingNavArrows {...defaultProps} showBack={true} onBack={onBack} />);

      fireEvent.click(screen.getByRole('button', { name: /previous/i }));

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('calls onForward when forward arrow is clicked', () => {
      const onForward = vi.fn();
      render(<FloatingNavArrows {...defaultProps} showForward={true} onForward={onForward} />);

      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      expect(onForward).toHaveBeenCalledTimes(1);
    });
  });

  describe('Labels and accessibility', () => {
    it('uses default labels when not provided', () => {
      render(<FloatingNavArrows {...defaultProps} showBack={true} showForward={true} />);

      expect(screen.getByTitle('Previous step')).toBeInTheDocument();
      expect(screen.getByTitle('Next step')).toBeInTheDocument();
    });

    it('uses custom labels when provided', () => {
      render(
        <FloatingNavArrows
          {...defaultProps}
          showBack={true}
          showForward={true}
          backLabel="Back to Setup"
          forwardLabel="Continue to Review"
        />
      );

      expect(screen.getByTitle('Back to Setup')).toBeInTheDocument();
      expect(screen.getByTitle('Continue to Review')).toBeInTheDocument();
    });

    it('has proper aria-labels for accessibility', () => {
      render(
        <FloatingNavArrows
          {...defaultProps}
          showBack={true}
          showForward={true}
          backLabel="Back to Setup"
          forwardLabel="Continue to Review"
        />
      );

      expect(screen.getByRole('button', { name: 'Back to Setup' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Continue to Review' })).toBeInTheDocument();
    });
  });
});
