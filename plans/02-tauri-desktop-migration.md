# Implementation Plan: Tauri Desktop Application Migration

**Effort:** 3-6 weeks (single developer), 2-4 weeks (team of 2)
**Impact:** High - Removes 10-minute file limit, 5-10x faster processing
**Priority:** ⭐ Next Quarter

---

## Executive Summary

Migrate the Next.js web application to a Tauri-based desktop app to overcome browser memory limitations and enable unlimited-length media processing with native performance. The migration reuses 95% of the existing React/Next.js frontend while replacing WebAssembly processing with native Rust/C++ implementations.

**Key Benefits:**

- Handle unlimited file lengths (tested: 2+ hour videos)
- 5-10x faster processing (native FFmpeg + GPU-accelerated Whisper)
- 2.5-10 MB installer size (vs. 150+ MB for Electron)
- Professional native app with auto-updates
- Cross-platform (macOS, Windows, Linux)

---

## Architecture Overview

### Current Web Stack → Desktop Stack

| Component        | Web (Current)           | Desktop (Tauri)          |
| ---------------- | ----------------------- | ------------------------ |
| Frontend         | Next.js 15 + React 19   | Same (static export)     |
| Audio Extraction | FFmpeg.wasm (4GB limit) | Native FFmpeg sidecar    |
| Transcription    | Whisper ONNX (browser)  | whisper.cpp (native)     |
| Audio Processing | Web Audio API           | Rust (symphonia + hound) |
| File Handling    | In-memory (limited)     | File system (unlimited)  |
| Workers          | Web Workers             | Rust async commands      |

### Project Structure

```
bleep-that-shit-desktop/
├── src/                          # Next.js frontend (reused)
│   ├── app/
│   ├── components/
│   └── lib/
├── src-tauri/                    # Rust backend (NEW)
│   ├── src/
│   │   ├── main.rs              # Tauri entry point
│   │   ├── commands/
│   │   │   ├── transcription.rs # Whisper integration
│   │   │   ├── audio.rs         # Audio processing
│   │   │   └── ffmpeg.rs        # FFmpeg operations
│   │   └── utils/
│   ├── binaries/                # FFmpeg sidecar binaries
│   ├── Cargo.toml
│   └── tauri.conf.json
```

---

## Phase 1: Proof of Concept (Weeks 1-2)

**Goal:** Validate Tauri can handle the core workflow

### Tasks

1. **Create Tauri Project**

   ```bash
   npm create tauri-app@latest bleep-that-shit-desktop
   # Choose: Next.js, TypeScript, npm
   cd bleep-that-shit-desktop
   ```

2. **Copy Existing Frontend**

   ```bash
   cp -r ../bleep-that-shit/app src/
   cp -r ../bleep-that-shit/components src/
   cp -r ../bleep-that-shit/lib src/
   cp -r ../bleep-that-shit/public .
   ```

3. **Update `next.config.ts`**

   ```typescript
   const nextConfig = {
     output: 'export', // Already set!
     images: { unoptimized: true }, // Required for static export
   };
   ```

4. **Replace File Upload with Tauri Dialog**

   ```typescript
   // Replace react-dropzone
   import { open } from '@tauri-apps/plugin-dialog';

   const handleFileSelect = async () => {
     const selected = await open({
       multiple: false,
       filters: [{ name: 'Media', extensions: ['mp3', 'mp4', 'wav', 'mov'] }],
     });

     if (selected) {
       setFilePath(selected.path);
     }
   };
   ```

5. **Implement Simple Command**

   ```rust
   // src-tauri/src/main.rs
   #[tauri::command]
   fn get_file_info(path: String) -> Result<FileInfo, String> {
       let metadata = fs::metadata(&path)
           .map_err(|e| e.to_string())?;

       Ok(FileInfo {
           size: metadata.len(),
           name: Path::new(&path).file_name()
               .unwrap()
               .to_string_lossy()
               .to_string(),
       })
   }

   #[derive(serde::Serialize)]
   struct FileInfo {
       size: u64,
       name: String,
   }
   ```

6. **Test Build**
   ```bash
   npm run tauri dev
   npm run tauri build
   ```

**Success Criteria:**

- App launches with existing UI
- File dialog opens and returns file path
- Rust command successfully called from frontend

---

## Phase 2: Core Processing Migration (Weeks 3-6)

### Week 3: FFmpeg Sidecar Integration

**Download Platform-Specific FFmpeg Binaries:**

- macOS: [ffmpeg-x86_64-apple-darwin, ffmpeg-aarch64-apple-darwin]
- Windows: ffmpeg-x86_64-pc-windows-msvc.exe
- Linux: ffmpeg-x86_64-unknown-linux-gnu

