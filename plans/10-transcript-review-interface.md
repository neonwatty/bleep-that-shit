# Transcript Review Interface - Implementation Plan

## Executive Summary

This plan outlines the implementation of an interactive transcript review interface that allows users to view the full Whisper AI transcription with word-level timestamps, toggle censoring on individual words, and visualize which words are marked for bleeping. The feature will integrate seamlessly with the existing bleeping pipeline while maintaining the app's client-side-only architecture.

---

## 1. UI/UX Design & Component Structure

### 1.1 Visual Design

**Design Language:**

- Follow existing editorial style with colorful section borders
- Use Inter font family
- Implement responsive design (mobile-first, 44px touch targets)
- Color scheme:
  - **Censored words**: Pink/red background (`bg-pink-200 text-pink-900`)
  - **Uncensored words**: Gray background (`bg-gray-100 text-gray-700`)
  - **Hover state**: Subtle scale transform and border highlight
  - **Low confidence**: Yellow warning indicator

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ [Search Bar] [Filter Dropdown] [Stats: X/Y censored]   │
├─────────────────────────────────────────────────────────┤
│ ┌───┐ ┌───┐ ┌───────┐ ┌───┐ ┌───────┐ ┌───┐          │
│ │The│ │cat│ │jumped │ │and│ │cursed │ │at │   ...    │
│ └───┘ └───┘ └───────┘ └───┘ └───────┘ └───┘          │
│       ↑              ↑         ↑                        │
│    neutral      neutral    censored (pink)             │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Component Hierarchy

```
TranscriptReviewInterface (new component)
├── TranscriptHeader (new component)
│   ├── SearchBar
│   ├── FilterControls
│   └── TranscriptStats
├── TranscriptGrid (new component)
│   └── TranscriptWord[] (new component)
│       ├── WordChip
│       ├── TimestampDisplay
│       └── ConfidenceIndicator
└── TranscriptActions (new component)
    ├── SelectAllButton
    ├── DeselectAllButton
    └── AutoSelectProfanityButton
```

---

## 2. Data Model & State Management

### 2.1 State Structure

**Primary State (in `page.tsx`):**

```typescript
const [censoredWordIndices, setCensoredWordIndices] = useState<Set<number>>(new Set());
const [transcriptSearchQuery, setTranscriptSearchQuery] = useState<string>('');
const [transcriptFilter, setTranscriptFilter] = useState<'all' | 'censored' | 'uncensored'>('all');
```

**Derived State:**

```typescript
const matchedWords = useMemo(() => {
  if (!transcriptionResult) return [];

  return Array.from(censoredWordIndices).map(index => {
    const chunk = transcriptionResult.chunks[index];
    return {
      word: chunk.text,
      start: chunk.timestamp[0],
      end: chunk.timestamp[1],
    };
  });
}, [censoredWordIndices, transcriptionResult]);
```

### 2.2 State Management Strategy

**Chosen Approach: Lifted State**

- Keep all state in `app/bleep/page.tsx`
- Pass down props to `TranscriptReviewInterface` component
- Use callbacks for state updates
- Use `useMemo` for expensive computations

### 2.3 Data Flow

```
User clicks word → onToggle callback → Update censoredWordIndices Set
→ Derived matchedWords updates → Re-render interface
```

---

## 3. Integration with Existing Pipeline

### 3.1 Replace Word Matching Section

**Current Flow (Step 4):**

```
User inputs words → handleMatch() → matchedWords array
```

**New Flow (Step 4):**

```
Transcription complete → Display TranscriptReviewInterface
→ User clicks words → censoredWordIndices Set → matchedWords derived
```

### 3.2 Code Changes in `app/bleep/page.tsx`

**Remove:**

- `wordsToMatch` state
- `matchMode` state
- `fuzzyDistance` state
- `handleMatch()` function
- Current Step 4 section

**Add:**

- New state variables (see section 2.1)
- New Step 4 section with `<TranscriptReviewInterface />` component
- Keep ability to manually add words as alternative option

**Modified Section 4 Layout:**

```tsx
<section className="editorial-section">
  <h2>Review Transcript & Select Words</h2>

  {transcriptionResult && (
    <TranscriptReviewInterface
      transcriptionResult={transcriptionResult}
      censoredWordIndices={censoredWordIndices}
      onCensoredWordsChange={setCensoredWordIndices}
      bleepBuffer={bleepBuffer}
    />
  )}

  {/* Optional: Keep manual word entry as alternative */}
  <details className="mt-4">
    <summary>Or manually enter words to match</summary>
    {/* Existing word matching UI */}
  </details>
</section>
```

---

## 4. Performance Considerations

