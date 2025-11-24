# Plan 08: E2E Test Suite Implementation

**Status**: In Progress
**Created**: 2025-11-24
**Author**: Claude Code

## Overview

Implement a comprehensive Playwright E2E test suite covering all critical user workflows in the Bleep That Sh*t! application. Tests will run locally only (not in CI) and use real transcription with the Tiny Whisper model for maximum speed.

## Goals

1. **Complete workflow coverage**: Test all major user journeys end-to-end
2. **Performance optimized**: Transcribe once with Tiny model, reuse transcripts across tests
3. **Realistic test data**: Use Bob Ross demo video (first 15 seconds) as test fixtures
4. **Headless by default**: All tests run headless unless explicitly requested
5. **Target duration**: 10-12 minutes for full test suite

## Strategy

### Transcription Optimization

Instead of transcribing in every test (slow), we:
1. Generate transcript fixtures once from Bob Ross sample
2. Load pre-generated transcripts in tests that need them
3. Dedicated transcription tests verify the actual transcription works
4. All other tests focus on their specific features (matching, bleeping, etc.)

### Test Fixtures

- **bob-ross-15s.mp4** - First 15 seconds of Bob Ross demo video
- **bob-ross-15s.mp3** - Audio extracted from above
- **bob-ross-15s-video.transcript.json** - Pre-generated transcript for video
- **bob-ross-15s-audio.transcript.json** - Pre-generated transcript for audio

### Model Selection

- **Tiny model only** (~50MB, 5-10 second transcription)
- Fastest model available
- Sufficient accuracy for test purposes
- Both English and Multilingual variants tested

## Implementation Plan

### Phase 1: Test Infrastructure & Fixtures

#### 1.1 Create Test Fixtures Directory Structure

```
tests/
├── fixtures/
│   ├── files/
│   │   ├── bob-ross-15s.mp4
│   │   └── bob-ross-15s.mp3
│   └── transcripts/
│       ├── bob-ross-15s-video.transcript.json
│       └── bob-ross-15s-audio.transcript.json
└── setup/
    └── generate-test-fixtures.ts
```

#### 1.2 Setup Script (`tests/setup/generate-test-fixtures.ts`)

**Purpose**: One-time generation of test fixtures

**Functionality**:
- Extract first 15 seconds from Bob Ross video → save as `bob-ross-15s.mp4`
- Extract audio track from video → save as `bob-ross-15s.mp3`
- Transcribe both files using Tiny model
- Save transcript JSON files
- Run once locally, commit all fixtures to repo

**Usage**: `npm run test:setup:fixtures`

#### 1.3 Transcript Loader Helper (`tests/helpers/transcriptLoader.ts`)

**Purpose**: Inject pre-generated transcripts into app state

**Key Function**:
```typescript
async function loadTranscript(page: Page, transcriptFile: string): Promise<void>
```

**Behavior**:
- Loads transcript JSON from fixtures
- Injects into app state (bypasses actual transcription)
- Sets state as if transcription completed successfully
- Unlocks Review/Bleep tabs immediately
- Dramatically speeds up tests that don't need to test transcription itself

### Phase 2: E2E Test Files (15 files, ~55-65 tests)

#### Group A: Transcription Tests (2 files, ~20-30 seconds)

**Purpose**: Verify transcription works with Tiny model

**Files**:
1. `tests/e2e/transcription-audio.spec.ts`
   - Upload bob-ross-15s.mp3
   - Transcribe with Tiny English model
   - Verify transcript structure (words, timestamps, sentences)
   - ~1 test, ~10 seconds

2. `tests/e2e/transcription-video.spec.ts`
   - Upload bob-ross-15s.mp4
   - Transcribe with Tiny English model
   - Verify transcript structure
   - ~1 test, ~10 seconds

#### Group B: Complete Workflows (6 files, ~6-8 minutes)

**Purpose**: End-to-end user journeys using pre-loaded transcripts

**Files**:

1. `tests/e2e/audio-bleep-workflow.spec.ts` (~2 minutes)
   - Upload bob-ross-15s.mp3
   - Load pre-generated transcript
   - Enter words to match
   - Match words (exact mode)
   - Select bleep sound
   - Apply bleeps
   - Verify download available
   - Test with different bleep sounds (Classic, Brown Noise, Dolphin, T-Rex)
   - Test with different volume settings
   - ~3-4 tests

