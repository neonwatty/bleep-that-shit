# GA Funnel Events Implementation Plan

## Overview

This plan details the instrumentation of Google Analytics 4 (GA4) funnel events for the Bleep That Sh*t application. The application is a Next.js client-side media censorship tool with the following user flow:

```
Home Page -> Bleep Page -> Upload -> Transcribe -> Review/Match -> Bleep -> Download
```

### Current State

The application already has analytics infrastructure:
- **Analytics module**: `lib/analytics.ts` provides `trackEvent` and `createDebouncedTracker` functions
- **GA Component**: `components/GoogleAnalytics.tsx` initializes GA4
- **Existing events**: 30+ events already tracked across the application

### Goals

1. Create a comprehensive funnel to measure conversion at each step
2. Identify drop-off points in the user journey
3. Track key engagement metrics to inform product decisions
4. Enable cohort analysis based on user behavior patterns

## Event Taxonomy

### Naming Convention

All events follow the pattern: `{category}_{action}_{detail?}`

Categories:
- `funnel_` - Core funnel progression events
- `page_` - Page-level interactions
- `file_` - File-related actions
- `transcription_` - Transcription workflow
- `word_` / `words_` - Word selection actions
- `bleep_` - Bleep configuration and processing
- `download_` - File download actions

## Complete Event List by Funnel Stage

### Stage 0: Entry Points

| Event Name | Description | Parameters | File Location |
|------------|-------------|------------|---------------|
| `funnel_home_viewed` | User lands on home page | `{ entry_source }` | `app/page.tsx` |
| `funnel_home_cta_clicked` | User clicks main CTA | `{ cta_type: 'primary' \| 'sample' \| 'sampler' }` | `app/page.tsx` |
| `funnel_bleep_page_viewed` | User arrives at bleep page | `{ has_sample_param, referrer_type }` | `app/bleep/page.tsx` |

### Stage 1: Upload

| Event Name | Description | Parameters | Status |
|------------|-------------|------------|--------|
| `file_upload` | File successfully uploaded | `{ file_type, file_size_mb, duration_seconds, is_long_file }` | **EXISTS** |
| `funnel_upload_attempted` | User attempted to upload | `{ success, error_type? }` | NEW |
| `funnel_upload_rejected` | Upload rejected (wrong type) | `{ attempted_type }` | NEW |

### Stage 2: Configuration

| Event Name | Description | Parameters | Status |
|------------|-------------|------------|--------|
| `language_changed` | Language selection changed | `{ language_code }` | **EXISTS** |
| `model_changed` | Model selection changed | `{ model_id }` | **EXISTS** |
| `funnel_config_completed` | User has file + settings ready | `{ file_type, model_id, language_code }` | NEW |

### Stage 3: Transcription

| Event Name | Description | Parameters | Status |
|------------|-------------|------------|--------|
| `transcription_started` | Transcription began | `{ file_type, model_id, language_code }` | **EXISTS** |
| `funnel_transcription_progress` | Progress updates | `{ progress_percent, elapsed_seconds }` | NEW |
| `transcription_completed` | Transcription finished | `{ word_count, has_timestamp_issues }` | **EXISTS** |
| `transcription_error` | Transcription failed | `{ error_message }` | **EXISTS** |
| `funnel_transcription_abandoned` | User navigated away | `{ progress_at_abandon, elapsed_seconds }` | NEW |

### Stage 4: Word Selection

| Event Name | Description | Parameters | Status |
|------------|-------------|------------|--------|
| `tab_changed` | User navigated to a tab | `{ tab_id }` | **EXISTS** |
| `funnel_review_tab_entered` | User enters Review tab | `{ word_count, time_since_transcription_ms }` | NEW |
| `words_matched` | Pattern matching executed | `{ word_count_searched, matches_found }` | **EXISTS** |
| `word_toggled` | Individual word toggled | `{ action, total_selected }` | **EXISTS** |
| `funnel_words_selected` | User has 1+ words selected | `{ word_count, selection_method }` | NEW |

### Stage 5: Bleep Configuration

| Event Name | Description | Parameters | Status |
|------------|-------------|------------|--------|
| `funnel_bleep_tab_entered` | User enters Bleep tab | `{ word_count, has_manual_censors }` | NEW |
| `bleep_sound_changed` | Sound selection changed | `{ sound_type }` | **EXISTS** |
| `bleep_volume_changed` | Volume slider adjusted | `{ volume_percent }` | **EXISTS** |
| `bleep_preview_played` | User previewed bleep | `{ sound_type, volume_percent }` | **EXISTS** |