**Configure Sidecar** (`tauri.conf.json`):

```json
{
  "bundle": {
    "externalBin": ["binaries/ffmpeg"]
  },
  "plugins": {
    "shell": {
      "open": true,
      "scope": [
        {
          "name": "binaries/ffmpeg",
          "sidecar": true,
          "args": true
        }
      ]
    }
  }
}
```

**Implement FFmpeg Commands** (`src-tauri/src/commands/ffmpeg.rs`):

```rust
use tauri::api::process::Command;

#[tauri::command]
pub async fn extract_audio(
    app: AppHandle,
    video_path: String,
) -> Result<String, String> {
    let output = std::env::temp_dir()
        .join("extracted_audio.wav");

    let (mut rx, _child) = Command::new_sidecar("ffmpeg")?
        .args([
            "-i", &video_path,
            "-vn", "-acodec", "pcm_s16le",
            "-ar", "16000", "-ac", "1",
            output.to_str().unwrap(),
        ])
        .spawn()?;

    // Parse progress and emit events
    while let Some(event) = rx.recv().await {
        if let CommandEvent::Stderr(line) = event {
            if let Some(progress) = parse_ffmpeg_progress(&line) {
                app.emit_all("ffmpeg-progress", progress)?;
            }
        }
    }

    Ok(output.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn remux_video(
    video_path: String,
    audio_path: String,
    output_path: String,
) -> Result<String, String> {
    Command::new_sidecar("ffmpeg")?
        .args([
            "-i", &video_path,
            "-i", &audio_path,
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "128k",
            "-map", "0:v:0",
            "-map", "1:a:0",
            &output_path,
        ])
        .output()?;

    Ok(output_path)
}
```

### Week 4-5: Whisper.cpp Integration

**Add Dependencies** (`Cargo.toml`):

```toml
[dependencies]
whisper-rs = "0.10"
symphonia = { version = "0.5", features = ["all"] }
hound = "3.5"
```

**Implement Transcription** (`src-tauri/src/commands/transcription.rs`):

```rust
use whisper_rs::{WhisperContext, FullParams, SamplingStrategy};

#[tauri::command]
pub async fn transcribe_audio(
    app: AppHandle,
    audio_path: String,
    model: String,
) -> Result<TranscriptionResult, String> {
    // Load model (cached after first use)
    let model_path = get_model_path(&model).await?;
    let ctx = WhisperContext::new(&model_path)
        .map_err(|e| format!("Failed to load model: {}", e))?;

    // Decode audio to 16kHz mono
    app.emit_all("transcription-progress", Progress {
        progress: 20,
        status: "Decoding audio...".into(),
    })?;

    let samples = decode_audio_to_mono_16khz(&audio_path)?;

    // Configure for word-level timestamps
    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_token_timestamps(true);
    params.set_max_len(1);

    app.emit_all("transcription-progress", Progress {
        progress: 40,
        status: "Running Whisper...".into(),
    })?;

    let mut state = ctx.create_state()
        .map_err(|e| format!("Failed to create state: {}", e))?;

    state.full(params, &samples)
        .map_err(|e| format!("Transcription failed: {}", e))?;

    // Extract word-level results
    let num_segments = state.full_n_segments()
        .map_err(|e| format!("Failed to get segments: {}", e))?;

    let mut chunks = Vec::new();
    for i in 0..num_segments {
        let text = state.full_get_segment_text(i)?;
        let t0 = state.full_get_segment_t0(i)?;
        let t1 = state.full_get_segment_t1(i)?;

        chunks.push(Chunk {
            text,
            timestamp: [t0 as f32 / 100.0, t1 as f32 / 100.0],
        });
    }

    Ok(TranscriptionResult { chunks })
}
```

**Model Download Strategy:**

```rust
async fn ensure_model_downloaded(model_name: &str) -> Result<PathBuf, Box<dyn Error>> {
    let model_dir = app_data_dir()?.join("models");
    fs::create_dir_all(&model_dir)?;

    let model_file = match model_name {
        "Xenova/whisper-tiny.en" => "ggml-tiny.en.bin",
        "Xenova/whisper-base.en" => "ggml-base.en.bin",
        "Xenova/whisper-small.en" => "ggml-small.en.bin",
        _ => return Err("Unknown model".into()),
    };

    let model_path = model_dir.join(model_file);

    if !model_path.exists() {
        let url = format!(
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/{}",
            model_file
        );

        let response = reqwest::get(&url).await?;
        let bytes = response.bytes().await?;
        fs::write(&model_path, bytes)?;
    }

    Ok(model_path)
}
```

