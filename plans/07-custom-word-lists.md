# Custom Word Lists/Wordsets Feature - Implementation Plan

## Executive Summary

This plan outlines the implementation of a Custom Word Lists (Wordsets) feature for the Bleep That Sh\*t application. Users will be able to create, manage, and apply reusable lists of words for censorship, stored locally using IndexedDB via Dexie.

---

## 1. Technical Approach & Architecture

### 1.1 Core Architecture

**Storage Layer:**

- Use Dexie.js (already in package.json v4.2.0) for IndexedDB management
- Create a new database file: `/lib/utils/wordsetDb.ts`
- Store wordsets with metadata (name, description, words, created/updated timestamps)

**State Management:**

- React state hooks for UI management (consistent with current app architecture)
- No need for global state management - component-level state is sufficient
- Local state in `app/bleep/page.tsx` for active wordset selection

**UI Components:**

- New component: `/components/WordsetManager.tsx` - Main management interface
- New component: `/components/WordsetSelector.tsx` - Quick selector dropdown
- New component: `/components/WordsetEditor.tsx` - Create/edit modal
- New component: `/components/WordsetList.tsx` - List view with actions

**Integration Points:**

1. Wordset selector in Step 4 (Word Matching section) of bleep page
2. Link to full wordset manager from Step 4
3. Quick actions: Apply wordset, Edit wordset, Create new

### 1.2 Data Flow

```
User creates wordset → Saved to IndexedDB via Dexie
User selects wordset → Loads words into wordsToMatch state
User modifies wordset → Updates IndexedDB + refreshes UI
User deletes wordset → Removes from IndexedDB + updates UI
User applies wordset → Populates wordsToMatch input field
```

---

## 2. Database Schema Design (Dexie)

### 2.1 Database Definition

**File:** `/lib/utils/wordsetDb.ts`

```typescript
import Dexie, { Table } from 'dexie';

export interface Wordset {
  id?: number; // Auto-incrementing primary key
  name: string; // User-friendly name (e.g., "Profanity", "Brand Names")
  description?: string; // Optional description
  words: string[]; // Array of words to censor
  matchMode?: {
    exact: boolean;
    partial: boolean;
    fuzzy: boolean;
  };
  fuzzyDistance?: number; // Default fuzzy distance
  createdAt: Date;
  updatedAt: Date;
  color?: string; // Optional color tag for UI (e.g., "#FF5733")
  isDefault?: boolean; // Mark default wordsets (e.g., "Common Profanity")
}

export class WordsetDatabase extends Dexie {
  wordsets!: Table<Wordset, number>;

  constructor() {
    super('BleepThatShitWordsets');

    this.version(1).stores({
      wordsets: '++id, name, createdAt, updatedAt, isDefault',
    });
  }
}

export const db = new WordsetDatabase();
```

### 2.2 Database Operations

**File:** `/lib/utils/wordsetOperations.ts`

```typescript
import { db, Wordset } from './wordsetDb';

// Create a new wordset
export async function createWordset(
  wordset: Omit<Wordset, 'id' | 'createdAt' | 'updatedAt'>
): Promise<number> {
  const now = new Date();
  return await db.wordsets.add({
    ...wordset,
    createdAt: now,
    updatedAt: now,
  });
}

// Get all wordsets
export async function getAllWordsets(): Promise<Wordset[]> {
  return await db.wordsets.toArray();
}

// Get wordset by ID
export async function getWordsetById(id: number): Promise<Wordset | undefined> {
  return await db.wordsets.get(id);
}

// Update wordset
export async function updateWordset(
  id: number,
  updates: Partial<Omit<Wordset, 'id' | 'createdAt'>>
): Promise<number> {
  return await db.wordsets.update(id, {
    ...updates,
    updatedAt: new Date(),
  });
}

// Delete wordset
export async function deleteWordset(id: number): Promise<void> {
  await db.wordsets.delete(id);
}

// Search wordsets by name
export async function searchWordsets(query: string): Promise<Wordset[]> {
  return await db.wordsets
    .filter(ws => ws.name.toLowerCase().includes(query.toLowerCase()))
    .toArray();
}

// Duplicate wordset
export async function duplicateWordset(id: number): Promise<number> {
  const original = await db.wordsets.get(id);
  if (!original) throw new Error('Wordset not found');

  const { id: _, createdAt, updatedAt, name, ...rest } = original;
  return await createWordset({
    ...rest,
    name: `${name} (Copy)`,
  });
}

// Initialize default wordsets (run on first app load)
export async function initializeDefaultWordsets(): Promise<void> {
  const count = await db.wordsets.count();
  if (count === 0) {
    // Add some starter wordsets
    await createWordset({
      name: 'Common Profanity',
      description: 'Most common profane words',
      words: ['fuck', 'shit', 'damn', 'hell', 'ass', 'bitch'],
      matchMode: { exact: true, partial: false, fuzzy: false },
      isDefault: true,
      color: '#EF4444',
    });

    await createWordset({
      name: 'Mild Profanity',
      description: 'Milder swear words',
      words: ['crap', 'dang', 'heck', 'frick'],
      matchMode: { exact: true, partial: false, fuzzy: false },
      isDefault: true,
      color: '#F59E0B',
    });
  }
}
```

