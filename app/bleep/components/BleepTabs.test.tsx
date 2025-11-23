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

  describe('Tab rendering', () => {
    it('renders all tabs with labels', () => {
      render(<BleepTabs {...defaultProps} />);

      expect(screen.getByText('Setup')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
      expect(screen.getByText('Bleep')).toBeInTheDocument();
    });

    it('renders tabs with icons when provided', () => {
      render(<BleepTabs {...defaultProps} />);

      expect(screen.getByText('📁')).toBeInTheDocument();
      expect(screen.getByText('👀')).toBeInTheDocument();
      expect(screen.getByText('🔊')).toBeInTheDocument();
    });

    it('renders tabs without icons when not provided', () => {
      const tabsWithoutIcons = [
        { id: 'tab1', label: 'Tab 1', enabled: true },
        { id: 'tab2', label: 'Tab 2', enabled: true },
      ];
      render(<BleepTabs {...defaultProps} tabs={tabsWithoutIcons} />);

      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
    });

    it('renders correct number of tab buttons', () => {
      const { container } = render(<BleepTabs {...defaultProps} />);

      const buttons = container.querySelectorAll('button[role="tab"]');
      expect(buttons).toHaveLength(3);
    });

    it('renders tablist with correct role', () => {
      const { container } = render(<BleepTabs {...defaultProps} />);

      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist).toBeInTheDocument();
    });
  });

  describe('Active tab', () => {
    it('marks active tab with aria-selected="true"', () => {
      render(<BleepTabs {...defaultProps} activeTab="setup" />);

      const setupTab = screen.getByText('Setup').closest('button');
      expect(setupTab).toHaveAttribute('aria-selected', 'true');
    });

    it('marks inactive tabs with aria-selected="false"', () => {
      render(<BleepTabs {...defaultProps} activeTab="setup" />);

      const reviewTab = screen.getByText('Review').closest('button');
      expect(reviewTab).toHaveAttribute('aria-selected', 'false');
    });

    it('applies active styling to active tab', () => {
      render(<BleepTabs {...defaultProps} activeTab="setup" />);

      const setupTab = screen.getByText('Setup').closest('button');
      expect(setupTab).toHaveClass('bg-white');
      expect(setupTab).toHaveClass('text-indigo-700');
    });

    it('does not apply active styling to inactive tabs', () => {
      render(<BleepTabs {...defaultProps} activeTab="setup" />);

      const reviewTab = screen.getByText('Review').closest('button');
      expect(reviewTab).not.toHaveClass('bg-white');
      expect(reviewTab).toHaveClass('bg-gray-50');
    });

    it('sets correct aria-controls attribute', () => {
      render(<BleepTabs {...defaultProps} activeTab="setup" />);

      const setupTab = screen.getByText('Setup').closest('button');
      expect(setupTab).toHaveAttribute('aria-controls', 'tabpanel-setup');
    });
  });

  describe('Disabled tabs', () => {
    it('disables button when tab is not enabled', () => {
      render(<BleepTabs {...defaultProps} />);

      const bleepTab = screen.getByText('Bleep').closest('button');
      expect(bleepTab).toBeDisabled();
    });

    it('does not disable button when tab is enabled', () => {
      render(<BleepTabs {...defaultProps} />);

      const setupTab = screen.getByText('Setup').closest('button');
      expect(setupTab).not.toBeDisabled();
    });

    it('shows lock icon for disabled tabs', () => {
      render(<BleepTabs {...defaultProps} />);

      const bleepTab = screen.getByText('Bleep').closest('button');
      expect(bleepTab?.textContent).toContain('🔒');
    });

    it('does not show lock icon for enabled tabs', () => {
      render(<BleepTabs {...defaultProps} />);

      const setupTab = screen.getByText('Setup').closest('button');
      expect(setupTab?.textContent).not.toContain('🔒');
    });

    it('applies disabled styling to disabled tabs', () => {
      render(<BleepTabs {...defaultProps} />);

      const bleepTab = screen.getByText('Bleep').closest('button');
      expect(bleepTab).toHaveClass('bg-gray-100');
      expect(bleepTab).toHaveClass('text-gray-400');
      expect(bleepTab).toHaveClass('cursor-not-allowed');
    });

    it('shows lock icon with correct aria-label', () => {
      render(<BleepTabs {...defaultProps} />);

      expect(screen.getByLabelText('Tab locked')).toBeInTheDocument();
    });
  });

  describe('Tab interactions', () => {
    it('calls onTabChange when enabled tab is clicked', () => {
      const onTabChange = vi.fn();
      render(<BleepTabs {...defaultProps} onTabChange={onTabChange} />);

      const reviewTab = screen.getByText('Review').closest('button');
      if (reviewTab) fireEvent.click(reviewTab);

      expect(onTabChange).toHaveBeenCalledWith('review');
      expect(onTabChange).toHaveBeenCalledTimes(1);
    });

    it('does not call onTabChange when disabled tab is clicked', () => {
      const onTabChange = vi.fn();
      render(<BleepTabs {...defaultProps} onTabChange={onTabChange} />);

      const bleepTab = screen.getByText('Bleep').closest('button');
      if (bleepTab) fireEvent.click(bleepTab);

      expect(onTabChange).not.toHaveBeenCalled();
    });

    it('calls onTabChange with correct tab id', () => {
      const onTabChange = vi.fn();
      render(<BleepTabs {...defaultProps} onTabChange={onTabChange} />);

      const setupTab = screen.getByText('Setup').closest('button');
      if (setupTab) fireEvent.click(setupTab);

      expect(onTabChange).toHaveBeenCalledWith('setup');
    });

    it('can switch between multiple enabled tabs', () => {
      const onTabChange = vi.fn();
      render(<BleepTabs {...defaultProps} onTabChange={onTabChange} />);

      const setupTab = screen.getByText('Setup').closest('button');
      const reviewTab = screen.getByText('Review').closest('button');

      if (setupTab) fireEvent.click(setupTab);
      if (reviewTab) fireEvent.click(reviewTab);

      expect(onTabChange).toHaveBeenCalledWith('setup');
      expect(onTabChange).toHaveBeenCalledWith('review');
      expect(onTabChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('Tab order and layout', () => {
    it('renders tabs in the order provided', () => {
      const { container } = render(<BleepTabs {...defaultProps} />);

      const buttons = container.querySelectorAll('button[role="tab"]');
      expect(buttons[0]?.textContent).toContain('Setup');
      expect(buttons[1]?.textContent).toContain('Review');
      expect(buttons[2]?.textContent).toContain('Bleep');
    });

    it('handles single tab', () => {
      const singleTab = [{ id: 'only', label: 'Only Tab', enabled: true }];
      render(<BleepTabs {...defaultProps} tabs={singleTab} activeTab="only" />);

      expect(screen.getByText('Only Tab')).toBeInTheDocument();
    });

    it('handles many tabs', () => {
      const manyTabs = Array.from({ length: 6 }, (_, i) => ({
        id: `tab${i}`,
        label: `Tab ${i + 1}`,
        enabled: true,
      }));
      render(<BleepTabs {...defaultProps} tabs={manyTabs} />);

      manyTabs.forEach(tab => {
        expect(screen.getByText(tab.label)).toBeInTheDocument();
      });
    });
  });

  describe('Different active states', () => {
    it('can have any tab as active', () => {
      render(<BleepTabs {...defaultProps} activeTab="review" />);

      const reviewTab = screen.getByText('Review').closest('button');
      expect(reviewTab).toHaveAttribute('aria-selected', 'true');
    });

    it('can have disabled tab as active (edge case)', () => {
      render(<BleepTabs {...defaultProps} activeTab="bleep" />);

      const bleepTab = screen.getByText('Bleep').closest('button');
      expect(bleepTab).toHaveAttribute('aria-selected', 'true');
      expect(bleepTab).toBeDisabled();
    });

    it('handles all tabs disabled', () => {
      const allDisabled = mockTabs.map(tab => ({ ...tab, enabled: false }));
      render(<BleepTabs {...defaultProps} tabs={allDisabled} />);

      const buttons = screen.getAllByRole('tab');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('handles all tabs enabled', () => {
      const allEnabled = mockTabs.map(tab => ({ ...tab, enabled: true }));
      render(<BleepTabs {...defaultProps} tabs={allEnabled} />);

      const buttons = screen.getAllByRole('tab');
      buttons.forEach(button => {
        expect(button).not.toBeDisabled();
      });
    });
  });
});