### Week 6: Audio Processing in Rust

**Implement Bleep Application** (`src-tauri/src/commands/audio.rs`):

```rust
use symphonia::core::audio::SampleBuffer;
use hound::{WavWriter, WavSpec};

#[tauri::command]
pub async fn apply_bleeps(
    audio_path: String,
    bleep_segments: Vec<BleepSegment>,
    bleep_volume: f32,
    original_volume_reduction: f32,
) -> Result<String, String> {
    // Load original audio
    let mut audio = load_audio(&audio_path)?;

    // Load bleep sound
    let bleep = load_bleep("classic")?;

    // Process in chunks
    for segment in bleep_segments {
        let start_sample = (segment.start * 16000.0) as usize;
        let end_sample = (segment.end * 16000.0) as usize;

        // Duck original audio
        for i in start_sample..end_sample {
            audio[i] *= original_volume_reduction;
        }

        // Mix in bleep (loop if needed)
        let mut bleep_idx = 0;
        for i in start_sample..end_sample {
            audio[i] += bleep[bleep_idx % bleep.len()] * bleep_volume;
            bleep_idx += 1;
        }
    }

    // Save to temp file
    let output_path = save_wav(&audio)?;
    Ok(output_path)
}

fn save_wav(samples: &[f32], path: &str) -> Result<(), hound::Error> {
    let spec = WavSpec {
        channels: 1,
        sample_rate: 16000,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let mut writer = WavWriter::create(path, spec)?;
    for &sample in samples {
        let sample_i16 = (sample * i16::MAX as f32) as i16;
        writer.write_sample(sample_i16)?;
    }

    writer.finalize()
}
```

---

## Phase 3: Feature Parity & UI Updates (Weeks 7-8)

### Week 7: Frontend Migration

**Update Main Bleeping Page** (`app/bleep/page.tsx`):

```typescript
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open, save } from '@tauri-apps/plugin-dialog';

// Replace Web Worker calls
const handleTranscribe = async () => {
  setIsTranscribing(true);

  // Listen for progress events
  const unlisten = await listen('transcription-progress', e => {
    setProgress(e.payload.progress);
    setProgressText(e.payload.status);
  });

  try {
    const result = await invoke('transcribe_audio', {
      audioPath: filePath,
      model,
      language,
    });

    setTranscriptionResult(result);
  } catch (error) {
    setErrorMessage(error);
  } finally {
    setIsTranscribing(false);
    unlisten();
  }
};

// Save dialog
const handleDownload = async () => {
  const filePath = await save({
    defaultPath: `censored-${file.name}`,
    filters: [{ name: 'Media', extensions: ['mp3', 'mp4'] }],
  });

  if (filePath) {
    await invoke('copy_file', {
      sourcePath: censoredMediaUrl,
      destPath: filePath,
    });
  }
};
```

**Add Drag-and-Drop:**

```typescript
import { listen } from '@tauri-apps/api/event';

useEffect(() => {
  const unlisten = listen('tauri://file-drop', event => {
    const files = event.payload as string[];
    handleFileSelect(files[0]);
  });

  return () => {
    unlisten.then(f => f());
  };
}, []);
```

### Week 8: Testing & Polish

- [ ] Test with 10+ minute files
- [ ] Test with 1+ hour files
- [ ] Memory leak detection
- [ ] Error handling for corrupted files
- [ ] Progress reporting accuracy
- [ ] Cross-platform testing (macOS, Windows, Linux)

---

## Phase 4: Distribution & Polish (Weeks 9-10)

### Week 9: Build Configuration

**Configure `tauri.conf.json`:**

```json
{
  "productName": "Bleep That Shit",
  "version": "1.0.0",
  "identifier": "com.bleepthatshit.app",
  "build": {
    "distDir": "../out",
    "devPath": "http://localhost:3000",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build && npm run export"
  },
  "bundle": {
    "active": true,
    "targets": ["dmg", "app", "msi", "appimage"],
    "macOS": {
      "minimumSystemVersion": "10.15"
    },
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/icon.icns", "icons/icon.ico"]
  }
}
```

**Build for All Platforms:**