### 4.1 Challenge: Large Transcripts

**Problem:** 10-minute video = ~1,800 word components could cause lag

**Solutions:**

#### Pagination (Recommended for v1)

```typescript
const WORDS_PER_PAGE = 200;
const [currentPage, setCurrentPage] = useState(0);

const paginatedChunks = useMemo(() => {
  const start = currentPage * WORDS_PER_PAGE;
  const end = start + WORDS_PER_PAGE;
  return filteredChunks.slice(start, end);
}, [filteredChunks, currentPage]);
```

#### Memoization

```typescript
const TranscriptWord = memo(
  ({ chunk, isCensored, onToggle }: Props) => {
    // ... render
  },
  (prevProps, nextProps) => {
    return (
      prevProps.isCensored === nextProps.isCensored && prevProps.chunk.text === nextProps.chunk.text
    );
  }
);
```

#### Debounced Search

```typescript
const [debouncedQuery, setDebouncedQuery] = useState('');

useEffect(() => {
  const timeout = setTimeout(() => {
    setDebouncedQuery(searchQuery);
  }, 300);
  return () => clearTimeout(timeout);
}, [searchQuery]);
```

---

## 5. Accessibility Considerations

### 5.1 WCAG 2.1 AA Compliance

**Keyboard Navigation:**

```typescript
<button
  role="switch"
  aria-checked={isCensored}
  aria-label={`${chunk.text} at ${chunk.timestamp[0].toFixed(1)} seconds. Click to toggle.`}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  }}
  className="focus:outline-2 focus:outline-blue-500"
>
  {chunk.text}
</button>
```

**Color Contrast:**

- Pink censored: `bg-pink-200 text-pink-900` (7.2:1 ✓)
- Gray uncensored: `bg-gray-100 text-gray-700` (4.8:1 ✓)

**Screen Reader Announcements:**

```typescript
<div role="status" aria-live="polite" className="sr-only">
  {announcement}
</div>
```

---

## 6. Step-by-Step Implementation Tasks

### Phase 1: Foundation (Days 1-2)

- [ ] Create `/components/transcript/TranscriptReviewInterface.tsx`
- [ ] Create `/components/transcript/TranscriptWord.tsx`
- [ ] Create `/components/transcript/TranscriptHeader.tsx`
- [ ] Add TypeScript interfaces in `/types/transcript.ts`
- [ ] Implement state management
- [ ] Basic rendering of all words
- [ ] Add onClick toggle functionality

### Phase 2: Core Features (Days 3-4)

- [ ] Implement search with debouncing
- [ ] Add filtering (All/Censored/Uncensored)
- [ ] Implement bulk actions (Select All, Deselect All)
- [ ] Display confidence scores
- [ ] Add low confidence warnings

### Phase 3: Integration & Polish (Days 5-6)

- [ ] Replace Step 4 in bleep page
- [ ] Implement pagination (200 words per page)
- [ ] Add `React.memo` to TranscriptWord
- [ ] Profile with React DevTools
- [ ] Add ARIA labels and roles
- [ ] Test with screen reader
- [ ] Responsive design testing

### Phase 4: Testing (Days 7-8)

- [ ] Create unit tests for components
- [ ] Create E2E tests with Playwright
- [ ] Cross-browser testing
- [ ] Mobile device testing
- [ ] Performance profiling

---

## 7. Testing Strategy

### 7.1 Unit Tests (Vitest)

```typescript
// components/transcript/TranscriptReviewInterface.test.tsx
describe('TranscriptReviewInterface', () => {
  it('renders all transcript words', () => {
    render(<TranscriptReviewInterface {...mockProps} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('toggles word censorship on click', () => {
    const mockOnChange = vi.fn();
    render(<TranscriptReviewInterface onCensoredWordsChange={mockOnChange} />);

    const wordButton = screen.getByText('Hello');
    fireEvent.click(wordButton);

    expect(mockOnChange).toHaveBeenCalledWith(new Set([0]));
  });

  it('filters words based on search query', () => {
    render(<TranscriptReviewInterface {...mockProps} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'test' } });

    expect(screen.getByText('test')).toBeInTheDocument();
  });
});
```

### 7.2 E2E Tests (Playwright)