---

## 3. UI/UX Considerations & Component Structure

### 3.1 Component Hierarchy

```
app/bleep/page.tsx (existing)
├── WordsetSelector (new) - In Step 4 section
│   ├── Dropdown to select wordset
│   ├── "Apply" button
│   ├── "Manage Wordsets" link → opens WordsetManager
│   └── Quick actions (edit, duplicate)
│
└── WordsetManager (new) - Modal/separate page
    ├── WordsetList (new) - Display all wordsets
    │   ├── WordsetCard (new) - Individual wordset
    │   │   ├── Name, description, word count
    │   │   ├── Actions: Edit, Duplicate, Delete, Apply
    │   │   └── Color tag/badge
    │   └── Search/filter bar
    │
    └── WordsetEditor (new) - Create/Edit form
        ├── Name input
        ├── Description textarea
        ├── Words textarea (comma-separated)
        ├── Match mode checkboxes
        ├── Fuzzy distance slider
        ├── Color picker
        └── Save/Cancel buttons
```

### 3.2 User Flow Wireframes

**Step 4 Enhancement (Word Matching Section):**

```
┌─────────────────────────────────────────────────────────┐
│ [4] Enter Words to Bleep                                 │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ 🎯 Quick Apply Wordset:                                  │
│ ┌────────────────────────────────┐  [Apply] [Manage]    │
│ │ Select a wordset...         ▼  │                       │
│ └────────────────────────────────┘                       │
│                                                           │
│ ─────────── OR ───────────                               │
│                                                           │
│ Words to match (comma-separated)                         │
│ ┌────────────────────────────────────────────────────┐   │
│ │ bad, word, curse                                   │   │
│ └────────────────────────────────────────────────────┘   │
│                                                           │
│ [Matching modes checkboxes...]                           │
└─────────────────────────────────────────────────────────┘
```

**Wordset Manager Modal:**

