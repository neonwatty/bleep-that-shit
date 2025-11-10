# Implementation Plan: iOS Mobile App with iMessage Integration

**Effort:** 5-7 months (full-featured app with share extension)
**Impact:** Medium - New platform, new user base
**Priority:** 💡 Consider After Desktop Success

---

## Executive Summary

Build a native iOS app for on-device audio/video profanity censorship with iMessage share extension integration. The app leverages WhisperKit (Core ML) for speech recognition and AVFoundation for media processing, ensuring complete privacy through local processing.

**Critical Constraint:** Share extensions cannot directly integrate into the native iMessage attachment picker. Users must record/select media first, then share to the app via the share sheet (two-step process).

---

## Key Findings from Research

### WhisperKit - Production-Ready Solution

- All Whisper models available in Core ML format (tiny, base, small, medium, large)
- Word-level timestamps supported
- 75% energy reduction (0.3W vs 1.5W)
- Processing speeds: tiny ~2s/min, base ~4-6s/min, small ~8-12s/min

### iMessage Integration Limitations

- **Cannot intercept native media attachments** before sending
- Share extensions have 120MB memory limit (practical: 50-100MB)
- Two-step workflow required: Share to app → Share to iMessage

### Competitive Landscape

- "Beep - Censor videos easily" already exists ($2.99+)
- Market validation: Similar apps approved by App Store
- Differentiation: Privacy focus, better UX, WhisperKit accuracy

---

## Architecture Overview

### Application Structure

```
BleepThatShit/
├── Core/
│   ├── Services/
│   │   ├── WhisperService.swift          # WhisperKit integration
│   │   ├── AudioProcessingService.swift   # AVFoundation audio
│   │   ├── VideoProcessingService.swift   # AVFoundation video
│   │   └── ModelManager.swift             # Whisper model downloads
│   └── Models/
│       ├── TranscriptionResult.swift
│       ├── BleepSegment.swift
│       └── Settings.swift
├── UI/
│   ├── Views/
│   │   ├── HomeView.swift
│   │   ├── ProcessingView.swift
│   │   ├── TranscriptEditorView.swift
│   │   └── SettingsView.swift
│   └── Components/
│       ├── WaveformView.swift
│       └── ProgressView.swift
├── ShareExtension/
│   ├── ShareViewController.swift
│   └── CompactProcessingView.swift
└── Resources/
    └── BleepSounds/
```

### Technology Stack

| Component             | Technology                          | Rationale                              |
| --------------------- | ----------------------------------- | -------------------------------------- |
| Speech Recognition    | WhisperKit (Core ML)                | On-device, optimized, word timestamps  |
| Audio Processing      | AVFoundation + Accelerate           | Native, hardware-accelerated           |
| Video Processing      | AVFoundation (AVMutableComposition) | No external dependencies               |
| UI Framework          | SwiftUI                             | Modern, declarative, iOS 17+ optimized |
| Storage               | Core Data + UserDefaults            | Lightweight, iCloud sync               |
| Background Processing | OperationQueue                      | Cancellable, progress reporting        |

---

## Development Phases

### Phase 1: MVP Main App (Months 1-3)

#### Sprint 1 (Weeks 1-2): Project Setup

- [ ] Xcode project with SwiftUI + Core Data
- [ ] App Group configuration for share extension
- [ ] Core Data schema (processed files metadata)
- [ ] Basic UI navigation (Home, Processing, Settings)
- [ ] App icon and branding

#### Sprint 2 (Weeks 3-4): WhisperKit Integration

- [ ] Add WhisperKit SPM dependency
- [ ] Implement ModelManager for download/storage
- [ ] Create WhisperService with progress callbacks
- [ ] Build ModelManagerView (download models UI)
- [ ] Unit tests for transcription

**Key Implementation:**

