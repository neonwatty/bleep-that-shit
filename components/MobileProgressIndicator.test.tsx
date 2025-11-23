import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileProgressIndicator, FloatingActionButton } from './MobileProgressIndicator';

describe('MobileProgressIndicator', () => {
  const mockSteps = [
    { title: 'Upload File', completed: true, active: false },
    { title: 'Transcribe', completed: false, active: true },
    { title: 'Review', completed: false, active: false },
    { title: 'Bleep', completed: false, active: false },
  ];

  const defaultProps = {
    currentStep: 2,
    totalSteps: 4,
    steps: mockSteps,
  };

  describe('Progress bar', () => {
    it('renders progress bar', () => {
      const { container } = render(<MobileProgressIndicator {...defaultProps} />);

      const progressBar = container.querySelector('.bg-gray-200');
      expect(progressBar).toBeInTheDocument();
    });

    it('calculates progress percentage correctly', () => {
      const { container } = render(<MobileProgressIndicator {...defaultProps} />);

      const progressFill = container.querySelector('.from-blue-500');
      expect(progressFill).toHaveStyle({ width: '50%' }); // 2/4 = 50%
    });

    it('shows 0% progress on first step', () => {
      const { container } = render(<MobileProgressIndicator {...defaultProps} currentStep={0} />);

      const progressFill = container.querySelector('.from-blue-500');
      expect(progressFill).toHaveStyle({ width: '0%' });
    });

    it('shows 100% progress on last step', () => {
      const { container } = render(<MobileProgressIndicator {...defaultProps} currentStep={4} />);

      const progressFill = container.querySelector('.from-blue-500');
      expect(progressFill).toHaveStyle({ width: '100%' });
    });

    it('shows 25% progress when on step 1 of 4', () => {
      const { container } = render(<MobileProgressIndicator {...defaultProps} currentStep={1} />);

      const progressFill = container.querySelector('.from-blue-500');
      expect(progressFill).toHaveStyle({ width: '25%' });
    });
  });

  describe('Step indicator', () => {
    it('displays current step number', () => {
      render(<MobileProgressIndicator {...defaultProps} />);

      expect(screen.getByText('Step 2')).toBeInTheDocument();
    });

    it('displays total steps', () => {
      render(<MobileProgressIndicator {...defaultProps} />);

      expect(screen.getByText('of 4')).toBeInTheDocument();
    });

    it('displays current step title', () => {
      render(<MobileProgressIndicator {...defaultProps} />);

      expect(screen.getByText('Transcribe')).toBeInTheDocument();
    });

    it('displays correct title for step 1', () => {
      render(<MobileProgressIndicator {...defaultProps} currentStep={1} />);

      expect(screen.getByText('Upload File')).toBeInTheDocument();
    });

    it('displays correct title for last step', () => {
      render(<MobileProgressIndicator {...defaultProps} currentStep={4} />);

      expect(screen.getByText('Bleep')).toBeInTheDocument();
    });

    it('handles out of bounds step gracefully', () => {
      render(<MobileProgressIndicator {...defaultProps} currentStep={10} />);

      // Should not crash, renders Step 10 text
      expect(screen.getByText('Step 10')).toBeInTheDocument();
    });
  });

  describe('Step dots', () => {
    it('renders correct number of step dots', () => {
      const { container } = render(<MobileProgressIndicator {...defaultProps} />);

      const dots = container.querySelectorAll('.rounded-full');
      expect(dots).toHaveLength(4);
    });

    it('shows completed step with green color', () => {
      const { container } = render(<MobileProgressIndicator {...defaultProps} />);

      const dots = container.querySelectorAll('.rounded-full');
      expect(dots[0]).toHaveClass('bg-green-500');
    });

    it('shows active step with blue color', () => {
      const { container } = render(<MobileProgressIndicator {...defaultProps} />);

      const dots = container.querySelectorAll('.rounded-full');
      expect(dots[1]).toHaveClass('bg-blue-500');
    });

    it('shows pending step with gray color', () => {
      const { container } = render(<MobileProgressIndicator {...defaultProps} />);

      const dots = container.querySelectorAll('.rounded-full');
      expect(dots[2]).toHaveClass('bg-gray-300');
      expect(dots[3]).toHaveClass('bg-gray-300');
    });

    it('active step dot is wider than others', () => {
      const { container } = render(<MobileProgressIndicator {...defaultProps} />);

      const dots = container.querySelectorAll('.rounded-full');
      expect(dots[1]).toHaveClass('w-6'); // Active step
      expect(dots[0]).toHaveClass('w-2'); // Completed step
      expect(dots[2]).toHaveClass('w-2'); // Pending step
    });

    it('sets title attribute on dots', () => {
      const { container } = render(<MobileProgressIndicator {...defaultProps} />);

      const dots = container.querySelectorAll('.rounded-full');
      expect(dots[0]).toHaveAttribute('title', 'Upload File');
      expect(dots[1]).toHaveAttribute('title', 'Transcribe');
      expect(dots[2]).toHaveAttribute('title', 'Review');
      expect(dots[3]).toHaveAttribute('title', 'Bleep');
    });
  });

  describe('Multiple steps scenarios', () => {
    it('handles 2 steps', () => {
      const twoSteps = [
        { title: 'Step 1', completed: true, active: false },
        { title: 'Step 2', completed: false, active: true },
      ];
      const { container } = render(
        <MobileProgressIndicator currentStep={2} totalSteps={2} steps={twoSteps} />
      );

      const progressFill = container.querySelector('.from-blue-500');
      expect(progressFill).toHaveStyle({ width: '100%' }); // 2/2 = 100%
    });

    it('handles many steps', () => {
      const manySteps = Array.from({ length: 10 }, (_, i) => ({
        title: `Step ${i + 1}`,
        completed: i < 3,
        active: i === 3,
      }));
      const { container } = render(
        <MobileProgressIndicator currentStep={4} totalSteps={10} steps={manySteps} />
      );

      const dots = container.querySelectorAll('.rounded-full');
      expect(dots).toHaveLength(10);
    });

    it('handles all steps completed', () => {
      const allCompleted = mockSteps.map(step => ({ ...step, completed: true, active: false }));
      const { container } = render(
        <MobileProgressIndicator currentStep={4} totalSteps={4} steps={allCompleted} />
      );

      const dots = container.querySelectorAll('.rounded-full');
      dots.forEach(dot => {
        expect(dot).toHaveClass('bg-green-500');
      });
    });

    it('handles no steps completed', () => {
      const noneCompleted = mockSteps.map((step, i) => ({
        ...step,
        completed: false,
        active: i === 0,
      }));
      const { container } = render(
        <MobileProgressIndicator currentStep={1} totalSteps={4} steps={noneCompleted} />
      );

      const dots = container.querySelectorAll('.rounded-full');
      expect(dots[0]).toHaveClass('bg-blue-500'); // Active
      expect(dots[1]).toHaveClass('bg-gray-300'); // Pending
      expect(dots[2]).toHaveClass('bg-gray-300'); // Pending
      expect(dots[3]).toHaveClass('bg-gray-300'); // Pending
    });
  });
});

