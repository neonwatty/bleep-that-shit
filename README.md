<a href="https://www.producthunt.com/posts/bleep-that-sh-t?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-bleep&#0045;that&#0045;sh&#0042;t" target="_parent"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=470378&theme=light" alt="Bleep&#0032;That&#0032;Sh&#0042;t&#0033; - A&#0032;whisper&#0032;app&#0032;that&#0032;bleeps&#0032;out&#0032;chosen&#0032;words&#0032;in&#0032;YouTube&#0032;videos | Product Hunt" style="width: 250px; height: 45px;" /></a>

# Bleep That Sh\*t! — In-Browser Audio & Video Censorship Tool

Make someone sound naughty 😈 or make your content more Ad-friendly.

**Bleep That Sh\*t!** lets you instantly transcribe and censor words in your audio or video files, with full control over what gets bleeped. No uploads, no servers, no installs — everything happens right in your browser.

---

## How it works

1. **Upload** your audio (MP3) or video (MP4) file.
2. **Transcribe** using Whisper ONNX models (transformers.js) — all in-browser.
3. **Censor**: Pick words to bleep (exact, partial, or fuzzy match).
4. **Preview & Download**: Hear the result and save your censored file.

All processing is done locally in your browser using cutting-edge technologies. Your media and transcripts stay private — nothing is sent to a server.

---

## Technology Highlights

- **Next.js 15**: Static site generation with App Router
- **TypeScript**: Type-safe development throughout
- **transformers.js + ONNX Whisper**: In-browser speech-to-text with word-level timestamps
- **ffmpeg.wasm**: Audio/video extraction and muxing, all in-browser
- **Web Audio API**: Precise audio editing and bleep insertion
- **Web Workers**: Background processing to keep UI responsive
- **Plyr**: Beautiful, interactive media playback
- **Tailwind CSS**: Modern, responsive styling
- **GitHub Pages**: Static hosting with GitHub Actions CI/CD
- **No backend required** — 100% client-side processing
- **No server/cloud processing** — privacy-first, local-only by design

---

## Examples

Some examples of the end product (make sure to turn volume on, its off by default).

https://github.com/user-attachments/assets/da50f8a9-27ba-4747-92e0-72a25e65175c

Let's look more closely at the last example above - below is a short clip we'll bleep out some words from using the pipeline in this repo. (make sure to turn on audio - its off by default)

https://github.com/neonwatty/bleep_that_sht/assets/16326421/fb8568fe-aba0-49e2-a563-642d658c0651

Now the same clip with the words - "treetz", "ice", "cream", "chocolate", "syrup", and "cookie" - bleeped out

https://github.com/neonwatty/bleep_that_sht/assets/16326421/63ebd7a0-46f6-4efd-80ea-20512ff427c0

---

## Using the App

Just open the app in any modern browser — **no installation or setup required**.

### Live Demo
Visit the deployed app at [https://neonwatty.github.io/bleep-that-shit/](https://neonwatty.github.io/bleep-that-shit/) or run it locally.

---

## App Features

### Main Workflow (`/bleep`)
- Upload audio or video files
- Select language and Whisper model
- Transcribe to generate word-level timestamps
- Enter words to censor with multiple matching modes (exact, partial, fuzzy)
- Choose from different bleep sounds
- Preview and download the censored result

### Model Comparison (`/sampler`)
- Compare transcription accuracy across different Whisper models
- Test processing speeds
- Find the best model for your needs

---

## Running Locally

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/neonwatty/bleep-that-shit.git
   cd bleep-that-shit
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

---

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm test            # Run Playwright tests
npm run test:ui     # Run tests with UI
```

---

## Deployment

### GitHub Pages (Automatic)

The app automatically deploys to GitHub Pages when changes are pushed to the main branch. The deployment workflow:
1. Builds the Next.js app as a static site
2. Exports all pages and assets
3. Deploys to GitHub Pages

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/neonwatty/bleep-that-shit)

### Build for Static Hosting

```bash
npm run build
npm run export
```

The static files will be in the `out` directory. The app is configured for static export with `next.config.ts` supporting base path deployment.

---

## Browser Requirements

- Modern browser with WebAssembly support
- Web Workers support
- Sufficient RAM for model loading (varies by model size)

---

## Available Whisper Models

- **Tiny** (39 MB): Fastest, good for quick processing
- **Base** (74 MB): Better accuracy, still fast
- **Small** (242 MB): Best accuracy, slower processing

Both English-only and multilingual variants are available.

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Transformers.js](https://github.com/xenova/transformers.js) for WebAssembly Whisper models
- [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) for media processing
- [OpenAI Whisper](https://github.com/openai/whisper) for the original models

---

## Support

For issues and questions, please open an issue on [GitHub](https://github.com/neonwatty/bleep-that-shit/issues).