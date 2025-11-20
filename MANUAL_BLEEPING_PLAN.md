# Manual Time-Based Bleeping Feature - Implementation Plan

## Executive Summary

This document outlines the design and implementation plan for adding **manual time-based bleeping** to Bleep That Sh\*t! This new feature allows users to select time segments directly from an audio waveform visualization, independent of transcription quality. It will work alongside the existing word-based bleeping system.

---

## 🎯 Feature Overview

### Current System

- **Word Matching**: Pattern-based search (exact, partial, fuzzy)
- **Manual Word Selection**: Click words in transcript
- **Limitation**: Both depend on transcription quality

### New Feature: Manual Time Selection

- **Visual Waveform Editor**: See audio waveform
- **Drag-to-Select**: Create time regions by dragging on waveform
- **Precise Control**: Play/pause/scrub to find exact moments
- **Transcription-Independent**: Works without any transcription
- **Combinable**: Mix manual regions with word-based bleeps

---

## 🏗️ Architecture

### Data Structures

```typescript
// Extended BleepSegment with source tracking
interface BleepSegment {
  word: string; // Display label
  start: number; // Start time in seconds
  end: number; // End time in seconds
  source: 'word' | 'manual' | 'merged'; // NEW: Origin tracking
  id: string; // NEW: Unique identifier
  color?: string; // NEW: Visual differentiation
}

// Manual region definition
interface ManualRegion {
  id: string;
  start: number;
  end: number;
  label?: string;
  color: string;
}
```

### State Management

```typescript
// New state additions to app/bleep/page.tsx
const [manualRegions, setManualRegions] = useState<ManualRegion[]>([]);
const [showWaveformEditor, setShowWaveformEditor] = useState(false);
const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

// Computed combined bleeps (automatically merges word + manual)
const allBleepSegments = useMemo(() => {
  const wordBleeps = matchedWords.map(w => ({
    ...w,
    source: 'word' as const,
    id: `word-${w.start}-${w.end}`,
    color: '#ec4899', // pink for word-based
  }));

  const manualBleeps = manualRegions.map(r => ({
    word: r.label || 'Manual',
    start: r.start,
    end: r.end,
    source: 'manual' as const,
    id: r.id,
    color: '#3b82f6', // blue for manual
  }));

  return mergeOverlappingBleeps([...wordBleeps, ...manualBleeps]);
}, [matchedWords, manualRegions]);
```

### Component Hierarchy

```
app/bleep/page.tsx
├── Step 4: Review & Select Words to Bleep
│   ├── Section 1: Word-Based Selection (Existing)
│   │   ├── Pattern Matching Controls
│   │   ├── TranscriptReview (Interactive transcript)
│   │   └── MatchedWordsDisplay
│   │
│   └── Section 2: Manual Time Selection (NEW - Collapsible)
│       ├── [Expand/Collapse Toggle]
│       └── WaveformEditor
│           ├── WaveformVisualization (Wavesurfer.js)
│           ├── PlaybackControls
│           ├── RegionControls
│           └── RegionList
│
├── Step 5: Combined Preview (NEW)
│   └── Shows word-based + manual segments merged
│
└── Step 6: Apply Bleeps (Existing - renumbered from Step 5)
```

---

## 🎨 UI/UX Design

### Updated Step 4: Unified Selection Interface

