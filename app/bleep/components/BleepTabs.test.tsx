import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BleepTabs } from './BleepTabs';

describe('BleepTabs', () => {
  const mockTabs = [
    { id: 'setup', label: 'Setup', enabled: true, icon: '📁' },
    { id: 'review', label: 'Review', enabled: true, icon: '👀' },
    { id: 'bleep', label: 'Bleep', enabled: false, icon: '🔊' },
  ];

  const defaultProps = {
    activeTab: 'setup',
    onTabChange: vi.fn(),
    tabs: mockTabs,
  };

  // Helper to get desktop tab buttons
  const getDesktopTabs = (container: HTMLElement) => {
    const tablist = container.querySelector('[role="tablist"]');
    return tablist?.querySelectorAll('button[role="tab"]') || [];
  };

  describe('Tab rendering', () => {
    it('renders all tabs with labels in desktop view', () => {
      const { container } = render(<BleepTabs {...defaultProps} />);

      const buttons = getDesktopTabs(container);
      expect(buttons[0]?.textContent).toContain('Setup');
      expect(buttons[1]?.textContent).toContain('Review');
      expect(buttons[2]?.textContent).toContain('Bleep');
    });

    it('renders tabs with icons when provided', () => {
      const { container } = render(<BleepTabs {...defaultProps} />);

      const buttons = getDesktopTabs(container);
      expect(buttons[0]?.textContent).toContain('📁');
      expect(buttons[1]?.textContent).toContain('👀');
      expect(buttons[2]?.textContent).toContain('🔊');
    });

    it('renders tabs without icons when not provided', () => {
      const tabsWithoutIcons = [
        { id: 'tab1', label: 'Tab 1', enabled: true },
        { id: 'tab2', label: 'Tab 2', enabled: true },
      ];
      const { container } = render(<BleepTabs {...defaultProps} tabs={tabsWithoutIcons} />);

      const buttons = getDesktopTabs(container);
      expect(buttons[0]?.textContent).toContain('Tab 1');
      expect(buttons[1]?.textContent).toContain('Tab 2');
    });

    it('renders correct number of tab buttons', () => {
      const { container } = render(<BleepTabs {...defaultProps} />);

      const buttons = getDesktopTabs(container);
      expect(buttons).toHaveLength(3);
    });

    it('renders tablist with correct role', () => {
      const { container } = render(<BleepTabs {...defaultProps} />);

      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist).toBeInTheDocument();
    });

    it('renders mobile step indicator', () => {
      render(<BleepTabs {...defaultProps} />);

      // MobileStepIndicator renders buttons for each step
      expect(screen.getByLabelText('Step 1: Setup')).toBeInTheDocument();
      expect(screen.getByLabelText('Step 2: Review')).toBeInTheDocument();
      expect(screen.getByLabelText('Step 3: Bleep (locked)')).toBeInTheDocument();
    });
  });

  describe('Active tab', () => {
    it('marks active tab with aria-selected="true"', () => {
      const { container } = render(<BleepTabs {...defaultProps} activeTab="setup" />);

      const buttons = getDesktopTabs(container);
      expect(buttons[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('marks inactive tabs with aria-selected="false"', () => {
      const { container } = render(<BleepTabs {...defaultProps} activeTab="setup" />);

      const buttons = getDesktopTabs(container);
      expect(buttons[1]).toHaveAttribute('aria-selected', 'false');
    });

    it('applies active styling to active tab', () => {
      const { container } = render(<BleepTabs {...defaultProps} activeTab="setup" />);

      const buttons = getDesktopTabs(container);
      expect(buttons[0]).toHaveClass('bg-white');
      expect(buttons[0]).toHaveClass('text-indigo-700');
    });

    it('does not apply active styling to inactive tabs', () => {
      const { container } = render(<BleepTabs {...defaultProps} activeTab="setup" />);

      const buttons = getDesktopTabs(container);
      expect(buttons[1]).not.toHaveClass('bg-white');
      expect(buttons[1]).toHaveClass('bg-gray-50');
    });

    it('sets correct aria-controls attribute', () => {
      const { container } = render(<BleepTabs {...defaultProps} activeTab="setup" />);

      const buttons = getDesktopTabs(container);
      expect(buttons[0]).toHaveAttribute('aria-controls', 'tabpanel-setup');
    });

    it('mobile step indicator shows active step', () => {
      render(<BleepTabs {...defaultProps} activeTab="setup" />);

      const activeStep = screen.getByLabelText('Step 1: Setup');
      expect(activeStep).toHaveAttribute('aria-current', 'step');
    });
  });

  describe('Disabled tabs', () => {
    it('disables button when tab is not enabled', () => {
      const { container } = render(<BleepTabs {...defaultProps} />);

      const buttons = getDesktopTabs(container);
      expect(buttons[2]).toBeDisabled();
    });

    it('does not disable button when tab is enabled', () => {
      const { container } = render(<BleepTabs {...defaultProps} />);

      const buttons = getDesktopTabs(container);
      expect(buttons[0]).not.toBeDisabled();
    });

    it('shows lock icon for disabled tabs', () => {
      const { container } = render(<BleepTabs {...defaultProps} />);

      const buttons = getDesktopTabs(container);
      expect(buttons[2]?.textContent).toContain('🔒');
    });

    it('does not show lock icon for enabled tabs', () => {
      const { container } = render(<BleepTabs {...defaultProps} />);

      const buttons = getDesktopTabs(container);
      expect(buttons[0]?.textContent).not.toContain('🔒');
    });

    it('applies disabled styling to disabled tabs', () => {
      const { container } = render(<BleepTabs {...defaultProps} />);

      const buttons = getDesktopTabs(container);
      expect(buttons[2]).toHaveClass('bg-gray-100');
      expect(buttons[2]).toHaveClass('text-gray-400');
      expect(buttons[2]).toHaveClass('cursor-not-allowed');
    });

    it('shows lock icon with correct aria-label', () => {
      render(<BleepTabs {...defaultProps} />);

      expect(screen.getByLabelText('Tab locked')).toBeInTheDocument();
    });

    it('mobile step indicator disables disabled steps', () => {
      render(<BleepTabs {...defaultProps} />);

      const disabledStep = screen.getByLabelText('Step 3: Bleep (locked)');
      expect(disabledStep).toBeDisabled();
    });
  });

  describe('Tab interactions', () => {
    it('calls onTabChange when enabled tab is clicked', () => {
      const onTabChange = vi.fn();
      const { container } = render(<BleepTabs {...defaultProps} onTabChange={onTabChange} />);

      const buttons = getDesktopTabs(container);
      if (buttons[1]) fireEvent.click(buttons[1]);

      expect(onTabChange).toHaveBeenCalledWith('review');
      expect(onTabChange).toHaveBeenCalledTimes(1);
    });

    it('does not call onTabChange when disabled tab is clicked', () => {
      const onTabChange = vi.fn();
      const { container } = render(<BleepTabs {...defaultProps} onTabChange={onTabChange} />);

      const buttons = getDesktopTabs(container);
      if (buttons[2]) fireEvent.click(buttons[2]);

      expect(onTabChange).not.toHaveBeenCalled();
    });

    it('calls onTabChange with correct tab id', () => {
      const onTabChange = vi.fn();
      const { container } = render(<BleepTabs {...defaultProps} onTabChange={onTabChange} />);

      const buttons = getDesktopTabs(container);
      if (buttons[0]) fireEvent.click(buttons[0]);

      expect(onTabChange).toHaveBeenCalledWith('setup');
    });

    it('can switch between multiple enabled tabs', () => {
      const onTabChange = vi.fn();
      const { container } = render(<BleepTabs {...defaultProps} onTabChange={onTabChange} />);

      const buttons = getDesktopTabs(container);

      if (buttons[0]) fireEvent.click(buttons[0]);
      if (buttons[1]) fireEvent.click(buttons[1]);

      expect(onTabChange).toHaveBeenCalledWith('setup');
      expect(onTabChange).toHaveBeenCalledWith('review');
      expect(onTabChange).toHaveBeenCalledTimes(2);
    });

    it('calls onTabChange when mobile step is clicked', () => {
      const onTabChange = vi.fn();
      render(<BleepTabs {...defaultProps} onTabChange={onTabChange} />);

      const reviewStep = screen.getByLabelText('Step 2: Review');
      fireEvent.click(reviewStep);

      expect(onTabChange).toHaveBeenCalledWith('review');
    });
  });

  describe('Tab order and layout', () => {
    it('renders tabs in the order provided', () => {
      const { container } = render(<BleepTabs {...defaultProps} />);

      const buttons = getDesktopTabs(container);
      expect(buttons[0]?.textContent).toContain('Setup');
      expect(buttons[1]?.textContent).toContain('Review');
      expect(buttons[2]?.textContent).toContain('Bleep');
    });

    it('handles single tab', () => {
      const singleTab = [{ id: 'only', label: 'Only Tab', enabled: true }];
      const { container } = render(
        <BleepTabs {...defaultProps} tabs={singleTab} activeTab="only" />
      );

      const buttons = getDesktopTabs(container);
      expect(buttons[0]?.textContent).toContain('Only Tab');
    });

    it('handles many tabs', () => {
      const manyTabs = Array.from({ length: 6 }, (_, i) => ({
        id: `tab${i}`,
        label: `Tab ${i + 1}`,
        enabled: true,
      }));
      const { container } = render(<BleepTabs {...defaultProps} tabs={manyTabs} />);

      const buttons = getDesktopTabs(container);
      expect(buttons).toHaveLength(6);
      manyTabs.forEach((tab, i) => {
        expect(buttons[i]?.textContent).toContain(tab.label);
      });
    });
  });

  describe('Different active states', () => {
    it('can have any tab as active', () => {
      const { container } = render(<BleepTabs {...defaultProps} activeTab="review" />);

      const buttons = getDesktopTabs(container);
      expect(buttons[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('can have disabled tab as active (edge case)', () => {
      const { container } = render(<BleepTabs {...defaultProps} activeTab="bleep" />);

      const buttons = getDesktopTabs(container);
      expect(buttons[2]).toHaveAttribute('aria-selected', 'true');
      expect(buttons[2]).toBeDisabled();
    });

    it('handles all tabs disabled', () => {
      const allDisabled = mockTabs.map(tab => ({ ...tab, enabled: false }));
      const { container } = render(<BleepTabs {...defaultProps} tabs={allDisabled} />);

      const buttons = getDesktopTabs(container);
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('handles all tabs enabled', () => {
      const allEnabled = mockTabs.map(tab => ({ ...tab, enabled: true }));
      const { container } = render(<BleepTabs {...defaultProps} tabs={allEnabled} />);

      const buttons = getDesktopTabs(container);
      buttons.forEach(button => {
        expect(button).not.toBeDisabled();
      });
    });
  });
});
