import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WordsetSelector } from './WordsetSelector';
import * as useWordsetsModule from '@/lib/hooks/useWordsets';

// Mock useWordsets hook
const mockWordsets = [
  {
    id: 1,
    name: 'Profanity',
    description: 'Common profanity words',
    words: ['bad', 'worse', 'worst'],
    matchMode: { exact: true, partial: false, fuzzy: false },
    fuzzyDistance: 0,
    color: '#EF4444',
    isDefault: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 2,
    name: 'Brands',
    description: 'Brand names',
    words: ['nike', 'adidas'],
    matchMode: { exact: false, partial: true, fuzzy: false },
    fuzzyDistance: 0,
    color: '#3B82F6',
    isDefault: false,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
];

vi.mock('@/lib/hooks/useWordsets', () => ({
  useWordsets: () => ({
    wordsets: mockWordsets,
    isInitialized: true,
    error: null,
    searchQuery: '',
    setSearchQuery: vi.fn(),
    clearError: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    duplicate: vi.fn(),
    exportCSV: vi.fn(),
    importCSV: vi.fn(),
    allWordsets: mockWordsets,
  }),
}));

describe('WordsetSelector', () => {
  const mockOnApplyWordsets = vi.fn();
  const mockOnManageClick = vi.fn();
  const mockOnRemoveWordset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when not initialized', () => {
    // Override the mock for this specific test to return uninitialized state
    vi.spyOn(useWordsetsModule, 'useWordsets').mockReturnValue({
      wordsets: [],
      isInitialized: false,
      error: null,
      searchQuery: '',
      setSearchQuery: vi.fn(),
      clearError: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      duplicate: vi.fn(),
      exportCSV: vi.fn(),
      importCSV: vi.fn(),
      allWordsets: [],
    });

    render(
      <WordsetSelector onApplyWordsets={mockOnApplyWordsets} onManageClick={mockOnManageClick} />
    );

    expect(screen.getByText('Loading wordsets...')).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it('renders wordset list when initialized', () => {
    render(
      <WordsetSelector onApplyWordsets={mockOnApplyWordsets} onManageClick={mockOnManageClick} />
    );

    expect(screen.getByText('Quick Apply Wordsets (Optional)')).toBeInTheDocument();
    expect(screen.getByText('Profanity')).toBeInTheDocument();
    expect(screen.getByText('Brands')).toBeInTheDocument();
  });

  it('displays word counts for each wordset', () => {
    render(
      <WordsetSelector onApplyWordsets={mockOnApplyWordsets} onManageClick={mockOnManageClick} />
    );

    expect(screen.getByText(/\(3 words\)/)).toBeInTheDocument(); // Profanity
    expect(screen.getByText(/\(2 words\)/)).toBeInTheDocument(); // Brands
  });

  it('shows DEFAULT badge for default wordsets', () => {
    render(
      <WordsetSelector onApplyWordsets={mockOnApplyWordsets} onManageClick={mockOnManageClick} />
    );

    expect(screen.getByText('DEFAULT')).toBeInTheDocument();
  });

  it('displays wordset colors', () => {
    const { container } = render(
      <WordsetSelector onApplyWordsets={mockOnApplyWordsets} onManageClick={mockOnManageClick} />
    );

    const colorDots = container.querySelectorAll('[aria-label="Wordset color"]');
    expect(colorDots.length).toBeGreaterThanOrEqual(2);

    const styles = Array.from(colorDots).map(el => el.getAttribute('style') || '');
    expect(styles.some(s => /rgb\(239,\s*68,\s*68\)/.test(s))).toBe(true);
    expect(styles.some(s => /rgb\(59,\s*130,\s*246\)/.test(s))).toBe(true);
  });

  it('shows empty state when no wordsets available', () => {
    // Override the mock for this specific test to return empty wordsets
    vi.spyOn(useWordsetsModule, 'useWordsets').mockReturnValue({
      wordsets: [],
      isInitialized: true, // Initialized but empty
      error: null,
      searchQuery: '',
      setSearchQuery: vi.fn(),
      clearError: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      duplicate: vi.fn(),
      exportCSV: vi.fn(),
      importCSV: vi.fn(),
      allWordsets: [],
    });

    render(
      <WordsetSelector onApplyWordsets={mockOnApplyWordsets} onManageClick={mockOnManageClick} />
    );

    expect(screen.getByText('No wordsets available.')).toBeInTheDocument();
    expect(screen.getByText('Create your first wordset')).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it('allows selecting wordsets', () => {
    render(
      <WordsetSelector onApplyWordsets={mockOnApplyWordsets} onManageClick={mockOnManageClick} />
    );

    const checkbox1 = screen.getByTestId('wordset-checkbox-1');
    const checkbox2 = screen.getByTestId('wordset-checkbox-2');

    expect(checkbox1).not.toBeChecked();
    expect(checkbox2).not.toBeChecked();

    fireEvent.click(checkbox1);
    expect(checkbox1).toBeChecked();

    fireEvent.click(checkbox2);
    expect(checkbox2).toBeChecked();
  });

  it('disables apply button when no wordsets selected', () => {
    render(
      <WordsetSelector onApplyWordsets={mockOnApplyWordsets} onManageClick={mockOnManageClick} />
    );

    const applyButton = screen.getByTestId('apply-wordsets-button');
    expect(applyButton).toBeDisabled();
  });

  it('enables apply button when wordsets selected', () => {
    render(
      <WordsetSelector onApplyWordsets={mockOnApplyWordsets} onManageClick={mockOnManageClick} />
    );

    const checkbox = screen.getByTestId('wordset-checkbox-1');
    fireEvent.click(checkbox);

    const applyButton = screen.getByTestId('apply-wordsets-button');
    expect(applyButton).not.toBeDisabled();
  });

  it('shows selected count on apply button', () => {
    render(
      <WordsetSelector onApplyWordsets={mockOnApplyWordsets} onManageClick={mockOnManageClick} />
    );

    const checkbox1 = screen.getByTestId('wordset-checkbox-1');
    const checkbox2 = screen.getByTestId('wordset-checkbox-2');

    expect(screen.getByText(/Apply Selected \(0\)/)).toBeInTheDocument();

    fireEvent.click(checkbox1);
    expect(screen.getByText(/Apply Selected \(1\)/)).toBeInTheDocument();

    fireEvent.click(checkbox2);
    expect(screen.getByText(/Apply Selected \(2\)/)).toBeInTheDocument();
  });

  it('calls onApplyWordsets with selected IDs', async () => {
    render(
      <WordsetSelector onApplyWordsets={mockOnApplyWordsets} onManageClick={mockOnManageClick} />
    );

    const checkbox1 = screen.getByTestId('wordset-checkbox-1');
    const checkbox2 = screen.getByTestId('wordset-checkbox-2');

    fireEvent.click(checkbox1);
    fireEvent.click(checkbox2);

    const applyButton = screen.getByTestId('apply-wordsets-button');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockOnApplyWordsets).toHaveBeenCalledWith([1, 2]);
    });
  });

  it('clears selection after applying', async () => {
    render(
      <WordsetSelector onApplyWordsets={mockOnApplyWordsets} onManageClick={mockOnManageClick} />
    );

    const checkbox = screen.getByTestId('wordset-checkbox-1');
    fireEvent.click(checkbox);

    const applyButton = screen.getByTestId('apply-wordsets-button');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(checkbox).not.toBeChecked();
    });
  });

  it('calls onManageClick when manage button clicked', () => {
    render(
      <WordsetSelector onApplyWordsets={mockOnApplyWordsets} onManageClick={mockOnManageClick} />
    );

    const manageButton = screen.getByText('Manage Wordsets');
    fireEvent.click(manageButton);

    expect(mockOnManageClick).toHaveBeenCalledOnce();
  });

  it('calls onManageClick from empty state', () => {
    // Override the mock for this specific test to return empty wordsets
    vi.spyOn(useWordsetsModule, 'useWordsets').mockReturnValue({
      wordsets: [],
      isInitialized: true,
      error: null,
      searchQuery: '',
      setSearchQuery: vi.fn(),
      clearError: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      duplicate: vi.fn(),
      exportCSV: vi.fn(),
      importCSV: vi.fn(),
      allWordsets: [],
    });

    render(
      <WordsetSelector onApplyWordsets={mockOnApplyWordsets} onManageClick={mockOnManageClick} />
    );

    const createLink = screen.getByText('Create your first wordset');
    fireEvent.click(createLink);

    expect(mockOnManageClick).toHaveBeenCalledOnce();

    vi.restoreAllMocks();
  });

  describe('active wordsets display', () => {
    it('does not show active wordsets section when none active', () => {
      render(
        <WordsetSelector
          onApplyWordsets={mockOnApplyWordsets}
          onManageClick={mockOnManageClick}
          activeWordsets={new Set()}
        />
      );

      expect(screen.queryByText(/Active Wordsets/)).not.toBeInTheDocument();
    });

    it('shows active wordsets section when wordsets are active', () => {
      render(
        <WordsetSelector
          onApplyWordsets={mockOnApplyWordsets}
          onManageClick={mockOnManageClick}
          activeWordsets={new Set([1, 2])}
        />
      );

      expect(screen.getByText(/Active Wordsets \(2\)/)).toBeInTheDocument();
    });

    it('displays active wordset names and counts', () => {
      render(
        <WordsetSelector
          onApplyWordsets={mockOnApplyWordsets}
          onManageClick={mockOnManageClick}
          activeWordsets={new Set([1])}
        />
      );

      const activeSection = screen.getByText(/Active Wordsets/);
      expect(activeSection).toBeInTheDocument();

      // Should show wordset name - there will be multiple "Profanity" elements
      // (one in the list and one in active section)
      const profanityElements = screen.getAllByText('Profanity');
      expect(profanityElements.length).toBeGreaterThanOrEqual(1);

      // Word count appears in active section with parentheses
      expect(screen.getByText('(3)')).toBeInTheDocument();
    });

    it('shows remove buttons for active wordsets when handler provided', () => {
      render(
        <WordsetSelector
          onApplyWordsets={mockOnApplyWordsets}
          onManageClick={mockOnManageClick}
          activeWordsets={new Set([1])}
          onRemoveWordset={mockOnRemoveWordset}
        />
      );

      const removeButton = screen.getByTestId('remove-wordset-1');
      expect(removeButton).toBeInTheDocument();
    });

    it('calls onRemoveWordset when remove button clicked', () => {
      render(
        <WordsetSelector
          onApplyWordsets={mockOnApplyWordsets}
          onManageClick={mockOnManageClick}
          activeWordsets={new Set([1])}
          onRemoveWordset={mockOnRemoveWordset}
        />
      );

      const removeButton = screen.getByTestId('remove-wordset-1');
      fireEvent.click(removeButton);

      expect(mockOnRemoveWordset).toHaveBeenCalledWith(1);
    });

    it('does not show remove buttons when handler not provided', () => {
      render(
        <WordsetSelector
          onApplyWordsets={mockOnApplyWordsets}
          onManageClick={mockOnManageClick}
          activeWordsets={new Set([1])}
        />
      );

      expect(screen.queryByTestId('remove-wordset-1')).not.toBeInTheDocument();
    });

    it('displays colors for active wordsets', () => {
      const { container } = render(
        <WordsetSelector
          onApplyWordsets={mockOnApplyWordsets}
          onManageClick={mockOnManageClick}
          activeWordsets={new Set([1, 2])}
        />
      );

      // Check for color dots in active wordsets section
      const activeSection = screen.getByText(/Active Wordsets/).parentElement;
      const colorDots = activeSection?.querySelectorAll('[aria-label="Wordset color"]');

      expect(colorDots).toBeDefined();
      expect(colorDots!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('UI interactions', () => {
    it('allows toggling selection on and off', () => {
      render(
        <WordsetSelector onApplyWordsets={mockOnApplyWordsets} onManageClick={mockOnManageClick} />
      );

      const checkbox = screen.getByTestId('wordset-checkbox-1');

      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('shows hover effect on wordset items', () => {
      const { container } = render(
        <WordsetSelector onApplyWordsets={mockOnApplyWordsets} onManageClick={mockOnManageClick} />
      );

      const wordsetLabel = screen.getByText('Profanity').closest('label');
      expect(wordsetLabel).toHaveClass('hover:bg-purple-100');
    });

    it('displays wordset descriptions when available', () => {
      render(
        <WordsetSelector onApplyWordsets={mockOnApplyWordsets} onManageClick={mockOnManageClick} />
      );

      expect(screen.getByText('Common profanity words')).toBeInTheDocument();
      expect(screen.getByText('Brand names')).toBeInTheDocument();
    });
  });
});