### Stage 6: Processing & Download

| Event Name | Description | Parameters | Status |
|------------|-------------|------------|--------|
| `funnel_bleep_initiated` | User clicked Apply Bleeps | `{ word_count, file_type, is_reapply }` | NEW |
| `bleep_processing_completed` | Processing finished | `{ words_count, file_type, bleep_sound }` | **EXISTS** |
| `funnel_bleep_failed` | Processing failed | `{ error_message, word_count, file_type }` | NEW |
| `download_censored_file` | User downloaded file | `{ file_type, file_format }` | **EXISTS** |
| `funnel_conversion_complete` | Full funnel completed | `{ total_session_time_seconds, file_type, word_count }` | NEW |

## Implementation Steps

### Step 1: Add Page View Events

**File: `app/page.tsx`**

```typescript
'use client';
import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

// Inside Home component:
useEffect(() => {
  trackEvent('funnel_home_viewed', {
    entry_source: document.referrer ? 'referral' : 'direct'
  });
}, []);

// Update CTA links:
<Link
  href="/bleep"
  onClick={() => trackEvent('funnel_home_cta_clicked', { cta_type: 'primary' })}
>
  Bleep Your Sh*t!
</Link>
```

### Step 2: Add Bleep Page Entry Event

**File: `app/bleep/page.tsx`**

```typescript
useEffect(() => {
  trackEvent('funnel_bleep_page_viewed', {
    has_sample_param: searchParams.get('sample') !== null,
    referrer_type: document.referrer.includes(window.location.host) ? 'internal' : 'external'
  });
}, [searchParams]);
```

### Step 3: Add Upload Failure Tracking

**File: `app/bleep/hooks/useBleepState.ts`**

```typescript
const handleFileUpload = async (uploadedFile: File) => {
  if (uploadedFile && (uploadedFile.type.includes('audio') || uploadedFile.type.includes('video'))) {
    // ... existing success logic ...
    trackEvent('funnel_upload_attempted', { success: true });
  } else {
    setShowFileWarning(true);
    trackEvent('funnel_upload_attempted', { success: false });
    trackEvent('funnel_upload_rejected', {
      attempted_type: uploadedFile?.type || 'unknown'
    });
  }
};
```

### Step 4: Add Funnel Milestone Events

**File: `app/bleep/hooks/useBleepState.ts`**

```typescript
// After transcription completes:
trackEvent('funnel_transcription_milestone', {
  word_count: result.chunks?.length || 0,
  model_id: model,
  file_type: file.type.includes('video') ? 'video' : 'audio'
});

// After words are selected:
useEffect(() => {
  if (matchedWords.length > 0) {
    trackEvent('funnel_words_selected', {
      word_count: matchedWords.length,
      selection_method: determineSelectionMethod()
    });
  }
}, [matchedWords.length]);
```

### Step 5: Add Bleep Processing Events

**File: `app/bleep/hooks/useBleepState.ts`**

```typescript
const handleBleep = async () => {
  // Track bleep initiation
  trackEvent('funnel_bleep_initiated', {
    word_count: matchedWords.length,
    file_type: file.type.includes('video') ? 'video' : 'audio',
    is_reapply: hasBleeped
  });

  try {
    // ... existing processing logic ...

    trackEvent('funnel_conversion_complete', {
      file_type: file.type.includes('video') ? 'video' : 'audio',
      word_count: matchedWords.length,
      bleep_sound: bleepSound
    });
  } catch (error) {
    trackEvent('funnel_bleep_failed', {
      error_message: (error instanceof Error ? error.message : 'Unknown error').slice(0, 100),
      word_count: matchedWords.length,
      file_type: file.type.includes('video') ? 'video' : 'audio'
    });
  }
};
```

### Step 6: Add Session Abandonment Tracking

**File: `app/bleep/hooks/useBleepState.ts`**

```typescript
useEffect(() => {
  const handleBeforeUnload = () => {
    if (isTranscribing) {
      trackEvent('funnel_transcription_abandoned', {
        progress_at_abandon: progress,
        elapsed_seconds: Math.floor((Date.now() - transcriptionStartTime) / 1000)
      });
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [isTranscribing, progress]);
```

## GA4 Custom Dimensions Configuration

### Event-Scoped Dimensions

