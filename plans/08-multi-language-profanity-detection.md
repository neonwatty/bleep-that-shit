# Multi-Language Profanity Detection - Implementation Plan

## Executive Summary

This plan details how to add multi-language profanity detection to Bleep That Sh\*t!, extending the current English-only word matching to support 10+ languages. The implementation will leverage Whisper's existing multi-language transcription capabilities and add curated profanity word lists for each language, all working entirely client-side.

---

## 1. Technical Approach for Sourcing/Maintaining Profanity Word Lists

### 1.1 Data Sources Strategy

**Primary Sources:**

- Community-maintained open-source lists: `LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words` (GitHub)
- Language-specific repositories
- Manual curation with native speaker verification

**Quality Control:**

- Verify words with native speakers
- Test against severity levels (mild, moderate, severe)
- Remove false positives

### 1.2 Data Structure & Storage

**File Organization:**

```
/public/profanity/
├── profanity-lists.json       # Master index file
├── en.json                    # English profanity list
├── es.json                    # Spanish profanity list
├── fr.json                    # French profanity list
├── de.json                    # German profanity list
├── it.json                    # Italian profanity list
├── pt.json                    # Portuguese profanity list
├── nl.json                    # Dutch profanity list
├── pl.json                    # Polish profanity list
├── ja.json                    # Japanese profanity list
├── zh.json                    # Chinese profanity list
└── ko.json                    # Korean profanity list
```

**Individual Language File Format** (`en.json` example):

```json
{
  "language": "en",
  "languageName": "English",
  "version": "1.0.0",
  "lastUpdated": "2025-01-15",
  "categories": {
    "general": {
      "severity": "moderate",
      "words": ["damn", "hell", "crap", "ass"]
    },
    "strong": {
      "severity": "severe",
      "words": ["shit", "fuck", "bitch"]
    },
    "slurs": {
      "severity": "severe",
      "words": []
    },
    "religious": {
      "severity": "mild-moderate",
      "words": ["goddamn", "jesus christ"]
    }
  },
  "variants": {
    "shit": ["sh*t", "shite", "sht"],
    "fuck": ["f*ck", "fck", "fuk"]
  }
}
```

### 1.3 Optimization for Client-Side Performance

**Compression Strategy:**

- Gzip JSON files (automatic via Next.js)
- Lazy load language files only when needed
- Cache loaded lists in IndexedDB using Dexie

**Bundle Size Management:**

- Each language file: ~5-15 KB uncompressed, ~2-5 KB gzipped
- Total for 10 languages: ~50-150 KB uncompressed, ~20-50 KB gzipped
- Negligible compared to Whisper models (39-242 MB)

---

## 2. Language Detection Strategy

### 2.1 Leverage Whisper's Language Detection

Whisper automatically detects language when using multilingual models. We need to expose this in the transcription result:

```typescript
// In transcriptionWorker.ts - enhance result format
interface TranscriptionResult {
  text: string;
  chunks: Array<{
    text: string;
    timestamp: [number, number];
  }>;
  detectedLanguage?: string; // NEW
  languageConfidence?: number; // NEW
}
```

### 2.2 Language Selection Modes

1. **Manual Selection** (Default for English-only models)
2. **Auto-Detect** (Default for multilingual models)
3. **Override** (Always available)

---

## 3. Data Structure for Multi-Language Word Lists

### 3.1 ProfanityMatcher Utility Class

**File:** `/lib/utils/profanityMatcher.ts`

```typescript
export interface ProfanityList {
  language: string;
  languageName: string;
  version: string;
  lastUpdated: string;
  categories: {
    [category: string]: {
      severity: string;
      words: string[];
    };
  };
  variants: {
    [word: string]: string[];
  };
}

export class ProfanityMatcher {
  private lists: Map<string, ProfanityList> = new Map();
  private cache: Map<string, string[]> = new Map();

  async loadLanguage(languageCode: string): Promise<ProfanityList> {
    // Check cache first
    const cached = await this.getCachedList(languageCode);
    if (cached) return cached;

    // Fetch from public directory
    const response = await fetch(`/profanity/${languageCode}.json`);
    const list: ProfanityList = await response.json();

    // Cache in memory and IndexedDB
    this.lists.set(languageCode, list);
    await this.cacheList(languageCode, list);

    return list;
  }

  getWords(languageCode: string, options: MatchOptions = {}): string[] {
    // Return flattened word list based on selected categories
  }

  matchWords(
    transcriptionChunks: Array<{ text: string; timestamp: [number, number] }>,
    languageCode: string,
    options: MatchOptions = {}
  ): Array<{ word: string; start: number; end: number }> {
    // Match profanity against transcription
  }
}

export const profanityMatcher = new ProfanityMatcher();
```

---

## 4. Integration with Existing Bleeping Pipeline

### 4.1 Enhanced State Management in `page.tsx`

Add new state variables:

```typescript
const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
const [languageConfidence, setLanguageConfidence] = useState<number>(1.0);
const [profanityLanguage, setProfanityLanguage] = useState<string>('en');
const [profanityMode, setProfanityMode] = useState<'off' | 'preset' | 'custom'>('off');
const [selectedCategories, setSelectedCategories] = useState<string[]>(['general', 'strong']);
const [includeVariants, setIncludeVariants] = useState(true);
```

### 4.2 Modified Transcription Handler

Update to capture detected language from Whisper:

```typescript
if (result.detectedLanguage) {
  setDetectedLanguage(result.detectedLanguage);
  setLanguageConfidence(result.languageConfidence || 1.0);
  setProfanityLanguage(result.detectedLanguage);
}
```

