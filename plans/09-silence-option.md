# Silence Option (Alternative to Bleep) - Implementation Plan

## Executive Summary

This plan outlines the implementation of a silence/mute option as an alternative to the current bleep tone censorship. The feature will allow users to choose between bleep sounds or complete silence for each censored segment, supporting mixed modes within a single file.

---

## 1. Technical Approach for Implementing Silence

### Current Implementation Analysis

The current bleep implementation in `lib/utils/audioProcessor.ts` works as follows:

1. **Audio Ducking**: Reduces original audio volume during bleep segments
2. **Bleep Sound Addition**: Overlays a bleep sound on top of ducked audio
3. **Gain Automation**: Uses `linearRampToValueAtTime` for smooth transitions

### Silence Implementation Strategy

For silence, we need to:

- When silence mode is selected, set `originalVolumeReduction = 0` (complete mute)
- Skip loading and playing the bleep sound buffer entirely
- Keep the same gain automation structure for consistency

```typescript
// Pseudocode for silence implementation
if (segment.mode === 'silence') {
  // Complete mute - no bleep sound needed
  gainNode.gain.linearRampToValueAtTime(0, startTime); // Ramp to 0
  gainNode.gain.setValueAtTime(0, endTime); // Hold at 0
  gainNode.gain.linearRampToValueAtTime(1, endTime + 0.01); // Ramp back
  // Skip bleep sound creation entirely
} else {
  // Existing bleep logic
}
```

---

## 2. UI/UX Design for Mode Selection

### Two-Tier Approach

**Tier 1: Global Default Setting**

- Location: Step 5 ("Choose Bleep Sound & Volume" section)
- Add a mode selector ABOVE the existing bleep sound dropdown
- Options: "Bleep Sound" | "Silence/Mute"
- When "Silence" is selected:
  - Hide bleep sound dropdown
  - Hide bleep volume slider
  - Show explanation: "Words will be completely muted (no sound)"

**UI Component Structure:**

```tsx
<section className="editorial-section">
  <h2>Choose Censorship Method</h2>

  {/* NEW: Mode selector */}
  <div className="mode-selector">
    <button onClick={() => setCensorMode('bleep')}>🔊 Bleep Sound</button>
    <button onClick={() => setCensorMode('silence')}>🔇 Silence/Mute</button>
  </div>

  {/* Conditional rendering based on mode */}
  {censorMode === 'bleep' && (
    <>
      {/* Existing bleep sound dropdown */}
      {/* Existing bleep volume slider */}
    </>
  )}

  {censorMode === 'silence' && (
    <div className="info-message">
      ℹ️ Words will be completely muted (no sound). Adjust the buffer below to extend silence
      before/after each word.
    </div>
  )}
</section>
```

---

## 3. Changes Needed to Audio Processing Pipeline

### File: `lib/utils/audioProcessor.ts`

**Changes to `BleepSegment` interface:**

```typescript
export interface BleepSegment {
  word: string;
  start: number;
  end: number;
  mode?: 'bleep' | 'silence'; // NEW: Optional mode per segment
}
```

**Changes to `applyBleeps` function signature:**

```typescript
export async function applyBleeps(
  audioFile: File,
  bleepSegments: BleepSegment[],
  bleepSound: string = 'bleep',
  bleepVolume: number = 0.8,
  originalVolumeReduction: number = 0.1,
  defaultMode: 'bleep' | 'silence' = 'bleep' // NEW: Default mode
): Promise<Blob>;
```

**Changes to processing logic:**

1. **Conditional bleep sound loading:**

```typescript
// Only load bleep sound if at least one segment uses bleep mode
const needsBleepSound = bleepSegments.some(seg => (seg.mode || defaultMode) === 'bleep');
let bleepBuffer: AudioBuffer | null = null;

if (needsBleepSound) {
  const bleepResponse = await fetch(getPublicPath(`/bleeps/${bleepSound}.mp3`));
  const bleepArrayBuffer = await bleepResponse.arrayBuffer();
  bleepBuffer = await audioContext.decodeAudioData(bleepArrayBuffer);
}
```

