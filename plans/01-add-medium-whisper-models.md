# Implementation Plan: Adding Whisper-Medium Models

**Effort:** 30 minutes - 2 weeks
**Impact:** 10-20% accuracy improvement
**Priority:** 🔥 High (Quick Win)

---

## Overview

Add whisper-medium models to provide users with the best accuracy option for desktop devices. Medium models (~800 MB) offer excellent transcription quality at the cost of slower processing and larger downloads.

## Technical Specifications

### Model Details

- **Models:** `Xenova/whisper-medium.en` (English), `Xenova/whisper-medium` (Multilingual)
- **Size:** ~750-800 MB total (encoder + decoder ONNX models)
- **Parameters:** 769 million (vs. Small: 244M, Base: 74M, Tiny: 39M)
- **Processing Speed:** 1-2x realtime (1 min audio = 30-60s processing)
- **Memory Requirements:** 2-3 GB available browser memory

### Browser Compatibility

- Chrome 90+, Edge 90+, Safari 16.4+, Firefox 100+
- Requires WebAssembly support
- Optional WebGPU acceleration (Chrome/Edge)

---

## Implementation Steps

### Step 1: Update UI - Model Selection Dropdowns

**File:** `app/bleep/page.tsx` (lines 671-676)

```tsx
<option value="Xenova/whisper-tiny.en">Tiny (English only, fastest)</option>
<option value="Xenova/whisper-base.en">Base (English only, fast)</option>
<option value="Xenova/whisper-small.en">Small (English only, balanced)</option>
<option value="Xenova/whisper-medium.en">Medium (English only, accurate, ~800 MB)</option>
<option value="Xenova/whisper-tiny">Tiny (Multilingual)</option>
<option value="Xenova/whisper-base">Base (Multilingual)</option>
<option value="Xenova/whisper-small">Small (Multilingual)</option>
<option value="Xenova/whisper-medium">Medium (Multilingual, accurate, ~800 MB)</option>
```

**File:** `app/sampler/page.tsx` (lines 26-33)

```tsx
const models = [
  { id: 'Xenova/whisper-tiny.en', name: 'Tiny (English)', size: '39 MB' },
  { id: 'Xenova/whisper-base.en', name: 'Base (English)', size: '74 MB' },
  { id: 'Xenova/whisper-small.en', name: 'Small (English)', size: '242 MB' },
  { id: 'Xenova/whisper-medium.en', name: 'Medium (English)', size: '~800 MB' },
  // ... multilingual variants
];
```

### Step 2: Add User Warnings

**File:** `app/bleep/page.tsx` (add after line 46)

```tsx
const [modelWarning, setModelWarning] = useState<string | null>(null);

// In model selection handler (around line 668):
onChange={e => {
  const selectedModel = e.target.value;
  setModel(selectedModel);

  if (selectedModel.includes('medium')) {
    setModelWarning(
      'Medium models are ~800 MB and may take 15-45 seconds to download on first use. ' +
      'They provide better accuracy but are 2-3x slower than Small models. ' +
      'Recommended for: desktop devices with good internet connection.'
    );
  } else {
    setModelWarning(null);
  }
}}
```

**Warning UI (add after line 679):**

```tsx
{
  modelWarning && (
    <div className="mt-3 rounded border-l-4 border-orange-400 bg-orange-50 p-3 text-sm">
      <div className="flex items-start">
        <span className="mr-2 text-orange-600">⚠️</span>
        <div className="text-orange-800">{modelWarning}</div>
      </div>
    </div>
  );
}
```

### Step 3: Optimize Worker Configuration

**File:** `app/workers/transcriptionWorker.ts` (lines 80-107)

```typescript
// Extend timeout for medium models
const isMediumModel = model && model.includes('medium');
const timeout = isMediumModel ? 90000 : 30000; // 90s vs 30s

const pipelineTimeout = setTimeout(() => {
  if (!pipelineLoaded) {
    throw new Error(`Model loading timed out after ${timeout / 1000} seconds`);
  }
}, timeout);

const transcriber = await pipeline(
  'automatic-speech-recognition',
  model || 'Xenova/whisper-tiny.en',
  {
    // Optimize for medium models (use quantization)
    dtype: isMediumModel ? { encoder_model: 'fp32', decoder_model_merged: 'q4' } : undefined,
    progress_callback: (progress: any) => {
      const normalizedProgress =
        progress.progress > 1 ? progress.progress / 100 : progress.progress;

      self.postMessage({
        progress: 20 + normalizedProgress * 30,
        status: isMediumModel
          ? `Loading medium model... ${Math.round(normalizedProgress * 100)}% (~800 MB)`
          : `Loading model...`,
      });
    },
  }
);
```

### Step 4: Add Connection Speed Detection

**File:** `app/bleep/page.tsx` (add useEffect around line 100)

```tsx
useEffect(() => {
  // Warn on slow connections
  const connection = (navigator as any).connection;
  if (connection && model.includes('medium')) {
    const effectiveType = connection.effectiveType; // '4g', '3g', '2g', 'slow-2g'

    if (['2g', 'slow-2g', '3g'].includes(effectiveType)) {
      setModelWarning(
        `Your connection speed is ${effectiveType}. ` +
          'Medium model download (~800 MB) may take several minutes. ' +
          'Consider using Small model instead.'
      );
    }
  }
}, [model]);
```

### Step 5: Update Documentation

**File:** `README.md`