---

## 5. UI for Language Selection

Add new section in Step 4.5 (between current steps 4 and 5):

```tsx
<section className="editorial-section">
  <h2>Profanity Detection</h2>

  {/* Detection Mode: Off, Preset List, or Custom Words */}
  <div className="mode-selector">
    <label>
      <input type="radio" value="off" />
      Off - Use custom word list only
    </label>
    <label>
      <input type="radio" value="preset" />
      Use Profanity List
    </label>
    <label>
      <input type="radio" value="custom" />
      Custom Words
    </label>
  </div>

  {/* Language Selection (when preset is selected) */}
  {profanityMode === 'preset' && (
    <>
      <div className="language-selector">
        {detectedLanguage && (
          <div>Detected: {detectedLanguage} ({Math.round(languageConfidence * 100)}%)</div>
        )}
        <select value={profanityLanguage} onChange={...}>
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          {/* ... more languages */}
        </select>
      </div>

      {/* Category Selection */}
      <div className="category-selector">
        <label><input type="checkbox" /> General</label>
        <label><input type="checkbox" /> Strong</label>
        <label><input type="checkbox" /> Slurs</label>
        <label><input type="checkbox" /> Religious</label>
      </div>

      {/* Include Variants */}
      <label>
        <input type="checkbox" checked={includeVariants} />
        Include variants and misspellings
      </label>
    </>
  )}
</section>
```

---

## 6. Step-by-Step Implementation Tasks

### Phase 1: Foundation (Week 1)

- [ ] Create `/public/profanity/` directory
- [ ] Design JSON schema for profanity lists
- [ ] Create `profanity-lists.json` master index
- [ ] Implement basic English profanity list (`en.json`)
- [ ] Create `/lib/utils/profanityMatcher.ts`
- [ ] Implement `ProfanityMatcher` class
- [ ] Modify `transcriptionWorker.ts` to extract detected language
- [ ] Write unit tests

### Phase 2: UI Integration (Week 2)

- [ ] Add language detection state variables to `page.tsx`
- [ ] Create "Profanity Detection" section in UI
- [ ] Add language selector dropdown
- [ ] Add category checkboxes
- [ ] Modify `handleMatch()` to support profanity mode
- [ ] Add loading states for profanity list fetching

### Phase 3: Multi-Language Lists (Week 3)

- [ ] Research and vet existing open-source lists
- [ ] Spanish (`es.json`): Source and curate 100+ words
- [ ] French (`fr.json`): Source and curate 100+ words
- [ ] German (`de.json`): Source and curate 100+ words
- [ ] Italian (`it.json`): Source and curate 100+ words
- [ ] Portuguese (`pt.json`): Source and curate 100+ words
- [ ] Add additional languages (Dutch, Polish, Japanese, Chinese, Korean)

### Phase 4: Caching & Performance (Week 4)

- [ ] Extend existing Dexie setup for profanity lists
- [ ] Implement IndexedDB caching
- [ ] Optimize JSON file sizes
- [ ] Test bundle size impact
- [ ] Benchmark matching performance

### Phase 5: Testing & Documentation (Week 5)

- [ ] Unit tests for all languages
- [ ] E2E tests with Playwright
- [ ] Test with native speakers
- [ ] Update documentation

---

## 7. Considerations for Cultural Differences

### 7.1 Severity Levels Vary by Culture

Words that are mild in one culture may be severe in another. Allow users to select severity threshold and provide cultural context notes.

### 7.2 Regional Variations

Spanish in Spain vs Mexico vs Argentina has different profanity. Start with "universal" lists, add regional variants later.

### 7.3 Context-Dependent Words

Some words are offensive in certain contexts but not others. Focus on generally profane words, provide category filtering.

### 7.4 Non-Latin Scripts

Use Unicode normalization for Japanese, Chinese, Korean. Handle both simplified and traditional Chinese.

---

## 8. Testing Strategy Across Languages

### Unit Tests

- Test matching for each supported language
- Test category filtering
- Test variant matching
- Test fuzzy matching with non-Latin scripts
- Test caching mechanisms

### E2E Tests

- Test auto-detection workflow
- Test manual language selection
- Test category filtering in UI
- Test with sample audio in different languages

---

## 9. Performance Implications

### Bundle Size Analysis

- Single language list: ~3-5 KB (~1-2 KB gzipped)
- All 10 languages: ~50 KB (~20 KB gzipped)
- **Impact: Negligible** compared to Whisper models (39-242 MB)

### Runtime Performance

- Exact matching: <10ms for 1000 chunks
- Partial matching: <50ms
- Fuzzy matching: <200ms

### Memory Usage

- Per language list: ~5-15 KB in memory
- Total with 3 languages loaded: ~30-45 KB
- **Minimal memory overhead**

---

## 10. Timeline Estimate

**Total: 5 weeks**

- Week 1: Foundation (data structure, ProfanityMatcher class)
- Week 2: UI integration
- Week 3: Multi-language word list curation
- Week 4: Caching & performance optimization
- Week 5: Testing & documentation

---

## 11. Success Metrics

- % of users enabling profanity detection mode
- Most commonly used languages
- False positive rate (<5% target)
- Profanity list load time (<500ms)
- Matching time for 1000 chunks (<100ms)

---

## 12. Future Enhancements

1. User-contributed lists
2. AI-assisted detection (sentiment analysis)
3. Regional variants (Spain vs Mexico Spanish)
4. Advanced filtering (severity slider)
5. Analytics dashboard