describe('FloatingActionButton', () => {
  const mockOnClick = vi.fn();

  describe('Button rendering', () => {
    it('renders button with children', () => {
      render(
        <FloatingActionButton onClick={mockOnClick}>
          <span>Click Me</span>
        </FloatingActionButton>
      );

      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    it('calls onClick when clicked', () => {
      const onClick = vi.fn();
      render(
        <FloatingActionButton onClick={onClick}>
          <span>Action</span>
        </FloatingActionButton>
      );

      const button = screen.getByText('Action').closest('button');
      if (button) fireEvent.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
      const onClick = vi.fn();
      render(
        <FloatingActionButton onClick={onClick} disabled={true}>
          <span>Disabled</span>
        </FloatingActionButton>
      );

      const button = screen.getByText('Disabled').closest('button');
      if (button) fireEvent.click(button);

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Button variants', () => {
    it('renders primary variant with correct styling', () => {
      render(
        <FloatingActionButton onClick={mockOnClick} variant="primary">
          <span>Primary</span>
        </FloatingActionButton>
      );

      const button = screen.getByText('Primary').closest('button');
      expect(button).toHaveClass('from-purple-500');
      expect(button).toHaveClass('to-pink-500');
      expect(button).toHaveClass('text-white');
    });

    it('renders secondary variant with correct styling', () => {
      render(
        <FloatingActionButton onClick={mockOnClick} variant="secondary">
          <span>Secondary</span>
        </FloatingActionButton>
      );

      const button = screen.getByText('Secondary').closest('button');
      expect(button).toHaveClass('bg-white');
      expect(button).toHaveClass('text-gray-900');
      expect(button).toHaveClass('border');
    });

    it('defaults to primary variant when not specified', () => {
      render(
        <FloatingActionButton onClick={mockOnClick}>
          <span>Default</span>
        </FloatingActionButton>
      );

      const button = screen.getByText('Default').closest('button');
      expect(button).toHaveClass('from-purple-500');
    });
  });

  describe('Button states', () => {
    it('is enabled by default', () => {
      render(
        <FloatingActionButton onClick={mockOnClick}>
          <span>Enabled</span>
        </FloatingActionButton>
      );

      const button = screen.getByText('Enabled').closest('button');
      expect(button).not.toBeDisabled();
    });

    it('can be disabled', () => {
      render(
        <FloatingActionButton onClick={mockOnClick} disabled={true}>
          <span>Disabled</span>
        </FloatingActionButton>
      );

      const button = screen.getByText('Disabled').closest('button');
      expect(button).toBeDisabled();
    });

    it('applies disabled styling when disabled', () => {
      render(
        <FloatingActionButton onClick={mockOnClick} disabled={true}>
          <span>Disabled</span>
        </FloatingActionButton>
      );

      const button = screen.getByText('Disabled').closest('button');
      expect(button).toHaveClass('disabled:opacity-50');
      expect(button).toHaveClass('disabled:cursor-not-allowed');
    });
  });
});