```
┌──────────────────────────────────────────────────────────────────────┐
│ Step 4: Review Transcript & Select Words to Bleep                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ┌─ Word-Based Selection ─────────────────────────────────────────┐  │
│ │                                                                 │  │
│ │ Search for words to censor:                                    │  │
│ │ ┌─────────────────────────────────────────────────────────────┐│  │
│ │ │ damn, hell, shit                                            ││  │
│ │ └─────────────────────────────────────────────────────────────┘│  │
│ │ Match: ○ Exact  ● Partial  ○ Fuzzy    [Search]               │  │
│ │                                                                 │  │
│ │ [Interactive Transcript - Existing Component]                  │  │
│ │ ┌─────────────────────────────────────────────────────────────┐│  │
│ │ │ Click words below to toggle censoring:                     ││  │
│ │ │                                                             ││  │
│ │ │ 0.00s: This is some text with damn words...                ││  │
│ │ │ 5.23s: More text here with hell in it...                   ││  │
│ │ │                                                             ││  │
│ │ └─────────────────────────────────────────────────────────────┘│  │
│ │                                                                 │  │
│ │ Selected words: 5 words                                        │  │
│ │ [damn] [hell] [shit] [damn] [hell]                            │  │
│ └─────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ ┌─ Manual Time Selection ────────────────────────────[Expand ▼]─┐  │
│ │                                                                 │  │
│ │ For precise control or poor transcription, select time         │  │
│ │ segments directly from the waveform.                           │  │
│ │                                                                 │  │
│ │ Manual regions: 0                          [Click to expand]   │  │
│ └─────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ Total segments to bleep: 5 word-based + 0 manual = 5 total         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Waveform Editor Interface (Expanded)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Step 4: Review Transcript & Select Words to Bleep                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ┌─ Word-Based Selection ─────────────────────────────────────────┐  │
│ │ [Existing UI - Pattern matching + Interactive transcript]      │  │
│ │ Selected: 5 words                                              │  │
│ └─────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ ┌─ Manual Time Selection ────────────────────────────[Collapse ▲]┐  │
│ │                                                                 │  │
│ │ For precise control, select time segments from the waveform.   │  │
│ │                                                                 │  │
│ │ Timeline (click and drag to create regions)                    │  │
│ │ ┌─────────────────────────────────────────────────────────────┐│  │
│ │ │ 0s      5s      10s     15s     20s     25s     30s     35s ││  │
│ │ │ ┴───────┴───────┴───────┴───────┴───────┴───────┴───────┴── ││  │
│ │ ├─────────────────────────────────────────────────────────────┤│  │
│ │ │               WAVEFORM VISUALIZATION                        ││  │
│ │ │  ╱╲╱╲  ╱╲╱╲╱╲   ╱╲  ╱╲╱╲╱╲   ╱╲╱╲  ╱╲   ╱╲╱╲  ╱╲╱╲        ││  │
│ │ │ ╱  ╲╱╲╱  ╲  ╲╱╲╱  ╲╱  ╲  ╲╱╲╱  ╲╱╲╱  ╲╱╲╱  ╲╱  ╲         ││  │
│ │ │                                                             ││  │
│ │ │ ████████          [Pink: Word-based bleeps (from above)]    ││  │
│ │ │        ██████     [Blue: Manual regions (editable)]         ││  │
│ │ │                ████████   [Purple: Merged/overlapping]      ││  │
│ │ │                                                             ││  │
│ │ │ Cursor: 12.45s (hover to see time)                         ││  │
│ │ └─────────────────────────────────────────────────────────────┘│  │
│ │                                                                 │  │
│ │ ┌─ Playback Controls ───────────────────────────────────────┐ │  │
│ │ │  [◄◄ -10s]  [▶ Play]  [►► +10s]  [🔊──●───] 80%         │ │  │
│ │ │  Speed: [1.0x ▼]  [☐ Loop Selected]                      │ │  │
│ │ └───────────────────────────────────────────────────────────┘ │  │
│ │                                                                 │  │
│ │ ┌─ Region Tools ────────────────────────────────────────────┐ │  │
│ │ │  [+ Add Region]  [Delete Selected]  [Clear All]          │ │  │
│ │ │  [☑ Snap to Zero]  [Zoom: ― ◯ +]                        │ │  │
│ │ └───────────────────────────────────────────────────────────┘ │  │
│ │                                                                 │  │
│ │ ┌─ Manual Regions (3) ─────────────────[Export JSON]────────┐ │  │
│ │ │ ┌──┬─────────┬─────────┬─────────┬────────────────────┐  │ │  │
│ │ │ │# │ Start   │ End     │ Duration│ Actions            │  │ │  │
│ │ │ ├──┼─────────┼─────────┼─────────┼────────────────────┤  │ │  │
│ │ │ │1 │  2.35s  │  4.12s  │  1.77s  │ [▶] [✏️] [🗑]     │  │ │  │
│ │ │ │2 │  8.90s  │ 10.05s  │  1.15s  │ [▶] [✏️] [🗑] ⚠️  │  │ │  │
│ │ │ │3 │ 15.20s  │ 16.80s  │  1.60s  │ [▶] [✏️] [🗑]     │  │ │  │
│ │ │ └──┴─────────┴─────────┴─────────┴────────────────────┘  │ │  │
│ │ │ ⚠️ = Overlaps with word-based bleep                       │ │  │
│ │ └───────────────────────────────────────────────────────────┘ │  │
│ │                                                                 │  │
│ │ Tips: Drag on waveform to create • Drag edges to resize •     │  │
│ │       Space to play/pause • Delete key to remove selected      │  │
│ └─────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ Combined total: 5 word-based + 3 manual = 7 segments (merged: 8)   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Combined Preview (Before Applying Bleeps)

```
┌──────────────────────────────────────────────────────────────┐
│ Step 5: Preview Combined Bleeps                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Timeline Visualization (40.5s total audio)                  │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 0s          10s         20s         30s         40s    │  │
│ │ ┴───────────┴───────────┴───────────┴───────────┴───   │  │
│ │ ████ ██ █████ ███ ████ █ ██ ████                       │  │
│ │                                                        │  │
│ │ Legend:                                                │  │
│ │ ██ Pink = Word-based (5 segments)                     │  │
│ │ ██ Blue = Manual (3 segments)                         │  │
│ │ ██ Purple = Merged (1 segment)                        │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ Summary:                                                     │
│ • Total segments: 9 (after merging: 8)                      │
│ • Word-based bleeps: 5                                      │
│ • Manual regions: 3                                         │
│ • Merged overlaps: 1                                        │
│ • Total censored time: 12.3s / 40.5s (30.4%)               │
│                                                              │
│ [< Back to Edit]        [Continue to Apply Bleeps >]        │
└──────────────────────────────────────────────────────────────┘
```

### Mobile Layout (<768px)

```
┌─────────────────────────────┐
│ Step 4: Select to Bleep     │
├─────────────────────────────┤
│                             │
│ ┌─ Word-Based ───────────┐  │
│ │ [Pattern matching UI]  │  │
│ │ Selected: 5 words      │  │
│ └────────────────────────┘  │
│                             │
│ ┌─ Manual ──────[Expand]─┐  │
│ │ Manual regions: 0      │  │
│ └────────────────────────┘  │
│                             │
├──── When Expanded: ─────────┤
│                             │
│ ┌─ Manual ──────[Close]──┐  │
│ │                        │  │
│ │ [Waveform - Simplfied] │  │
│ │ ┌──────────────────┐   │  │
│ │ │  0s   10s   20s  │   │  │
│ │ │  ┴─────┴─────┴── │   │  │
│ │ │  ╱╲╱╲ ╱╲ ╱╲╱╲   │   │  │
│ │ │  ████    ████    │   │  │
│ │ └──────────────────┘   │  │
│ │                        │  │
│ │ [▶] [||] [🔊] 1.0x    │  │
│ │ 3.45s / 25.80s         │  │
│ │                        │  │
│ │ Regions (2) [+ Add]    │  │
│ │                        │  │
│ │ ▼ Region 1             │  │
│ │   2.35s → 4.12s        │  │
│ │   [▶] [Edit] [Delete]  │  │
│ │                        │  │
│ │ ▼ Region 2             │  │
│ │   8.90s → 10.05s       │  │
│ │   [▶] [Edit] [Delete]  │  │
│ └────────────────────────┘  │
│                             │
│ Total: 5 + 2 = 7 segments   │
│                             │
│ [Continue to Preview →]     │
│                             │
└─────────────────────────────┘