```
┌─────────────────────────────────────────────────────────┐
│ Manage Word Lists                              [✕ Close] │
├─────────────────────────────────────────────────────────┤
│ [+ New Wordset]        🔍 [Search wordsets...]          │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🔴 Common Profanity                   [⚡ Apply]     │ │
│ │ Most common profane words                            │ │
│ │ 6 words • Exact match • Created Jan 15, 2025         │ │
│ │ [Edit] [Duplicate] [Delete]                          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🟠 Mild Profanity                     [⚡ Apply]     │ │
│ │ Milder swear words                                   │ │
│ │ 4 words • Exact match • Created Jan 15, 2025         │ │
│ │ [Edit] [Duplicate] [Delete]                          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🟣 My Custom List                     [⚡ Apply]     │ │
│ │ Brand names and competitor mentions                  │ │
│ │ 12 words • Partial match • Created Jan 20, 2025      │ │
│ │ [Edit] [Duplicate] [Delete]                          │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 3.3 UX Enhancements

1. **Visual Feedback:**
   - Color-coded wordsets for easy identification
   - Word count badge
   - Last updated timestamp
   - "Applied" indicator when a wordset is active

2. **Validation:**
   - Prevent duplicate wordset names
   - Require at least one word
   - Warn if deleting default wordsets
   - Confirm before deleting wordsets with user data

3. **Accessibility:**
   - Keyboard navigation for all actions
   - ARIA labels for screen readers
   - Focus management in modals
   - Color-blind friendly indicators (not just color)

4. **Responsive Design:**
   - Mobile-friendly modals (slide-up drawer on mobile)
   - Touch-friendly buttons (min 44px touch targets)
   - Horizontal scrolling for long word lists

5. **Performance:**
   - Lazy load wordset manager
   - Virtualized list for 100+ wordsets
   - Debounced search input

---

## 4. Integration Points with Existing Pipeline

### 4.1 Bleep Page Integration

**File:** `/app/bleep/page.tsx`

**Changes needed:**

1. **Add state for wordset selection:**

```typescript
const [selectedWordsetId, setSelectedWordsetId] = useState<number | null>(null);
const [wordsets, setWordsets] = useState<Wordset[]>([]);
const [showWordsetManager, setShowWordsetManager] = useState(false);
```

2. **Load wordsets on mount:**

```typescript
useEffect(() => {
  const loadWordsets = async () => {
    await initializeDefaultWordsets();
    const allWordsets = await getAllWordsets();
    setWordsets(allWordsets);
  };
  loadWordsets();
}, []);
```

3. **Add apply wordset handler:**

```typescript
const handleApplyWordset = async (wordsetId: number) => {
  const wordset = await getWordsetById(wordsetId);
  if (wordset) {
    setWordsToMatch(wordset.words.join(', '));
    if (wordset.matchMode) {
      setMatchMode(wordset.matchMode);
    }
    if (wordset.fuzzyDistance !== undefined) {
      setFuzzyDistance(wordset.fuzzyDistance);
    }
    setSelectedWordsetId(wordsetId);
  }
};
```

### 4.2 No Changes Needed To:

- Transcription worker - operates independently
- Audio processing - receives bleepSegments as input
- Matching logic - already handles comma-separated words
- Bleep merger - operates on segments

---

## 5. Step-by-Step Implementation Tasks

### Phase 1: Database & Core Operations (2-3 hours)

- [ ] Create `/lib/utils/wordsetDb.ts` with Dexie database
- [ ] Create `/lib/utils/wordsetOperations.ts` with CRUD operations
- [ ] Add unit tests for database operations
- [ ] Test data persistence across page refreshes

### Phase 2: UI Components (4-6 hours)

- [ ] Create WordsetSelector component
- [ ] Create WordsetEditor component
- [ ] Create WordsetList component
- [ ] Create WordsetManager component
- [ ] Style with Tailwind CSS
- [ ] Add unit tests with React Testing Library

### Phase 3: Integration (2-3 hours)

- [ ] Update bleep page state
- [ ] Add WordsetSelector to Step 4
- [ ] Add WordsetManager modal
- [ ] Test applying wordsets populates words correctly
- [ ] Test integration with bleeping pipeline

### Phase 4: Testing & Documentation (2-3 hours)

- [ ] Create E2E tests with Playwright
- [ ] Achieve >80% code coverage
- [ ] Update documentation
- [ ] Accessibility audit

---

## 6. Testing Strategy

### Unit Tests (Vitest)

Test all database operations, component rendering, and state management.

### E2E Tests (Playwright)

- Test: Create new wordset
- Test: Apply wordset to bleep page
- Test: Edit existing wordset
- Test: Delete wordset
- Test: Full workflow (create → apply → bleep)

---

## 7. Potential Challenges & Solutions

### Challenge 1: IndexedDB Browser Compatibility

**Solution:** Dexie has excellent support (95%+). Add fallback to localStorage.

### Challenge 2: Large Wordsets Performance

**Solution:** Implement virtualized list or pagination for 100+ wordsets.

### Challenge 3: Duplicate Word Handling

**Solution:** De-duplicate words when combining multiple wordsets.

### Challenge 4: Data Migration

**Solution:** Use Dexie's versioning system for schema changes.

---

## 8. Timeline Estimate

**Total: 12-18 hours**

- Phase 1: Database & CRUD (2-3 hours)
- Phase 2: UI Components (4-6 hours)
- Phase 3: Integration (2-3 hours)
- Phase 4: Testing & Documentation (2-3 hours)
- Phase 5: Optional Enhancements (2-3 hours)

---

## 9. Success Metrics

- % of users who create at least one wordset
- Average number of wordsets per user
- IndexedDB read/write latency (<50ms)
- UI responsiveness with 100+ wordsets
- > 80% code coverage for new code

---

## 10. Future Enhancements

1. Cloud sync across devices
2. Community wordsets (share/download)
3. AI-powered word suggestions
4. Categories/tags for organization
5. Import/export functionality
6. Regex support in wordsets
7. Multilingual support
8. Version history for wordsets