2. `tests/e2e/video-bleep-workflow.spec.ts` (~3 minutes)
   - Upload bob-ross-15s.mp4
   - Load pre-generated transcript
   - Match words
   - Apply bleeps to video
   - Verify video remuxing
   - Verify download available
   - ~3-4 tests (video processing takes longer)

3. `tests/e2e/wordset-workflow.spec.ts` (~2 minutes)
   - Load pre-generated transcript
   - Create new wordset with multiple words
   - Apply wordset to matching
   - Verify matched words from wordset
   - Apply bleeps
   - Test wordset import/export with complete bleeping workflow
   - ~4-5 tests

4. `tests/e2e/sample-quickstart.spec.ts` (~1 minute)
   - Click "Bob Ross Video" button on homepage
   - Verify auto-load of sample
   - Complete workflow from pre-loaded state
   - Test query parameter loading (`/bleep?sample=bob-ross`)
   - ~2-3 tests

5. `tests/e2e/pattern-matching.spec.ts` (~1 minute)
   - Load pre-generated transcript
   - Test exact matching mode
   - Test partial matching mode
   - Test fuzzy matching mode with different distance values (1-3)
   - Verify matched word counts
   - Verify word highlighting in transcript
   - ~5-6 tests

6. `tests/e2e/transcript-interaction.spec.ts` (~1 minute)
   - Load pre-generated transcript
   - Search transcript by keyword
   - Click individual words to toggle selection
   - Test expand/collapse sections
   - Clear all selected words
   - Verify stats display (censored words / total words)
   - ~4-5 tests

#### Group C: Feature Tests (4 files, ~4-5 minutes)

**Purpose**: UI features and configurations

**Files**:

1. `tests/e2e/bleep-customization.spec.ts` (~1 minute)
   - Load transcript and match words
   - Test all bleep sounds:
     - Classic Bleep
     - Brown Noise
     - Dolphin Sounds
     - T-Rex Roar
   - Test bleep volume slider (0-150%)
   - Test original word volume reduction (0-100%)
   - Test bleep buffer adjustment (0-0.5s)
   - Test re-apply with new settings
   - Verify settings change notification
   - ~6-7 tests

2. `tests/e2e/tab-transitions.spec.ts` (~30 seconds)
   - Verify tabs locked initially (Setup unlocked, Review/Bleep locked)
   - Upload file
   - Verify tabs still locked (no transcript yet)
   - Load transcript
   - Verify Review and Bleep tabs unlock
   - Navigate between tabs
   - Verify data persists across tab changes
   - Test tab lock icons display correctly
   - ~4-5 tests

3. `tests/e2e/wordlist-management.spec.ts` (~2 minutes)
   **CRUD Operations for Word Lists**:
   - **Create**:
     - Create new word list with name, description, multiple words
     - Verify word list appears in list
   - **Edit**:
     - Edit existing word list name
     - Add words to list
     - Remove words from list
     - Update description
   - **Delete**:
     - Click delete button
     - Verify confirmation dialog
     - Cancel deletion
     - Confirm deletion
     - Verify word list removed
   - **Duplicate**:
     - Duplicate existing word list
     - Verify copy created with "(copy)" suffix
   - **Search/Filter**:
     - Search word lists by name
     - Verify filtered results
     - Clear search
   - **Import/Export**:
     - Export word lists to CSV
     - Import word lists from CSV
     - Verify data integrity through round-trip
   - **Persistence**:
     - Create word list
     - Reload page
     - Verify word list persists
   - **Validation**:
     - Attempt to create word list with duplicate name (should fail)
     - Attempt to save empty word list (should fail)
   - ~10-12 tests

4. `tests/e2e/multi-file-sequence.spec.ts` (~1 minute)
   - Upload file 1
   - Load transcript
   - Complete workflow
   - Upload file 2 (different file)
   - Verify state cleaned up (no old transcript data)
   - Verify tabs locked again (waiting for new transcript)
   - ~2-3 tests

#### Group D: Error & Validation (3 files, ~3 minutes)

**Purpose**: Error handling and edge cases

**Files**:

1. `tests/e2e/file-validation.spec.ts` (~1 minute)
   - **Invalid file types**:
     - Upload .txt file → verify rejection
     - Upload .pdf file → verify rejection
   - **Duration warnings**:
     - Test duration warning display for long files
   - **Supported formats**:
     - Test MP3 upload
     - Test WAV upload (if supported)
     - Test M4A upload (if supported)
     - Test MP4 upload
     - Test MOV upload (if supported)
     - Test AVI upload (if supported)
   - ~5-6 tests