```typescript
// tests/transcript-review.spec.ts
test('displays transcript after transcription', async ({ page }) => {
  await page.goto('/bleep');

  // Upload file and transcribe
  // ...

  await expect(page.locator('text=Review Transcript')).toBeVisible();
  await expect(page.locator('.transcript-word').first()).toBeVisible();
});

test('toggles word censorship on click', async ({ page }) => {
  const firstWord = page.locator('.transcript-word').first();

  await expect(firstWord).toHaveClass(/bg-gray-100/);
  await firstWord.click();
  await expect(firstWord).toHaveClass(/bg-pink-200/);
});

test('censored words are included in bleeping', async ({ page }) => {
  // Censor specific words
  await page.locator('.transcript-word').nth(0).click();

  // Verify in matched words display
  await expect(page.locator('text=Matched 1 words')).toBeVisible();

  // Apply bleeps
  await page.click('button:has-text("Apply Bleeps")');

  await expect(page.locator('text=Bleeping complete')).toBeVisible();
});
```

---

## 8. Optional Enhancements (Future)

### 8.1 Edit Word Text

Allow users to correct Whisper transcription errors.

**Effort:** 2-3 days | **Priority:** Low

### 8.2 Adjust Timestamps

Let users extend bleep duration for specific words.

**Effort:** 3-4 days | **Priority:** Medium

### 8.3 Auto-Select Profanity

One-click to select all profanity from predefined list.

**Effort:** 1 day | **Priority:** High

### 8.4 Export Transcript

Save transcript as TXT, SRT, or VTT file.

**Effort:** 2 days | **Priority:** Medium

### 8.5 Keyboard Shortcuts

Quick navigation and toggling for power users.

**Effort:** 2-3 days | **Priority:** Medium

### 8.6 Confidence Visualization

Show Whisper's confidence score for each word.

**Effort:** 1 day | **Priority:** Low

---

## 9. Implementation Timeline

**Total: 8-10 days**

- Week 1: Phases 1-2 (Foundation + Core Features)
- Week 2: Phases 3-4 (Integration + Testing)

---

## 10. Success Metrics

**Quantitative:**

- Page load time <3s
- Time-to-interactive <1s
- Unit test coverage >80%
- Lighthouse accessibility score >95

**Qualitative:**

- Users can censor 50 words faster than manual typing
- Improved workflow in user feedback
- No increase in bleeping accuracy bug reports

---

## 11. Code Example: Main Component

```typescript
'use client';

import { useState, useMemo, useCallback } from 'react';
import { TranscriptWord } from './TranscriptWord';

interface TranscriptReviewInterfaceProps {
  transcriptionResult: TranscriptionResult;
  censoredWordIndices: Set<number>;
  onCensoredWordsChange: (indices: Set<number>) => void;
  bleepBuffer: number;
}

export function TranscriptReviewInterface({
  transcriptionResult,
  censoredWordIndices,
  onCensoredWordsChange,
  bleepBuffer,
}: TranscriptReviewInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'censored' | 'uncensored'>('all');
  const [currentPage, setCurrentPage] = useState(0);

  const filteredChunks = useMemo(() => {
    let chunks = transcriptionResult.chunks;

    // Apply search filter
    if (searchQuery) {
      chunks = chunks.filter(chunk =>
        chunk.text.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply censorship filter
    if (filter === 'censored') {
      chunks = chunks.filter((_, index) => censoredWordIndices.has(index));
    } else if (filter === 'uncensored') {
      chunks = chunks.filter((_, index) => !censoredWordIndices.has(index));
    }

    return chunks;
  }, [transcriptionResult.chunks, searchQuery, filter, censoredWordIndices]);

  const handleToggleWord = useCallback((index: number) => {
    const newSet = new Set(censoredWordIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    onCensoredWordsChange(newSet);
  }, [censoredWordIndices, onCensoredWordsChange]);

  return (
    <div className="transcript-review-interface">
      {/* Header with search and stats */}
      <TranscriptHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filter={filter}
        onFilterChange={setFilter}
      />

      {/* Word grid */}
      <div className="transcript-grid flex flex-wrap gap-2">
        {filteredChunks.map((chunk, i) => {
          const originalIndex = transcriptionResult.chunks.indexOf(chunk);
          return (
            <TranscriptWord
              key={originalIndex}
              chunk={chunk}
              index={originalIndex}
              isCensored={censoredWordIndices.has(originalIndex)}
              onToggle={handleToggleWord}
            />
          );
        })}
      </div>
    </div>
  );
}
```

---

## Conclusion

This implementation plan provides a comprehensive roadmap for adding an interactive Transcript Review Interface. The design prioritizes:

1. **User Experience**: One-click toggling, visual feedback, search/filter
2. **Performance**: Pagination, memoization for long transcripts
3. **Accessibility**: WCAG 2.1 AA compliance, keyboard navigation
4. **Maintainability**: Clean architecture, comprehensive testing
5. **Integration**: Seamless fit with existing pipeline

The phased approach allows incremental delivery while ensuring quality.