```markdown
## Whisper Model Comparison

| Model      | Size        | Speed           | Accuracy      | Best For                   |
| ---------- | ----------- | --------------- | ------------- | -------------------------- |
| Tiny       | 39 MB       | Fastest (4-6x)  | Good          | Quick tests, mobile        |
| Base       | 74 MB       | Fast (3-4x)     | Better        | Mobile, low bandwidth      |
| Small      | 242 MB      | Balanced (2-3x) | Very Good     | Most users                 |
| **Medium** | **~800 MB** | **Slower (1x)** | **Excellent** | **Desktop, best accuracy** |

All models support English-only (.en) and multilingual variants.
```

**File:** `CLAUDE.md` (update tech stack section)

```markdown
- `@huggingface/transformers` - Whisper ONNX models for transcription
  - Supports tiny, base, small, and **medium** models
  - Medium models recommended for best accuracy on desktop devices
```

---

## Risk Mitigation

### 1. Memory Management

**Risk:** Browser crashes on low-memory devices

**Solution:** Add memory detection

```typescript
const estimatedMemory = (performance as any).memory?.jsHeapSizeLimit;
const hasEnoughMemory = !estimatedMemory || estimatedMemory > 2_000_000_000; // 2GB

if (!hasEnoughMemory && model.includes('medium')) {
  setErrorMessage('Your device may not have enough memory. Try Small model instead.');
}
```

### 2. Fallback Strategy

**Risk:** Medium model fails to load

**Solution:** Auto-fallback to small model

```typescript
// In worker error handling
if (model && model.includes('medium')) {
  self.postMessage({
    warning: 'Medium model failed. Falling back to Small model...',
  });

  const fallbackModel = model.replace('medium', 'small');
  const transcriber = await pipeline('automatic-speech-recognition', fallbackModel);
}
```

### 3. Download Progress

**Risk:** Users abandon long downloads

**Solution:** Clear progress indication

- Show download percentage during model load
- Allow cancellation
- Cache model after first download (IndexedDB)

---

## Testing Strategy

### Unit Tests

**File:** `tests/functional-test.spec.ts`

```typescript
test('should show warning when selecting medium model', async ({ page }) => {
  await page.goto('/bleep');

  const modelSelect = page.locator('select').filter({ hasText: /Model/i });
  await modelSelect.selectOption('Xenova/whisper-medium.en');

  await expect(page.locator('text=/~800 MB/i')).toBeVisible();
  await expect(page.locator('text=/15-45 seconds/i')).toBeVisible();
});
```

### E2E Tests

**File:** `tests/sampler.spec.ts`

```typescript
test.skip('should load and compare medium models', async ({ page }) => {
  // Skip by default due to large download
  await page.goto('/sampler');

  await page.locator('input[type="file"]').setInputFiles('tests/fixtures/test-audio.mp3');
  await page.locator('button:has-text("Compare All Models")').click();

  // Wait for medium model (longer timeout)
  await expect(page.locator('text=/Medium.*complete/i')).toBeVisible({
    timeout: 120000, // 2 minutes
  });
});
```

---

## Success Metrics

Track these metrics after deployment:

1. **Adoption Rate**: % of users selecting medium models (target: 20-30% on desktop)
2. **Load Success Rate**: % of successful medium model loads (target: >95%)
3. **Error Rate**: Out-of-memory or timeout errors (target: <5%)
4. **User Feedback**: Survey satisfaction with accuracy improvement

---

## Rollout Strategy

### Phase 1: Development & Local Testing (Week 1)

- [ ] Implement code changes
- [ ] Test locally with all medium models
- [ ] Verify memory usage stays under 3GB
- [ ] Run linting and type checks

### Phase 2: Staging Deployment (Week 1)

- [ ] Deploy to staging environment
- [ ] Add "BETA" badge next to medium models
- [ ] Test on various devices (desktop, high-end mobile)
- [ ] Monitor error logs

### Phase 3: Production Release (Week 2)

- [ ] Remove BETA badge if error rate <5%
- [ ] Deploy to production
- [ ] Monitor analytics for adoption and errors
- [ ] Gather user feedback

### Phase 4: Optimization (Ongoing)

- [ ] Tune quantization settings (q4 vs q8) based on accuracy/speed feedback
- [ ] Consider WebGPU acceleration for compatible browsers
- [ ] Add model recommendation based on device detection

---

## Expected Outcomes

**Accuracy Improvement:**

- 10-20% lower Word Error Rate (WER) vs. small models
- Better handling of accents, background noise, multiple speakers

**User Experience:**

- Clear warnings prevent surprises
- Graceful fallback on errors
- Download progress keeps users informed

**Adoption:**

- Power users and content creators will prefer medium models
- Casual users will stick with small/base models (as intended)

---

## Alternative: Wait for Large-v3 Support

**Note:** Whisper large-v3 models don't currently have word-level timestamp support in Transformers.js. Medium models are the best option until:

1. Community calculates alignment_heads for large-v3
2. Xenova/Transformers.js adds official support
3. Browser memory limits increase (unlikely)

**Recommendation:** Ship medium models now, monitor for large-v3 availability later.

---

## Estimated Timeline

- **Quick implementation:** 30 minutes (just add dropdown options, no warnings)
- **Full implementation:** 1-2 days (with warnings, tests, documentation)
- **Testing & deployment:** 3-5 days (staging, production, monitoring)

**Total:** 1-2 weeks for complete, production-ready implementation