2. `tests/e2e/transcription-errors.spec.ts` (~1 minute)
   - **Model load failures**:
     - Simulate network error during model download (may need mocking)
     - Verify error message displayed
     - Verify Discord help link shown
   - **Invalid audio handling**:
     - Upload corrupted audio file
     - Verify error handling
   - **Timeout scenarios**:
     - Simulate transcription timeout
     - Verify error handling
   - ~3-4 tests

3. `tests/e2e/bleep-validation.spec.ts` (~1 minute)
   - **No matched words**:
     - Load transcript
     - Don't match any words
     - Try to apply bleeps
     - Verify warning message
     - Verify Apply Bleeps button disabled
   - **Empty wordsets** (validation):
     - Try to create wordset with no words
     - Verify prevention/error message
   - **Duplicate wordset names**:
     - Create wordset
     - Try to create another with same name
     - Verify prevention/error message
   - **Re-bleep scenarios**:
     - Apply bleeps
     - Change settings
     - Verify re-apply button shows
     - Re-apply with new settings
   - ~4-5 tests

### Phase 3: Configuration & Integration

#### 3.1 Playwright Configuration Update

**File**: `playwright.config.ts`

**Changes**:
```typescript
// Add E2E test project
export default defineConfig({
  // ... existing config
  projects: [
    // ... existing projects (smoke, etc.)
    {
      name: 'e2e',
      testDir: './tests/e2e',
      timeout: 90000, // 90 seconds per test
      use: {
        baseURL: 'http://localhost:3000',
        headless: true, // headless by default
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
```

#### 3.2 Package.json Scripts

**Add new npm scripts**:
```json
{
  "scripts": {
    "test:e2e": "playwright test --project=e2e",
    "test:e2e:ui": "playwright test --project=e2e --ui",
    "test:e2e:headed": "playwright test --project=e2e --headed",
    "test:e2e:debug": "playwright test --project=e2e --debug",
    "test:setup:fixtures": "tsx tests/setup/generate-test-fixtures.ts"
  }
}
```

#### 3.3 Enhanced Page Objects

**Updates to `tests/helpers/pages/BleepPage.ts`**:
- Add `loadTranscript(transcriptFile)` method
- Add `waitForBleepComplete()` helper
- Add `downloadCensoredAudio()` and `downloadCensoredVideo()` helpers
- Add assertion helpers for verifying audio/video processing results

**Updates to `tests/helpers/pages/WordsetPage.ts`**:
- Already has comprehensive CRUD methods
- May need enhancements based on test requirements

#### 3.4 Plan Documentation

- **File**: `plans/e2e-test-suite.md` (this document)
- Full implementation plan for reference
- Includes rationale, strategy, and detailed test descriptions

### Phase 4: Documentation

**Update `tests/README.md`**:
- Document E2E test strategy
- Explain transcription optimization approach
- Document fixture generation process
- Add usage examples
- Explain test organization (groups A-D)

## Test Execution Flow

### First-Time Setup

```bash
# 1. Start development server
npm run dev

# 2. Generate test fixtures (one-time, ~30-60 seconds)
npm run test:setup:fixtures

# 3. Commit fixtures to repo
git add tests/fixtures/
git commit -m "Add Bob Ross test fixtures and transcripts"
```

### Running Tests

```bash
# Run all E2E tests (headless, ~10-12 minutes)
npm run test:e2e

# Run with interactive UI
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug specific test
npm run test:e2e:debug -- tests/e2e/audio-bleep-workflow.spec.ts

# Run specific test group
npm run test:e2e -- tests/e2e/transcription-*.spec.ts

# Run all test types
npm run test:smoke    # Smoke tests (~1-2 minutes)
npm run test:e2e      # E2E tests (~10-12 minutes)
npm test              # Unit tests (~few seconds)
```

## Deliverables

### 1. Test Fixtures (4 files)
- ✅ `tests/fixtures/files/bob-ross-15s.mp4`
- ✅ `tests/fixtures/files/bob-ross-15s.mp3`
- ✅ `tests/fixtures/transcripts/bob-ross-15s-video.transcript.json`
- ✅ `tests/fixtures/transcripts/bob-ross-15s-audio.transcript.json`

