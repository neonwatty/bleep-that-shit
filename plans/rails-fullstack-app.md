# Bleep That Sh\*t - Rails 8 Full-Stack App Plan

## Overview

Build a Rails 8 + Inertia.js + React full-stack app for audio/video censorship. The app will be a unified platform where:

- **Free tier**: Client-side transcription (current Whisper.js) + account for saving wordsets/preferences
- **Premium tier**: Server-side transcription (OpenAI API) + longer files + permanent saved results

## Key Decisions

| Decision      | Choice              | Rationale                                                            |
| ------------- | ------------------- | -------------------------------------------------------------------- |
| Backend       | Rails 8             | Simple file handling with Active Storage, built-in auth, Solid Queue |
| Frontend      | Inertia.js + React  | Single deploy, server-side routing, reuse existing React components  |
| Transcription | OpenAI Whisper API  | Fastest to market (~$0.006/min), word-level timestamps               |
| Hosting       | Render.com          | Easy Rails deploy, managed Postgres, FFmpeg available                |
| Storage       | Active Storage + S3 | Scalable file storage for media files                                |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Render.com                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Rails 8 Web   │  │  Solid Queue    │  │  PostgreSQL │ │
│  │  + Inertia.js   │  │   (Workers)     │  │             │ │
│  │  + React        │  │                 │  │             │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
│           │                    │                   │        │
│           └────────────────────┴───────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │   S3     │   │  OpenAI  │   │  Stripe  │
        │ (files)  │   │ (Whisper)│   │(payments)│
        └──────────┘   └──────────┘   └──────────┘
```

## Database Schema

```ruby
# Users
create_table :users do |t|
  t.string :email, null: false, index: { unique: true }
  t.string :password_digest, null: false
  t.string :name
  t.string :tier, default: 'free' # free, premium
  t.datetime :subscription_expires_at
  t.integer :monthly_minutes_used, default: 0
  t.timestamps
end

# Projects (premium users only for server-side processing)
create_table :projects do |t|
  t.references :user, null: false, foreign_key: true
  t.string :name, null: false
  t.string :status, default: 'pending' # pending, transcribing, ready, processing, completed, failed
  t.string :media_type # audio, video
  t.float :duration_seconds
  t.jsonb :metadata, default: {}
  t.timestamps
end

# Transcriptions
create_table :transcriptions do |t|
  t.references :project, null: false, foreign_key: true
  t.text :full_text
  t.string :language
  t.jsonb :chunks, default: [] # [{text, start, end}, ...]
  t.timestamps
end

# Wordsets (available to free and premium)
create_table :wordsets do |t|
  t.references :user, null: false, foreign_key: true
  t.string :name, null: false
  t.text :words, array: true, default: []
  t.boolean :match_exact, default: true
  t.boolean :match_partial, default: false
  t.boolean :match_fuzzy, default: false
  t.integer :fuzzy_distance, default: 1
  t.string :color
  t.boolean :is_default, default: false
  t.timestamps
end

# Matched words for a project
create_table :matched_words do |t|
  t.references :project, null: false, foreign_key: true
  t.references :wordset, foreign_key: true
  t.string :word, null: false
  t.float :start_time, null: false
  t.float :end_time, null: false
  t.string :match_type # exact, partial, fuzzy, manual
  t.boolean :is_active, default: true
  t.timestamps
end

# Bleep configurations
create_table :bleep_configs do |t|
  t.references :project, null: false, foreign_key: true
  t.string :bleep_sound, default: 'classic'
  t.float :bleep_volume, default: 1.0
  t.float :original_reduction, default: 1.0
  t.float :buffer_before, default: 0.0
  t.float :buffer_after, default: 0.0
  t.timestamps