| Dimension Name | Parameter | Description |
|----------------|-----------|-------------|
| File Type | `file_type` | `audio` or `video` |
| File Duration | `duration_seconds` | Length of media file |
| Model Used | `model_id` | Whisper model identifier |
| Language | `language_code` | Selected language |
| Word Count | `word_count` | Number of words |
| Bleep Sound | `bleep_sound` | Selected bleep sound type |
| Selection Method | `selection_method` | How words were selected |

## Funnel Analysis Dashboard

### Primary Conversion Funnel Report

Create an Exploration in GA4 with these steps:

1. **Page View**: `funnel_home_viewed` OR `funnel_bleep_page_viewed`
2. **File Upload**: `file_upload`
3. **Transcription Complete**: `transcription_completed`
4. **Words Selected**: `funnel_words_selected`
5. **Bleep Initiated**: `funnel_bleep_initiated`
6. **Download**: `download_censored_file`

### Key Metrics to Monitor

| Metric | Calculation | Target |
|--------|-------------|--------|
| Upload-to-Transcribe Rate | `transcription_started / file_upload` | >80% |
| Transcription Success Rate | `transcription_completed / transcription_started` | >95% |
| Transcribe-to-Select Rate | `funnel_words_selected / transcription_completed` | >70% |
| Select-to-Bleep Rate | `funnel_bleep_initiated / funnel_words_selected` | >80% |
| Bleep Success Rate | `bleep_processing_completed / funnel_bleep_initiated` | >98% |
| Download Rate | `download_censored_file / bleep_processing_completed` | >90% |
| **Overall Conversion** | `download_censored_file / file_upload` | >50% |

### Drop-off Analysis

1. **Upload Drop-offs**: Filter by `funnel_upload_rejected`, group by `attempted_type`
2. **Transcription Drop-offs**: Filter by `transcription_error`, group by `error_message`, `model_id`
3. **Selection Drop-offs**: Users with `transcription_completed` but no `funnel_words_selected`
4. **Bleep Drop-offs**: Filter by `funnel_bleep_failed`, group by `file_type`, `word_count`

## Enhanced Analytics Module

**File: `lib/analytics.ts`**

```typescript
// NEW: Track funnel milestone with timing
export function trackFunnelMilestone(
  milestone: string,
  params?: EventParams
): void {
  const timing = performance.now();
  trackEvent(`funnel_${milestone}`, {
    ...params,
    session_time_ms: Math.round(timing)
  });
}

// NEW: Track timed operation
export function createTimedTracker(eventName: string): {
  start: () => void;
  complete: (params?: EventParams) => void;
  fail: (errorMessage: string, params?: EventParams) => void;
} {
  let startTime: number;

  return {
    start: () => {
      startTime = Date.now();
      trackEvent(`${eventName}_started`);
    },
    complete: (params?: EventParams) => {
      const duration = Date.now() - startTime;
      trackEvent(`${eventName}_completed`, {
        ...params,
        duration_ms: duration
      });
    },
    fail: (errorMessage: string, params?: EventParams) => {
      const duration = Date.now() - startTime;
      trackEvent(`${eventName}_failed`, {
        ...params,
        duration_ms: duration,
        error_message: errorMessage.slice(0, 100)
      });
    }
  };
}
```

## Testing

### GA4 Debug Mode

1. Install GA Debugger Chrome extension
2. Enable debug mode in GA4 DebugView
3. Test each funnel step sequentially

### Event Verification Checklist

- [ ] `funnel_home_viewed` fires on home page load
- [ ] `funnel_home_cta_clicked` fires with correct `cta_type`
- [ ] `funnel_bleep_page_viewed` fires on bleep page
- [ ] `file_upload` includes all parameters
- [ ] `transcription_started` fires before processing
- [ ] `transcription_completed` includes word count
- [ ] `funnel_words_selected` fires when words > 0
- [ ] `funnel_bleep_initiated` fires on button click
- [ ] `download_censored_file` fires on download click
- [ ] `funnel_conversion_complete` fires after successful download

## Priority Implementation Order

1. **P0 (Critical)**: Funnel milestone events (`funnel_*`)
2. **P1 (High)**: Error tracking and abandonment events
3. **P2 (Medium)**: Progress tracking and timing data
4. **P3 (Low)**: Enhanced metadata and user properties

## Critical Files

- `lib/analytics.ts` - Core analytics module to enhance
- `app/bleep/hooks/useBleepState.ts` - Primary state management (most events go here)
- `app/page.tsx` - Home page entry point
- `app/bleep/page.tsx` - Bleep page entry
- `app/bleep/components/BleepDownloadTab.tsx` - Final conversion events