2. **Per-segment mode handling:**

```typescript
bleepSegments.forEach((segment, index) => {
  const segmentMode = segment.mode || defaultMode;

  if (segmentMode === 'silence') {
    // SILENCE MODE: Complete mute
    gainNode.gain.linearRampToValueAtTime(0, startTime);
    gainNode.gain.setValueAtTime(0, endTime);
    gainNode.gain.linearRampToValueAtTime(1, endTime + 0.01);
    // No bleep sound added
  } else {
    // BLEEP MODE: Existing logic
    gainNode.gain.linearRampToValueAtTime(originalVolumeReduction, startTime);
    gainNode.gain.setValueAtTime(originalVolumeReduction, endTime);
    gainNode.gain.linearRampToValueAtTime(1, endTime + 0.01);

    // Add bleep sound
    if (bleepBuffer) {
      const bleepSource = offlineContext.createBufferSource();
      bleepSource.buffer = bleepBuffer;
      // ... existing bleep logic
    }
  }
});
```

**Same changes apply to `applyBleepsToVideo`** - identical pattern.

---

## 4. Data Model Changes

### Core Interface Changes

```typescript
// File: lib/utils/audioProcessor.ts
export interface BleepSegment {
  word: string;
  start: number;
  end: number;
  mode?: 'bleep' | 'silence'; // Optional: defaults to global mode
}
```

### State Management Changes

```typescript
// File: app/bleep/page.tsx
const [censorMode, setCensorMode] = useState<'bleep' | 'silence'>('bleep'); // Global default
```

---

## 5. Step-by-Step Implementation Tasks

### Phase 1: Basic Silence Mode (Global Only)

**Task 1.1: Update Data Models** (1-2 hours)

- [ ] Add `mode?: 'bleep' | 'silence'` to `BleepSegment` interface
- [ ] Update TypeScript types throughout codebase
- [ ] Add `defaultMode` parameter to `applyBleeps` and `applyBleepsToVideo`

**Task 1.2: Modify Audio Processing Logic** (3-4 hours)

- [ ] Implement conditional bleep sound loading
- [ ] Add silence mode gain automation in `applyBleeps`
- [ ] Add silence mode gain automation in `applyBleepsToVideo`
- [ ] Update console logging
- [ ] Test audio output for both modes

**Task 1.3: Update UI Components** (2-3 hours)

- [ ] Add `censorMode` state to `page.tsx`
- [ ] Create mode selector buttons in Step 5
- [ ] Conditionally render bleep-specific controls
- [ ] Show appropriate messaging for silence mode
- [ ] Update button text

**Task 1.4: Testing** (2-3 hours)

- [ ] Manual testing: silence mode with audio files
- [ ] Manual testing: silence mode with video files
- [ ] Manual testing: switching between modes
- [ ] Verify silence is complete (no audio bleed)
- [ ] Test edge cases (very short segments, overlapping segments)

### Phase 2: Per-Word Mode Override (Optional)

**Task 2.1: UI for Per-Word Control** (3-4 hours)

- [ ] Add mode dropdown/toggle to matched word chips
- [ ] Add visual indicators for mode
- [ ] Update state structure to track per-word modes

**Task 2.2: Processing Mixed Modes** (2 hours)

- [ ] Pass per-word modes through to `applyBleeps`
- [ ] Handle mixed-mode merging in `bleepMerger.ts`

### Phase 3: Unit Tests

**Task 3.1: Audio Processor Tests** (2-3 hours)

- [ ] Test `applyBleeps` with `defaultMode: 'silence'`
- [ ] Test mixed-mode segments
- [ ] Test that bleep sound is NOT loaded when mode is 'silence'
- [ ] Verify correct gain automation for silence mode