[⊕] Floating Action Button
    (Quick Add Region)
```

### Region Edit Modal (Mobile)

```
┌─────────────────────────────┐
│ Add Manual Region      [×]  │
├─────────────────────────────┤
│                             │
│ Start Time:                 │
│ ┌─────────────────────────┐ │
│ │ 2.35          seconds   │ │
│ └─────────────────────────┘ │
│ [Use Current Time: 3.45s]   │
│                             │
│ End Time:                   │
│ ┌─────────────────────────┐ │
│ │ 4.12          seconds   │ │
│ └─────────────────────────┘ │
│                             │
│ Duration: 1.77s             │
│                             │
│ Label (optional):           │
│ ┌─────────────────────────┐ │
│ │ Explicit content        │ │
│ └─────────────────────────┘ │
│                             │
│ [Cancel]      [Add Region]  │
│                             │
└─────────────────────────────┘
```

---

## 🎨 Color Coding System

### Visual Differentiation

```css
/* Word-based bleeps (from transcription) */
.word-bleep {
  background: rgba(236, 72, 153, 0.3); /* pink-500 */
  border: 2px solid #ec4899;
}

/* Manual time-based bleeps */
.manual-bleep {
  background: rgba(59, 130, 246, 0.3); /* blue-500 */
  border: 2px solid #3b82f6;
}