### 2. Test Files (15 spec files, ~55-65 tests)

**Group A: Transcription** (2 files)
- ✅ `tests/e2e/transcription-audio.spec.ts`
- ✅ `tests/e2e/transcription-video.spec.ts`

**Group B: Workflows** (6 files)
- ✅ `tests/e2e/audio-bleep-workflow.spec.ts`
- ✅ `tests/e2e/video-bleep-workflow.spec.ts`
- ✅ `tests/e2e/wordset-workflow.spec.ts`
- ✅ `tests/e2e/sample-quickstart.spec.ts`
- ✅ `tests/e2e/pattern-matching.spec.ts`
- ✅ `tests/e2e/transcript-interaction.spec.ts`

**Group C: Features** (4 files)
- ✅ `tests/e2e/bleep-customization.spec.ts`
- ✅ `tests/e2e/tab-transitions.spec.ts`
- ✅ `tests/e2e/wordlist-management.spec.ts`
- ✅ `tests/e2e/multi-file-sequence.spec.ts`

**Group D: Validation** (3 files)
- ✅ `tests/e2e/file-validation.spec.ts`
- ✅ `tests/e2e/transcription-errors.spec.ts`
- ✅ `tests/e2e/bleep-validation.spec.ts`

### 3. Infrastructure (3 files)
- ✅ `tests/setup/generate-test-fixtures.ts` - Fixture generation script
- ✅ `tests/helpers/transcriptLoader.ts` - Transcript loader helper
- ✅ Enhanced page objects with new helper methods

### 4. Configuration (2 files)
- ✅ Updated `playwright.config.ts` - E2E project configuration (headless by default)
- ✅ Updated `package.json` - New test scripts

### 5. Documentation (2 files)
- ✅ `plans/08-e2e-test-suite.md` - This implementation plan
- ✅ Updated `tests/README.md` - Test strategy and usage documentation

## Time Estimates

| Test Group | Files | Tests | Duration |
|------------|-------|-------|----------|
| Transcription | 2 | 2 | ~20-30s |
| Workflows | 6 | 20-25 | ~6-8 min |
| Features | 4 | 20-25 | ~4-5 min |
| Validation | 3 | 12-15 | ~3 min |
| **Total** | **15** | **~55-65** | **~10-12 min** |

## Benefits

### Performance
- ✅ **Fast**: Transcribe 2x with Tiny model (~20s), reuse in 55+ tests
- ✅ **Optimized**: Only 2 tests run actual transcription, rest use pre-loaded data
- ✅ **Headless**: All tests run headless by default for maximum speed

### Quality
- ✅ **Realistic**: Uses actual Bob Ross content from the app
- ✅ **Comprehensive**: Covers all critical user workflows
- ✅ **Reliable**: Pre-generated fixtures = consistent test results

### Maintainability
- ✅ **Simple**: No complex mocking, just load real transcript data
- ✅ **Clear**: Well-organized test groups by purpose
- ✅ **Documented**: Detailed plan and README documentation

### Developer Experience
- ✅ **Fast feedback**: 10-12 minute full suite run time
- ✅ **Flexible**: Can run individual test groups or files
- ✅ **Debuggable**: UI mode and headed mode available

## Success Criteria

- [ ] All 15 test files implemented and passing
- [ ] Test fixtures generated and committed to repo
- [ ] Full test suite runs in under 15 minutes
- [ ] All tests run headless by default
- [ ] Tests provide clear failure messages
- [ ] Documentation complete and accurate
- [ ] No flaky tests (consistent pass/fail results)

## Future Enhancements

### Potential Future Improvements (Not in Scope)
- Add tests for additional models (Base, Small) if needed
- Add browser compatibility tests (Firefox, Safari)
- Add accessibility testing (keyboard navigation, ARIA)
- Add performance testing (memory usage, large files)
- Add visual regression testing (screenshot comparisons)
- Add network error simulation tests
- Add concurrent operation tests (multiple tabs)

## Notes

- Tests are designed for local execution only (not CI)
- Tiny model is sufficient for test purposes (speed > accuracy)
- Pre-generated transcripts dramatically speed up test suite
- Bob Ross sample is a real-world example already in the app
- Tests run headless by default to maximize speed
- Headed mode available for debugging with `--headed` flag