```typescript
// lib/utils/audioProcessor.test.ts
describe('silence mode', () => {
  it('should apply silence without loading bleep sound', async () => {
    const segments: BleepSegment[] = [{ word: 'bad', start: 1.0, end: 1.5, mode: 'silence' }];
    const result = await applyBleeps(mockFile, segments, 'bleep', 0.8, 0.1, 'silence');
    expect(result).toBeInstanceOf(Blob);
  });

  it('should handle mixed mode segments', async () => {
    const segments: BleepSegment[] = [
      { word: 'bad', start: 1.0, end: 1.5, mode: 'silence' },
      { word: 'worse', start: 2.0, end: 2.5, mode: 'bleep' },
    ];
    const result = await applyBleeps(mockFile, segments);
    expect(result).toBeInstanceOf(Blob);
  });
});
```

### Phase 4: E2E Tests

**Task 4.1: Playwright Tests** (3-4 hours)

```typescript
// tests/silence-mode.spec.ts
test('should apply silence to audio file', async ({ page }) => {
  await page.goto('/bleep');

  // Upload, transcribe, match words
  // ...

  // Select silence mode
  await page.click('text=🔇 Silence/Mute');

  // Verify bleep controls are hidden
  await expect(page.locator('text=Bleep Sound')).not.toBeVisible();

  // Apply censorship
  await page.click('text=Apply Censorship');

  // Verify output
  await expect(page.locator('text=Censored Result')).toBeVisible();
});
```

---

## 6. Testing Strategy

### Unit Testing

- `audioProcessor.ts` - silence mode logic
- `bleepMerger.ts` - mixed mode merging
- UI components - mode selector, conditional rendering

### Integration Testing

- Upload audio → select silence → verify complete muting
- Upload video → select silence → verify audio track is muted
- Switch modes before applying

### E2E Testing

- Silence-only workflow (audio)
- Silence-only workflow (video)
- Mode switching before applying

---

## 7. Edge Cases to Consider

### Timing Edge Cases

1. **Very Short Silence Segments (< 0.05s)**
   - Gain ramps may overlap
   - Solution: Existing GAIN_RAMP_BUFFER merging logic handles this

2. **Overlapping Segments with Different Modes**
   - Merge segments first, use first segment's mode or mark as 'mixed'
   - Mixed segments default to 'bleep' for safety

3. **Segments at File Boundaries**
   - Clamp ramps to valid time range
   - AudioContext handles gracefully

4. **Zero-Duration Segments**
   - Apply instantaneous gain change or enforce minimum duration

---

## 8. Implementation Timeline

**Total: 20-30 hours**

| Phase                      | Duration             |
| -------------------------- | -------------------- |
| Phase 1: Basic Silence     | 12-16 hours          |
| Phase 2: Per-Word Override | 6-8 hours (optional) |
| Phase 3: Unit Tests        | 5-6 hours            |
| Phase 4: E2E Tests         | 3-4 hours            |

**Recommended:**

- Week 1: Core implementation (Phase 1)
- Week 2: Testing & enhancements (Phases 3-4)
- Optional Week 3: Per-word control (Phase 2)

---

## 9. Success Criteria

### Functional Requirements

- ✅ User can select "Silence" mode and apply complete muting
- ✅ User can select "Bleep" mode and apply existing behavior
- ✅ Silence mode works for both audio and video files
- ✅ No audio bleed during silenced segments
- ✅ Clean transitions (no clicks/pops)

### Non-Functional Requirements

- ✅ Processing time for silence ≤ bleep mode (faster, no bleep sound loading)
- ✅ UI is intuitive
- ✅ All existing tests pass
- ✅ New tests achieve >80% coverage

---

## 10. Future Enhancements

1. **Partial Muting**: Slider for "Silence Volume" (0-20%)
2. **Fade Patterns**: Different transition styles
3. **Visual Indicators**: Waveform showing silenced regions
4. **Preset Profiles**: "TV Broadcast" (silence), "YouTube" (bleep)
5. **Keyboard Shortcuts**: 'B' for bleep, 'M' for mute
6. **Undo/Redo**: Revert mode changes before applying