```swift
import WhisperKit

class WhisperService {
    private var whisperKit: WhisperKit?

    func transcribe(
        audioURL: URL,
        model: ModelManager.WhisperModel,
        progress: @escaping (Double) -> Void
    ) async throws -> TranscriptionResult {

        // Initialize WhisperKit
        whisperKit = try await WhisperKit(
            modelFolder: model.rawValue,
            computeOptions: .init(device: .auto)
        )

        // Transcribe with word-level timestamps
        let result = try await whisperKit?.transcribe(
            audioPath: audioURL.path,
            decodeOptions: .init(
                wordTimestamps: true,
                task: .transcribe
            )
        )

        return TranscriptionResult(
            text: result?.text ?? "",
            chunks: result?.segments.flatMap { segment in
                segment.tokens.map { token in
                    BleepSegment(
                        word: token.text,
                        start: token.start,
                        end: token.end
                    )
                }
            } ?? []
        )
    }
}
```

#### Sprint 3 (Weeks 5-6): Audio Processing

- [ ] Implement AudioProcessingService
- [ ] Audio extraction from video
- [ ] Bleep sound generation/loading
- [ ] Apply bleeps with gain automation (AVFoundation)
- [ ] WAV encoding utilities

**Key Implementation:**

```swift
class AudioProcessingService {
    func applyBleeps(
        to audioURL: URL,
        segments: [BleepSegment],
        bleepVolume: Float = 0.8,
        originalVolume: Float = 0.1
    ) async throws -> URL {

        let audioAsset = AVAsset(url: audioURL)
        let composition = AVMutableComposition()

        // Add audio track
        let audioTrack = composition.addMutableTrack(
            withMediaType: .audio,
            preferredTrackID: kCMPersistentTrackID_Invalid
        )

        guard let sourceTrack = try await audioAsset.loadTracks(withMediaType: .audio).first else {
            throw ProcessingError.noAudioTrack
        }

        try audioTrack?.insertTimeRange(
            CMTimeRange(start: .zero, duration: audioAsset.duration),
            of: sourceTrack,
            at: .zero
        )

        // Apply volume automation for bleeps
        let audioMix = AVMutableAudioMix()
        let audioMixParams = AVMutableAudioMixInputParameters(track: audioTrack)

        for segment in segments {
            let startTime = CMTime(seconds: segment.start, preferredTimescale: 600)
            let endTime = CMTime(seconds: segment.end, preferredTimescale: 600)

            // Duck original audio during bleep
            audioMixParams.setVolumeRamp(
                fromStartVolume: 1.0,
                toEndVolume: originalVolume,
                timeRange: CMTimeRange(start: startTime, duration: .zero)
            )
            audioMixParams.setVolumeRamp(
                fromStartVolume: originalVolume,
                toEndVolume: 1.0,
                timeRange: CMTimeRange(start: endTime, duration: .zero)
            )
        }

        audioMix.inputParameters = [audioMixParams]

        // Export
        let exportSession = AVAssetExportSession(
            asset: composition,
            presetName: AVAssetExportPresetAppleM4A
        )
        exportSession?.audioMix = audioMix
        exportSession?.outputURL = /* temp URL */
        exportSession?.outputFileType = .m4a

        await exportSession?.export()

        return exportSession?.outputURL ?? URL(fileURLWithPath: "")
    }
}
```

#### Sprint 4 (Weeks 7-8): Video Processing

- [ ] Implement VideoProcessingService
- [ ] Video audio extraction
- [ ] Remux censored audio with original video
- [ ] Progress reporting
- [ ] Memory management for large files

#### Sprint 5 (Weeks 9-10): UI Implementation

- [ ] HomeView with file picker (Photos, Camera, Files)
- [ ] ProcessingView with progress indicators
- [ ] TranscriptEditorView for word selection
- [ ] SettingsView (bleep sound, volume controls)
- [ ] Media preview player

#### Sprint 6 (Weeks 11-12): Testing & Polish

- [ ] Unit tests (80% coverage target)
- [ ] UI tests for core workflows
- [ ] Performance optimization
- [ ] Error handling and user feedback
- [ ] Memory leak detection

---

### Phase 2: Share Extension (Months 4-5)

#### Sprint 7 (Weeks 13-14): Share Extension Setup