end
```

## Freemium Model

### Free Tier

- Account creation (email/password)
- **Client-side transcription** (Whisper.js in browser - current functionality)
- Save wordsets to database (synced across devices)
- Save user preferences
- No project history (process-and-download only)
- Limited to browser capabilities for file size

### Premium Tier ($X/month)

- **Server-side transcription** (OpenAI Whisper API)
- Longer files (up to 500MB video, 2+ hours audio)
- Saved project history with re-editing
- Transcript export (TXT, SRT, JSON)
- Priority support
- Usage: X minutes/month included

## Implementation Phases

### Phase 1: Rails Foundation

1. Initialize Rails 8 app with Inertia.js + React
   ```bash
   rails new bleep-app --database=postgresql --css=tailwind
   bundle add inertia_rails
   ```
2. Set up authentication (Rails 8 generator)
3. Configure Active Storage with S3
4. Create database migrations
5. Set up Solid Queue for background jobs

### Phase 2: User & Wordset Features (Free Tier)

1. User registration/login pages (Inertia + React)
2. Wordset CRUD API and UI
3. Port wordset components from Next.js app
4. User preferences/settings page

### Phase 3: Server-Side Transcription (Premium)

1. File upload with Active Storage
2. FFmpeg service for audio extraction
3. OpenAI Whisper API integration
4. Background job for transcription with progress
5. ActionCable for real-time progress updates

### Phase 4: Bleeping & Export (Premium)

1. Port audio processing logic from Next.js
2. FFmpeg service for audio bleeping
3. Video remuxing service
4. Export job (censored media + transcripts)
5. Download flow

### Phase 5: Payments & Polish

1. Stripe subscription integration
2. Usage tracking and limits
3. Email notifications
4. Error handling and retry logic
5. Production deployment to Render

## Key Services

### WhisperService (OpenAI API)

```ruby
# app/services/whisper_service.rb
class WhisperService
  def self.transcribe(audio_path, language: nil)
    response = OpenAI::Client.new.audio.transcribe(
      file: File.open(audio_path),
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word']
    )

    {
      text: response['text'],
      language: response['language'],
      chunks: response['words'].map { |w|
        { text: w['word'], start: w['start'], end: w['end'] }
      }
    }
  end
end
```

### FFmpegService

```ruby
# app/services/ffmpeg_service.rb
class FFmpegService
  def self.extract_audio(video_path)
    output = temp_path("audio_#{SecureRandom.hex}.wav")
    system("ffmpeg", "-i", video_path, "-vn", "-ar", "16000", "-ac", "1", "-y", output)
    output
  end

  def self.replace_audio(video_path, audio_path)
    output = temp_path("remuxed_#{SecureRandom.hex}.mp4")
    system("ffmpeg", "-i", video_path, "-i", audio_path, "-c:v", "copy", "-map", "0:v", "-map", "1:a", "-y", output)
    output
  end
end
```

### TranscribeJob

```ruby
# app/jobs/transcribe_job.rb
class TranscribeJob < ApplicationJob
  queue_as :transcription

  def perform(project_id)
    project = Project.find(project_id)
    project.update!(status: 'transcribing')

    # Extract audio if video
    audio_path = if project.media_type == 'video'
      FFmpegService.extract_audio(project.original_file.download_to_temp)
    else
      project.original_file.download_to_temp
    end

    # Transcribe
    result = WhisperService.transcribe(audio_path)

    # Save transcription
    project.create_transcription!(
      full_text: result[:text],
      language: result[:language],
      chunks: result[:chunks]
    )

    project.update!(status: 'ready')
    broadcast_to_user(project, { type: 'transcription_complete' })
  end
