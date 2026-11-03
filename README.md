<a href="https://www.producthunt.com/posts/bleep-that-sh-t?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-bleep&#0045;that&#0045;sh&#0042;t" target="_parent"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=470378&theme=light" alt="Bleep&#0032;That&#0032;Sh&#0042;t&#0033; - A&#0032;whisper&#0032;app&#0032;that&#0032;bleeps&#0032;out&#0032;chosen&#0032;words&#0032;in&#0032;YouTube&#0032;videos | Product Hunt" style="width: 250px; height: 45px;" /></a>

# Bleep That Sh\*t! — In-Browser Audio & Video Censorship Tool

Make someone sound naughty 😈 or make your content more Ad-friendly.

**Bleep That Sh\*t!** lets you instantly transcribe and censor words in your audio or video files, with full control over what gets bleeped. No uploads, no servers, no installs — everything happens right in your browser.

**The current in-browser implementation works for clips of length 10 minutes or less.**

## Browser project and hosted Studio

This Apache-2.0 repository contains the browser implementation. Its transcription and media editing
run locally in the browser. You can run this code yourself using the instructions below.

The hosted product at [bleepthat.sh](https://bleepthat.sh/) also offers
[Bleep Studio](https://bleepthat.sh/studio), an account-based workflow with cloud processing and saved
projects. Studio is maintained separately; this repository does not contain its hosted implementation.
The browser project's local-processing privacy statements and clip limit do not describe Studio.

To try the browser workflow, open the [interactive bleep tool](https://bleepthat.sh/bleep). The hosted
site checks device capabilities and may direct unsupported devices to Studio. See the
[current plans](https://bleepthat.sh/premium) for hosted Studio pricing and limits.

---

## How it works

1. **Upload** your audio (MP3) or video (MP4) file.
2. **Transcribe** using Whisper ONNX models (transformers.js) — all in-browser.
3. **Censor**: Pick words to bleep (exact, partial, or fuzzy match).
4. **Preview & Download**: Hear the result and save your censored file.

All processing is done locally in your browser. Your media and transcripts stay private — nothing is sent to a server.

---

## Examples

Some examples of the end product (make sure to turn volume on, its off by default).

https://github.com/user-attachments/assets/da50f8a9-27ba-4747-92e0-72a25e65175c

Let's look more closely at the last example above - below is a short clip we'll bleep out some words from using the pipeline in this repo. (make sure to turn on audio - its off by default)

https://github.com/neonwatty/bleep-that-shit/assets/16326421/fb8568fe-aba0-49e2-a563-642d658c0651

Now the same clip with the words - "treetz", "ice", "cream", "chocolate", "syrup", and "cookie" - bleeped out

https://github.com/neonwatty/bleep-that-shit/assets/16326421/63ebd7a0-46f6-4efd-80ea-20512ff427c0

---

## Using the App

Just open the app in any modern browser — **no installation or setup required**.

### Live Demo

Use Bleep at [https://bleepthat.sh/bleep](https://bleepthat.sh/bleep), or run it locally.

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

- Node.js 20 or newer
- npm (the repository includes `package-lock.json`)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/neonwatty/bleep-that-shit.git
   cd bleep-that-shit
   ```

2. Install dependencies:

   ```bash
   npm ci
   ```

3. Configure the development environment. This snapshot initializes account services even when you
   are using the browser workflow, so it needs the variables documented in
   [`.env.local.example`](.env.local.example). Maintainers with access to the project's Doppler
   configuration can install the Doppler CLI, run `doppler login`, and run `doppler setup` for the
   development configuration. Do not use production credentials for local development.

4. Start the development server with the configured environment:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3004](http://localhost:3004) in your browser.

`npm run dev` uses Doppler to supply the development environment. If you already supply the required
variables through another environment source, `npm run dev:local` starts Next.js directly. It does not
provide or replace that configuration. Both development scripts use port 3004.

---

## Available Scripts

```bash
npm run dev           # Start development on port 3004 with Doppler configuration
npm run dev:local     # Start directly with an already-configured environment
npm run build         # Build for production
npm run start         # Start the production server
npm test              # Run unit tests with Vitest
npm run test:unit:ui   # Open the Vitest UI
npm run test:e2e       # Run Playwright end-to-end tests
npm run test:e2e:ui    # Open the Playwright UI
```

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