/* Merged/overlapping bleeps */
.merged-bleep {
  background: rgba(147, 51, 234, 0.3); /* purple-600 */
  border: 2px solid #9333ea;
}

/* Selected region highlight */
.region-selected {
  border-width: 3px;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  animation: pulse 2s infinite;
}
```

---

## ⚙️ Technical Implementation

### Dependencies

```json
{
  "dependencies": {
    "wavesurfer.js": "^7.8.0",
    "@wavesurfer/react": "^1.0.7"
  }
}
```

**Bundle Impact**: ~65KB gzipped (wavesurfer.js + plugins)

### Key Components

#### 1. WaveformVisualization.tsx

- Wraps Wavesurfer.js with React
- Manages regions plugin
- Handles playback state
- Emits region events

#### 2. WaveformEditor.tsx

- Container for waveform UI
- Region state management
- Playback controls
- Region list table

#### 3. CombinedBleepPreview.tsx

- Shows merged segments visualization
- Statistics breakdown
- Timeline preview

### Integration with Existing Audio Processing

**No changes needed** to `applyBleeps()` function! It already accepts generic `BleepSegment[]` arrays.

```typescript
// In handleBleep() - just combine the sources
const finalSegments = useMemo(() => {
  const allSegments = [
    ...matchedWords.map(w => ({ ...w, source: 'word' })),
    ...manualRegions.map(r => ({
      word: r.label || 'Manual',
      start: r.start,
      end: r.end,
      source: 'manual'
    }))
  ];

  // Apply buffer and merge overlaps (existing utility)
  const withBuffer = allSegments.map(s => ({
    ...s,
    start: Math.max(0, s.start - bleepBuffer),
    end: s.end + bleepBuffer
  }));

  return mergeOverlappingBleeps(withBuffer);
}, [matchedWords, manualRegions, bleepBuffer]);

// Pass to existing audio processor
await applyBleeps(audioBuffer, finalSegments, bleepSound, ...);
```

---

## 🔄 User Workflow

### Updated Steps

1. **Upload file** (unchanged)
2. **Select language & model** (unchanged)
3. **Transcribe** (unchanged)
4. **Review & select words to bleep** ⭐ ENHANCED
   - **Word-Based Section** (existing): Pattern matching + interactive transcript
   - **Manual Time Selection** (NEW - collapsible): Waveform editor for precise time-based selection
   - Both sections can be used together automatically
5. **Preview combined bleeps** ⭐ NEW
   - Visual timeline showing all segments (word + manual merged)
   - Statistics breakdown
6. **Choose bleep sound & volume** (unchanged - renumbered from Step 5)
7. **Apply bleeps!** (unchanged - renumbered from Step 6)

---

## 📊 Key Features

### Region Management

**Create Regions:**

- Click and drag on waveform (desktop)
- Modal input form (mobile)
- Keyboard shortcut: `N` at cursor position

**Edit Regions:**

- Drag edges to resize
- Drag center to move
- Double-click to edit label
- Input precise times in table

**Delete Regions:**

- Click region + press Delete key
- Click trash icon in table
- Bulk: "Clear All" button

### Playback Controls

```
Play/Pause: Space bar or [▶] button
Skip: ←/→ (5s), Shift+←/→ (10s)
Volume: Slider (0-100%)
Speed: 0.5x, 1.0x, 1.5x, 2.0x
Loop: Repeat selected region
```

### Keyboard Shortcuts

```
Playback:
  Space     - Play/pause
  ← / →     - Skip 5s backward/forward
  Shift+← → - Skip 10s backward/forward
  Home/End  - Jump to start/end