```bash
# macOS Universal Binary
npm run tauri build -- --target universal-apple-darwin

# Windows
npm run tauri build -- --target x86_64-pc-windows-msvc

# Linux
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

### Week 10: Auto-Update & Release

**Configure Updater** (`tauri.conf.json`):

```json
{
  "updater": {
    "active": true,
    "endpoints": [
      "https://github.com/username/bleep-that-shit/releases/latest/download/latest.json"
    ],
    "dialog": true,
    "pubkey": "YOUR_PUBLIC_KEY_HERE"
  }
}
```

**Generate Update Keys:**

```bash
npm run tauri signer generate -- -w ~/.tauri/bleep-that-shit.key
# Save private key securely, add public key to tauri.conf.json
```

**GitHub Actions for Releases** (`.github/workflows/release.yml`):

```yaml
name: Release Build
on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        platform: [macos-latest, ubuntu-22.04, windows-latest]

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: dtolnay/rust-toolchain@stable

      - name: Install dependencies
        run: npm ci

      - name: Build application
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'Bleep That Shit v__VERSION__'
          releaseDraft: true
```

---

## Code Signing Requirements

### macOS (Required for Distribution)

1. Get Apple Developer account ($99/year)
2. Create Developer ID Application certificate
3. Notarize app:
   ```bash
   xcrun notarytool submit app.dmg \
     --apple-id your@email.com \
     --team-id TEAM_ID \
     --password app-specific-password \
     --wait
   ```

### Windows (Optional but Recommended)

- Purchase code signing certificate ($200-400/year)
- Sign after build:
  ```powershell
  signtool sign /f cert.pfx /p password /tr http://timestamp.digicert.com app.exe
  ```

### Linux

- No code signing required
- Consider Flatpak for sandboxing

---

## Learning Resources

### Tauri Fundamentals

- Official Tauri Guides: https://v2.tauri.app/start/
- Tauri + Next.js Template: https://github.com/motz0815/tauri-nextjs-starter
- Tauri Command System: https://v2.tauri.app/develop/calling-rust/

### Rust for TypeScript Developers

- Rust Book: https://doc.rust-lang.org/book/
- Focus: Chapter 4 (Ownership), 10 (Generics), 13 (Closures), 16 (Concurrency)

### Audio Processing

- Symphonia docs: https://docs.rs/symphonia/
- Hound WAV library: https://docs.rs/hound/
- whisper-rs crate: https://docs.rs/whisper-rs/

---

## Performance Comparison

| Metric            | Web (Current)      | Desktop (Tauri)     | Improvement    |
| ----------------- | ------------------ | ------------------- | -------------- |
| Max File Duration | 5-10 minutes       | Unlimited           | ∞              |
| Processing Speed  | 5.5s for 23s audio | ~2-3s for 23s audio | 2-3x faster    |
| Model Load Time   | 10-20s (ONNX)      | 2-5s (cached ggml)  | 2-4x faster    |
| Memory Usage      | 1-2 GB (browser)   | 300-500 MB (native) | 70% reduction  |
| Bundle Size       | N/A (web)          | 2.5-10 MB           | Tiny installer |
| Startup Time      | Instant (web)      | <500ms              | Nearly instant |

---

## Risk Assessment

### Technical Risks

**Learning Curve:**

- Rust ownership model can be challenging
- **Mitigation:** Start with POC, use existing crates

**Platform-Specific Issues:**

- Different behaviors on macOS/Windows/Linux
- **Mitigation:** Test early on all platforms, use GitHub Actions

**FFmpeg Sidecar:**

- Binary size increase (~100-150 MB with FFmpeg)
- **Mitigation:** Accept trade-off for native performance

### Timeline Risks

**Rust Development Slower:**

- Estimate 50% longer for Rust vs. JavaScript
- **Mitigation:** Prioritize simple implementations, avoid over-engineering

**Code Signing Delays:**

- Notarization can take hours
- **Mitigation:** Set up automation early

---

## Success Criteria

- [ ] Process 2+ hour video files without crashes
- [ ] 2-5x faster transcription than web version
- [ ] Installer size <150 MB (with FFmpeg)
- [ ] Cross-platform builds for macOS, Windows, Linux
- [ ] Auto-update system working
- [ ] <5% error rate for processing

---

## Budget Estimate

### Developer Time

- 3-6 weeks × 40 hours/week = 120-240 hours
- At $100/hour: **$12,000 - $24,000**

### Additional Costs

- Apple Developer account: $99/year
- Code signing certificate (Windows): $200-400
- Domain for auto-update: $12/year

**Total First Year: $12,311 - $24,511**

---

## Next Steps

1. **Week 1:** Create POC with Tauri + Next.js
2. **Week 2:** Test file dialog, simple command, build process
3. **Week 3-6:** Implement core processing (FFmpeg, Whisper, audio)
4. **Week 7-8:** UI updates and testing
5. **Week 9-10:** Build, sign, and release

**Start Here:**

```bash
npm create tauri-app@latest bleep-that-shit-desktop
cd bleep-that-shit-desktop
npm install
npm run tauri dev
```