end
```

## React Components to Port

From current Next.js app (`app/bleep/page.tsx`):

| Component               | Purpose                                | Reusability |
| ----------------------- | -------------------------------------- | ----------- |
| FileUpload              | Dropzone for media files               | Direct port |
| TranscriptReview        | Display transcript with word selection | Direct port |
| SentenceRow/WordWrapper | Individual word controls               | Direct port |
| BleepControls           | Sound/volume configuration             | Direct port |
| TranscriptExport        | Export TXT/SRT/JSON                    | Direct port |
| MatchedWordsDisplay     | Show selected words                    | Direct port |

**New components needed:**

- Dashboard (project list)
- Navbar with auth state
- Settings page
- Subscription management

## Inertia.js Page Structure

```
app/frontend/
├── pages/
│   ├── Auth/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   └── ForgotPassword.tsx
│   ├── Dashboard/
│   │   └── Index.tsx        # Project list
│   ├── Projects/
│   │   ├── New.tsx          # Upload new file
│   │   ├── Show.tsx         # View/edit transcript
│   │   └── Export.tsx       # Configure and export
│   ├── Wordsets/
│   │   ├── Index.tsx        # List wordsets
│   │   └── Edit.tsx         # Edit wordset
│   ├── Settings/
│   │   └── Index.tsx        # User preferences
│   └── Bleep/
│       └── Index.tsx        # Free tier client-side tool
├── components/
│   ├── Layout.tsx
│   ├── Navbar.tsx
│   ├── FileUpload.tsx       # Ported from Next.js
│   ├── TranscriptReview.tsx # Ported from Next.js
│   └── ... (other ported components)
└── lib/
    ├── transcription.ts     # Client-side Whisper (free tier)
    └── audioProcessor.ts    # Client-side bleeping (free tier)
```

## Render.com Deployment

```yaml
# render.yaml
services:
  - type: web
    name: bleep-app-web
    env: ruby
    plan: starter
    buildCommand: |
      bundle install
      npm install
      bundle exec rails assets:precompile
    startCommand: bundle exec puma -C config/puma.rb
    envVars:
      - key: RAILS_MASTER_KEY
        sync: false
      - key: DATABASE_URL
        fromDatabase:
          name: bleep-db
          property: connectionString

  - type: worker
    name: bleep-app-worker
    env: ruby
    plan: starter
    buildCommand: bundle install
    startCommand: bundle exec rake solid_queue:start

databases:
  - name: bleep-db
    plan: starter
```

## Repository Structure (Monorepo)

```
bleep-that-shit/
├── app/                    # Next.js app (current)
├── components/             # Next.js components
├── lib/                    # Next.js lib
├── public/                 # Next.js public
├── tests/                  # Next.js tests
├── package.json            # Next.js dependencies
├── next.config.ts
├── ...
│
└── rails/                  # NEW: Rails 8 app
    ├── app/
    │   ├── controllers/
    │   ├── models/
    │   ├── jobs/
    │   ├── services/
    │   └── frontend/       # Inertia + React
    │       ├── pages/
    │       ├── components/
    │       └── lib/
    ├── config/
    ├── db/
    ├── Gemfile
    └── ...
```

**Shared code opportunities:**

- TypeScript types can be referenced from Rails frontend
- Some React components can be symlinked or copied
- Bleep sounds from `/public/bleeps/` can be shared

## Migration Strategy

1. **Current Next.js app** continues at `bleepthatshit.com` (or GitHub Pages)
2. **Rails app** deployed at `app.bleepthatshit.com`
3. Add "Sign up for more features" CTA to Next.js app
4. Eventually, the Rails app `/bleep` route can serve the same client-side experience with account benefits

## Estimated Costs (Monthly)

| Item                            | Cost                         |
| ------------------------------- | ---------------------------- |
| Render.com (web + worker + DB)  | ~$25-40                      |
| S3 storage (depending on usage) | ~$5-20                       |
| OpenAI Whisper API (per usage)  | ~$0.006/min                  |
| Stripe fees                     | 2.9% + $0.30 per transaction |

## Open Questions

1. What subscription price point? ($5, $10, $15/month?)
2. How many minutes included per month for premium?
3. Domain setup - use `app.bleepthatshit.com` or new domain?
4. Email provider for transactional emails (welcome, password reset)?

## Files to Reference from Current Codebase

When implementing, reference these files for logic/patterns:

- `app/bleep/page.tsx` - Main UI flow and state management
- `app/bleep/hooks/useBleepState.ts` - State management patterns
- `lib/utils/audioProcessor.ts` - Audio bleeping logic
- `lib/utils/stringMatching.ts` - Levenshtein distance algorithm
- `lib/utils/transcriptExport.ts` - Export formatting (SRT, JSON, TXT)
- `lib/types/` - TypeScript interfaces to convert to Ruby/TS types
- `app/workers/transcriptionWorker.ts` - Transcription flow (for client-side free tier)