Regions:
  N         - New region at cursor
  Del       - Delete selected region
  D         - Duplicate selected region
  ← / →     - Nudge region 0.1s (when selected)

View:
  + / -     - Zoom in/out
  0         - Reset zoom

Other:
  Esc       - Deselect all
  ?         - Show shortcuts help
```

---

## 🧪 Testing Strategy

### Unit Tests (Vitest)

```typescript
// Region merging logic
describe('mergeOverlappingBleeps with mixed sources', () => {
  it('combines word and manual bleeps', () => {
    const segments = [
      { start: 1.0, end: 2.0, source: 'word', word: 'bad' },
      { start: 1.5, end: 2.5, source: 'manual', word: 'Manual' }
    ];

    const result = mergeOverlappingBleeps(segments);
    expect(result[0].source).toBe('merged');
  });
});

// WaveformEditor component
describe('WaveformEditor', () => {
  it('creates region on drag', async () => {
    const onRegionsChange = vi.fn();
    render(<WaveformEditor onRegionsChange={onRegionsChange} />);

    // Simulate drag...
    expect(onRegionsChange).toHaveBeenCalled();
  });
});
```

### E2E Tests (Playwright)

```typescript
test('complete manual bleeping workflow', async ({ page }) => {
  await page.goto('/bleep');
  await uploadTestFile(page, 'test-audio.mp3');

  // Select manual mode
  await page.getByRole('radio', { name: 'Manual' }).click();

  // Wait for waveform
  await expect(page.getByTestId('waveform')).toBeVisible();

  // Create region by dragging
  const waveform = page.getByTestId('waveform');
  await waveform.dragTo(waveform, {
    sourcePosition: { x: 100, y: 50 },
    targetPosition: { x: 300, y: 50 },
  });

  // Verify region created
  await expect(page.getByText('Manual Regions (1)')).toBeVisible();

  // Apply bleeps
  await page.getByRole('button', { name: 'Bleep!' }).click();
  await expect(page.getByTestId('result')).toBeVisible();
});
```

---

## 📈 Performance Considerations

### Large File Optimization

```typescript
// Use pre-computed peaks for files >10MB
const isLargeFile = file.size > 10 * 1024 * 1024;