- [ ] Add Share Extension target to project
- [ ] Configure App Group entitlements
- [ ] Implement ShareViewController
- [ ] File size detection (redirect large files to main app)
- [ ] Deep linking to main app

**Key Implementation:**

```swift
class ShareViewController: UIViewController {
    private let maxFileSize: Int64 = 50_000_000 // 50MB

    override func viewDidLoad() {
        super.viewDidLoad()
        extractMediaItem { [weak self] result in
            switch result {
            case .success(let mediaURL):
                let fileSize = try? FileManager.default
                    .attributesOfItem(atPath: mediaURL.path)[.size] as? Int64

                if let size = fileSize, size > self?.maxFileSize ?? 0 {
                    // Redirect to main app
                    self?.openMainApp(with: mediaURL)
                } else {
                    // Process in extension
                    self?.processMedia(url: mediaURL)
                }
            case .failure(let error):
                self?.showError(error)
            }
        }
    }

    private func openMainApp(with url: URL) {
        // Copy to shared container
        let sharedURL = SharedContainerManager.shared.saveMedia(url)

        // Deep link
        let deepLink = URL(string: "bleepthatshit://process?file=\(sharedURL.lastPathComponent)")!
        openURL(deepLink)

        extensionContext?.completeRequest(returningItems: nil)
    }
}
```

#### Sprint 8 (Weeks 15-16): Compact Processing UI

- [ ] Lightweight processing view for extension
- [ ] Quick settings (use last settings by default)
- [ ] Progress indicators
- [ ] Share back to iMessage flow
- [ ] Memory monitoring and limits

#### Sprint 9 (Weeks 17-18): Testing & Optimization

- [ ] Test with various file sizes and formats
- [ ] Memory profiling on device (not simulator!)
- [ ] Edge case handling (no audio, corrupted files)
- [ ] Integration testing with iMessage

---

### Phase 3: Advanced Features (Months 6-7)

#### Sprint 10 (Weeks 19-20): Enhanced Features

- [ ] Custom profanity word lists
- [ ] Fuzzy matching with Levenshtein distance
- [ ] Multi-language support
- [ ] Waveform visualization
- [ ] Timeline scrubbing

#### Sprint 11 (Weeks 21-22): Monetization

- [ ] In-app purchase setup (StoreKit 2)
- [ ] Freemium tier (2 files/day, tiny model only)
- [ ] Premium tier ($4.99/month or $29.99/year)
- [ ] Subscription management UI
- [ ] Restore purchases flow

**Pricing Model:**

```
FREE TIER:
• 2 processed files per day
• Tiny model only
• Max 2-minute duration
• "Made with Bleep That Sh*t" watermark

PREMIUM ($4.99/month or $29.99/year):
• Unlimited processing
• All AI models (tiny, base, small)
• No watermarks
• Custom bleep sounds
• Unlimited duration

ONE-TIME PURCHASE ($19.99):
• All Premium features
• Pay once, own forever
```

#### Sprint 12 (Weeks 23-24): App Store Prep

- [ ] App Store screenshots (6.7", 6.5", 5.5" displays)
- [ ] Preview video (15-30 seconds)
- [ ] Privacy policy and terms of service
- [ ] App Store description optimization
- [ ] TestFlight beta (50-100 testers)

#### Sprint 13 (Weeks 25-26): Launch

- [ ] App Store submission
- [ ] Marketing materials (landing page, press kit)
- [ ] Social media presence (Twitter, Instagram)
- [ ] ProductHunt launch
- [ ] Bug fixes based on initial feedback

---

## User Experience Design

### Main App Workflow

```
┌─────────────────────────────────────┐
│          ONBOARDING                 │
│  • Download model (one-time)        │
│  • Privacy explanation              │
│  • Quick tutorial                   │
└────────────────┬────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│          HOME SCREEN                │
│  [+] Import Media                   │
│  • Camera                           │
│  • Photo Library                    │
│  • Files                            │
│                                     │
│  Recent: video_001.mp4 (Today)      │
└────────────────┬────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│       TRANSCRIPTION                 │
│  [▶] Media Preview                  │
│                                     │
│  Model: Base (Balanced) ▼           │
│  [Start Transcription]              │
│                                     │
│  ░░░░░░░░░░░░ 65% (12s / 60s)      │
└────────────────┬────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│       TRANSCRIPT EDITOR             │
│  "Hey [shit], this is [fucking]     │
│   great [damn]!"                    │
│                                     │
│  Words to Censor: 3 detected ✓      │
│  [+ Add Custom Word]                │
│                                     │
│  Bleep Sound: Classic ▼             │
│  [🔊 Preview]                        │
│  [🚀 Bleep That Sh*t!]              │
└────────────────┬────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│       RESULT                        │
│  [▶] Censored Video                 │
│  ✨ 3 words censored                │
│                                     │
│  [⬇ Save to Photos]                │
│  [📤 Share]                         │
└─────────────────────────────────────┘
```

### Share Extension Workflow (iMessage)

```
USER IN iMessage:
Records video → "Share" → "Bleep That Sh*t"
                    ↓
┌─────────────────────────────────────┐
│    SHARE EXTENSION (Compact)        │
│  Analyzing video... (2.3 MB) ✓      │
│                                     │
│  Using your last settings:          │
│  • Classic bleep @ 70%              │
│  • Auto-detect profanity            │
│                                     │
│  [⚙ Settings]  [🚀 Process]         │
└────────────────┬────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│       PROCESSING                    │
│  ░░░░░░░░░░ 45%                     │
│  "Transcribing audio..."            │
└────────────────┬────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│       COMPLETE!                     │
│  ✨ 5 words censored                │
│  [▶ Preview]  [📤 Share to iMessage]│
└────────────────┬────────────────────┘
                 ↓
         Back to iMessage with censored video
```

---

## Risk Mitigation

### 1. Share Extension Memory Limits

**Risk:** App crashes when processing files >120MB

**Mitigation:**

- File size detection before processing
- Redirect large files to main app
- Memory monitoring with automatic abort
- Extensive device testing (not just simulator)

```swift
class MemoryMonitor {
    static func getCurrentMemoryUsage() -> UInt64 {
        var info = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size) / 4

        let result = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), $0, &count)
            }
        }

        return result == KERN_SUCCESS ? info.resident_size : 0
    }

    static func isApproachingLimit() -> Bool {
        let currentUsage = getCurrentMemoryUsage()
        let limit: UInt64 = 100_000_000 // 100MB
        return currentUsage > limit * 0.8
    }
}
```

### 2. Processing Time Expectations

**Risk:** Users expect instant results

**Mitigation:**

- Show estimated time before processing
- Real-time progress with stage information
- Background processing
- Model selection (fast vs. accurate)

**Expected Times (iPhone 15 Pro):**
| Duration | Tiny | Base | Small |
|----------|------|------|-------|
| 30s | 3-5s | 6-8s | 12-15s |
| 1 min | 6-10s | 12-15s | 25-30s |
| 5 min | 30-50s | 60-75s | 120-150s |

### 3. Model Size & Downloads

**Risk:** Users on cellular don't want to download 500MB

**Mitigation:**

- Default to tiny model (75MB)
- WiFi-only download option
- Resumable downloads
- Clear size information
- On-demand loading

### 4. Discovery & Adoption

**Risk:** Hard to get discovered in crowded App Store

**Mitigation:**

- Strong ASO (App Store Optimization)
- Content marketing (YouTube tutorials)
- Community building (Reddit, Discord)
- Viral watermark on free tier
- Partnerships with YouTubers

---

## Distribution & Monetization

### App Store Requirements

**Technical:**

- Built with Xcode 16+ and iOS 18 SDK
- 64-bit architecture
- Privacy Nutrition Label: "Data Not Collected"

**Content Policy:**

- App is a content moderation tool (allowed)
- Similar apps already approved ("Beep - Censor videos")
- No user-generated content = no moderation requirements

### Pricing Strategy

**Freemium with Hybrid Model:**

```swift
enum SubscriptionTier: String {
    case monthly = "com.bleepthatshit.premium.monthly"    // $4.99
    case yearly = "com.bleepthatshit.premium.yearly"      // $29.99 (50% off)
    case lifetime = "com.bleepthatshit.premium.lifetime"  // $19.99
}
```

**Revenue Projections (Conservative):**

- Year 1: 6,000 downloads, 3% conversion = 180 premium users
- Average value: $40/year (mix of monthly/yearly)
- Gross revenue: $7,200
- Net (after Apple's 30%): **$5,040**

**Reality check:** This is a side project, not a get-rich scheme. Break-even takes 7+ years at this scale.

### Marketing Approach

**Phase 1: Pre-Launch**

- Landing page with email signup
- Demo videos (before/after)
- TestFlight beta (50-100 users)

**Phase 2: Launch**

- ProductHunt launch
- Reddit: r/apple, r/YouTubers, r/ContentCreation
- Press release ($500)

**Phase 3: Growth**

- Content marketing (blog, SEO)
- Influencer partnerships ($200-500/post)
- App Store ads ($1,000/month)

**Budget:** $6,100 first 6 months

---

## Timeline & Budget

### Development Timeline

| Month | Phase             | Deliverable                               |
| ----- | ----------------- | ----------------------------------------- |
| 1-3   | MVP Main App      | Working app with transcription + bleeping |
| 4-5   | Share Extension   | iMessage integration                      |
| 6-7   | Advanced Features | Monetization, polish, launch              |

**Total: 6-7 months**

### Budget Estimate

**Developer Time:**

- 5-7 months × 160 hours/month = 800-1120 hours
- At $100/hour: **$80,000 - $112,000**

**Additional Costs:**

- Apple Developer account: $99/year
- Domain: $12/year
- Marketing: $6,100 (first 6 months)

**Total First Year: $86,211 - $118,211**

---

## Success Criteria

- [ ] Process audio/video with word-level timestamps
- [ ] Share extension working with <50MB files
- [ ] <5% crash rate
- [ ] App Store approval on first submission
- [ ] 1,000+ downloads first 3 months
- [ ] 3-5% free-to-premium conversion rate
- [ ] > 4.0 stars App Store rating

---

## Competitive Advantages

1. **Privacy First:** 100% on-device processing
2. **Better Technology:** WhisperKit (state-of-the-art)
3. **Customizable:** Multiple bleep sounds, volumes, modes
4. **Modern UX:** Clean SwiftUI interface
5. **iMessage Native:** Share extension integration

---

## Next Steps

### Immediate (Week 1)

- [ ] Set up Apple Developer account ($99)
- [ ] Create Xcode project with SwiftUI
- [ ] Configure App Groups
- [ ] Add WhisperKit dependency
- [ ] Design app icon

### Short-Term (Weeks 2-12)

- [ ] Implement WhisperKit integration
- [ ] Build audio/video processing pipeline
- [ ] Create main app UI
- [ ] Write unit tests

### Mid-Term (Months 4-5)

- [ ] Build share extension
- [ ] Set up StoreKit for IAP
- [ ] TestFlight beta testing

### Long-Term (Months 6-7)

- [ ] App Store submission
- [ ] Marketing launch
- [ ] Iterate based on feedback

---

## Conclusion

Building "Bleep That Sh\*t" for iOS is a **6-7 month project** requiring solid Swift/iOS development skills and persistence. It's viable as a **side project** or **portfolio piece**, but not a full-time business unless viral distribution is achieved.

**Key Takeaways:**

1. WhisperKit is production-ready
2. Share extension has limitations (manage expectations)
3. Privacy is the main selling point
4. Freemium model is essential
5. Marketing is half the battle

Your web app provides the perfect blueprint—concept is validated. Now it's about translating to native iOS with platform constraints and opportunities.

**Recommended Path:** Launch desktop app first (Phase 2), then evaluate iOS based on desktop success and resources.