if (isLargeFile) {
  // Generate waveform data in Web Worker
  const peaks = await generatePeaksInWorker(file);
  wavesurfer.load(audioUrl, peaks);
} else {
  // Direct load for small files
  wavesurfer.load(audioUrl);
}
```

### Memory Management

- Destroy Wavesurfer instance on unmount
- Revoke blob URLs when done
- Limit to 100 regions max
- Lazy load waveform component (code splitting)

### Browser Compatibility

**Required:**

- Web Audio API
- ES6+ features
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+)

**Fallback:**

```typescript
if (!window.AudioContext) {
  return (
    <Alert type="warning">
      Your browser doesn't support the waveform editor.
      Please use word-based bleeping instead.
    </Alert>
  );
}
```

---

## 📅 Implementation Phases

### Phase 1: Core Waveform (Week 1)

- [ ] Install Wavesurfer.js
- [ ] Create WaveformVisualization component
- [ ] Basic playback controls
- [ ] Collapsible section UI for manual time selection
- [ ] Unit tests

### Phase 2: Region Management (Week 2)

- [ ] Regions plugin integration
- [ ] Create/resize/delete regions
- [ ] Region list table
- [ ] Timeline markers
- [ ] State management

### Phase 3: Combined Mode (Week 3)

- [ ] Merge word + manual bleeps
- [ ] Visual color coding
- [ ] Combined preview component
- [ ] Update handleBleep()
- [ ] E2E tests

### Phase 4: Polish & Mobile (Week 4)

- [ ] Mobile-responsive layout
- [ ] Touch gestures
- [ ] Keyboard shortcuts
- [ ] Accessibility improvements
- [ ] Performance optimization

### Phase 5: Advanced (Future)

- [ ] Export/import regions JSON
- [ ] Undo/redo
- [ ] Snap-to-zero-crossing
- [ ] Zoom in/out
- [ ] Auto-silence detection

---

## 💡 Key Benefits

1. **Unified Interface**: No mode switching - both methods available in one view
2. **Transcription-Independent**: Manual selection works without quality transcription
3. **Visual Precision**: See exactly what you're bleeping on the waveform
4. **Automatic Merging**: Word-based and manual selections combine seamlessly
5. **Progressive Enhancement**: Manual section collapses when not needed
6. **No Breaking Changes**: Integrates seamlessly with existing word-based UI
7. **Mobile-Friendly**: Touch gestures and simplified UI for phones

---

## ✅ Success Metrics

**Functional:**

- ✓ Waveform loads <2s for files <5MB
- ✓ Region creation <100ms latency
- ✓ 100% accurate bleep merging
- ✓ Zero audio processing regressions

**User Experience:**

- ✓ 90% users create first region in <30s
- ✓ 50% reduction in steps for non-word bleeping
- ✓ 80%+ rate mobile interaction as "easy"

**Technical:**

- ✓ Bundle size increase <70KB gzipped
- ✓ No memory leaks after 100 operations
- ✓ Works on 95%+ target browsers
- ✓ 85%+ test coverage for new code

---

## 🎓 Documentation Needs

### User Docs

- [ ] "How to use manual time selection" guide
- [ ] Video tutorial (2-3 min)
- [ ] FAQ section:
  - "When should I use manual time selection?"
  - "Can I use both word-based and manual together?" (Yes, automatically!)
  - "What if transcription quality is poor?" (Use manual selection)
- [ ] Keyboard shortcuts reference

### Developer Docs

- [ ] Component API reference
- [ ] Architecture diagram showing collapsible sections
- [ ] Integration guide
- [ ] Performance tips

---

## 🚀 Next Steps

1. **Review & Approve**: Validate this unified collapsible approach ✅
2. **Design Mockups**: Create high-fidelity Figma designs (optional)
3. **Technical Spike**: 2-day proof-of-concept with Wavesurfer.js
4. **Begin Phase 1**: Install dependencies and build collapsible waveform section
5. **Weekly Demos**: Show progress and gather feedback

## 📝 Design Notes

### Why Collapsible Instead of Mode Selector?

**Advantages:**

- ✅ **Simpler UX**: No mode switching needed - both methods always available
- ✅ **Less cognitive load**: Users don't need to choose a "mode" upfront
- ✅ **Progressive disclosure**: Manual section hidden until needed
- ✅ **Automatic combining**: Both methods work together naturally
- ✅ **Cleaner UI**: No redundant mode selector taking up space
- ✅ **Better defaults**: Word-based section shown first (most common use case)

**Implementation:**

- Manual Time Selection section starts **collapsed** by default
- Expands when user clicks "Expand" button
- Shows region count even when collapsed (e.g., "Manual regions: 3")
- Persists expanded/collapsed state during session

---

## 📎 Appendix: Code Examples

### Wavesurfer.js Initialization

```typescript
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';

const wavesurfer = WaveSurfer.create({
  container: containerRef.current,
  waveColor: '#ddd',
  progressColor: '#3b82f6',
  cursorColor: '#111',
  height: 128,
  normalize: true,
  plugins: [
    RegionsPlugin.create(),
    TimelinePlugin.create({
      height: 32,
      timeInterval: 5,
      primaryLabelInterval: 10,
    }),
  ],
});

wavesurfer.load(URL.createObjectURL(audioFile));

wavesurfer.on('region-created', region => {
  onRegionCreate({
    id: region.id,
    start: region.start,
    end: region.end,
    color: '#3b82f6',
  });
});
```

### Region Management Hook

```typescript
import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export function useManualRegions() {
  const [regions, setRegions] = useState<ManualRegion[]>([]);

  const addRegion = useCallback((start: number, end: number) => {
    setRegions(prev => [
      ...prev,
      {
        id: uuidv4(),
        start,
        end,
        label: 'Manual',
        color: '#3b82f6',
      },
    ]);
  }, []);

  const updateRegion = useCallback((id: string, updates: Partial<ManualRegion>) => {
    setRegions(prev => prev.map(r => (r.id === id ? { ...r, ...updates } : r)));
  }, []);

  const deleteRegion = useCallback((id: string) => {
    setRegions(prev => prev.filter(r => r.id !== id));
  }, []);

  return { regions, addRegion, updateRegion, deleteRegion };
}
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-17
**Author**: Claude Code Planning Team
**Status**: Ready for Review
