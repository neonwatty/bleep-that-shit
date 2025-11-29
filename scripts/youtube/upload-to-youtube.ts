/**
 * YouTube Upload Script
 *
 * Uploads processed videos to YouTube using the Data API v3.
 *
 * Setup:
 * 1. Go to Google Cloud Console (https://console.cloud.google.com/)
 * 2. Create a project and enable YouTube Data API v3
 * 3. Create OAuth 2.0 credentials (Desktop application)
 * 4. Download credentials and save as scripts/youtube/client_secrets.json
 * 5. Run: npx tsx scripts/youtube/upload-to-youtube.ts <video.mp4>
 *
 * First run will open browser for OAuth authentication.
 * Subsequent runs use cached refresh token.
 */

import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Configuration
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];
const TOKEN_PATH = path.join(__dirname, 'youtube_token.json');
const SECRETS_PATH = path.join(__dirname, 'client_secrets.json');

// Video metadata interface
interface VideoMetadata {
  title: string;
  description: string;
  tags: string[];
  categoryId?: string; // Default: 22 (People & Blogs)
  privacyStatus?: 'public' | 'private' | 'unlisted';
}

// Default metadata for Bleep That Sh*t! videos
const DEFAULT_METADATA: Partial<VideoMetadata> = {
  tags: [
    'bleep that shit',
    'video editing',
    'content creator',
    'youtube tips',
    'censor video',
    'bleep words',
    'content moderation',
    'demonetization',
    'youtube shorts',
  ],
  categoryId: '22', // People & Blogs (or use 27 for Education)
  privacyStatus: 'private', // Start private, manually make public after review
};

/**
 * Load client secrets from file
 */
function loadClientSecrets(): {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
} {
  if (!fs.existsSync(SECRETS_PATH)) {
    console.error(`
Error: client_secrets.json not found!

To set up YouTube API access:
1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Enable "YouTube Data API v3"
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Select "Desktop application"
6. Download the JSON and save as: ${SECRETS_PATH}
`);
    process.exit(1);
  }

  const content = fs.readFileSync(SECRETS_PATH, 'utf-8');
  const credentials = JSON.parse(content);
  return credentials.installed || credentials.web;
}

/**
 * Get OAuth2 client with authentication
 */
async function getAuthenticatedClient() {
  const secrets = loadClientSecrets();

  const oauth2Client = new google.auth.OAuth2(
    secrets.client_id,
    secrets.client_secret,
    secrets.redirect_uris[0] || 'urn:ietf:wg:oauth:2.0:oob'
  );

  // Check for existing token
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    oauth2Client.setCredentials(token);

    // Refresh if expired
    if (token.expiry_date && token.expiry_date < Date.now()) {
      console.log('Token expired, refreshing...');
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials));
    }

    return oauth2Client;
  }

  // Need to authenticate
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('\nAuthorize this app by visiting this URL:\n');
  console.log(authUrl);
  console.log('\n');

  const code = await askQuestion('Enter the authorization code: ');

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Save token for future use
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log('Token saved to', TOKEN_PATH);

  return oauth2Client;
}

/**
 * Helper to ask questions in terminal
 */
function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Upload video to YouTube
 */
async function uploadVideo(filePath: string, metadata: VideoMetadata) {
  // Validate file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`Video file not found: ${filePath}`);
  }

  const fileSize = fs.statSync(filePath).size;
  console.log(`\nUploading: ${filePath}`);
  console.log(`File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

  // Get authenticated client
  const auth = await getAuthenticatedClient();
  const youtube = google.youtube({ version: 'v3', auth });

  // Merge with defaults
  const fullMetadata = { ...DEFAULT_METADATA, ...metadata };

  console.log(`\nTitle: ${fullMetadata.title}`);
  console.log(`Privacy: ${fullMetadata.privacyStatus}`);
  console.log(`Tags: ${fullMetadata.tags?.join(', ')}`);

  // Upload
  console.log('\nUploading...');

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: fullMetadata.title,
        description: fullMetadata.description,
        tags: fullMetadata.tags,
        categoryId: fullMetadata.categoryId,
      },
      status: {
        privacyStatus: fullMetadata.privacyStatus,
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: fs.createReadStream(filePath),
    },
  });

  const videoId = response.data.id;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  console.log(`\n✅ Upload successful!`);
  console.log(`Video ID: ${videoId}`);
  console.log(`URL: ${videoUrl}`);

  if (fullMetadata.privacyStatus === 'private') {
    console.log(`\n⚠️  Video is PRIVATE. Go to YouTube Studio to make it public.`);
  }

  return response.data;
}

/**
 * Video metadata presets for different demo types
 */
const VIDEO_PRESETS: Record<string, VideoMetadata> = {
  'demonetization-saver': {
    title: 'Fix YouTube Demonetization in 60 Seconds',
    description: `YouTube flagged your video for ONE word? Here's how to fix it in under a minute.

🔗 Try it free: https://bleepthatshit.com
✨ 100% private - files never leave your device

#YouTubeShorts #ContentCreator #Demonetization #VideoEditing`,
    tags: [
      ...(DEFAULT_METADATA.tags || []),
      'demonetization',
      'youtube monetization',
      'fix demonetization',
    ],
  },

  'three-ways-to-censor': {
    title: '3 Ways to Censor Words in Your Videos',
    description: `Pick your weapon: Exact Match, Partial Match, or Fuzzy Match.

🔗 Try it free: https://bleepthatshit.com
✨ Works with any video or audio file

#YouTubeShorts #VideoEditing #ContentCreator #Tutorial`,
    tags: [...(DEFAULT_METADATA.tags || []), 'tutorial', 'how to', 'censor words'],
  },

  'bob-ross-naughty': {
    title: 'What if Bob Ross Was Less Wholesome? 😈',
    description: `Making Bob Ross sound naughty by bleeping innocent words like "happy" and "little trees" 🌲

🔗 Try it: https://bleepthatshit.com
😇 or 😈 - you decide!

#YouTubeShorts #BobRoss #Funny #VideoEditing`,
    tags: [...(DEFAULT_METADATA.tags || []), 'bob ross', 'funny', 'comedy', 'parody'],
  },

  'no-upload-required': {
    title: 'Edit Sensitive Videos Without Uploading to Cloud',
    description: `Your files NEVER leave your device. 100% private, browser-based video editing.

🔗 https://bleepthatshit.com
🔒 No cloud uploads, no accounts, no tracking

#YouTubeShorts #Privacy #VideoEditing #Security`,
    tags: [...(DEFAULT_METADATA.tags || []), 'privacy', 'secure', 'no upload', 'local processing'],
  },

  'speed-run': {
    title: 'How Fast Can You Bleep a Video? ⏱️',
    description: `Speed run: Upload to download in under 2 minutes!

🔗 Try it: https://bleepthatshit.com
⚡ Powered by AI transcription + Web Audio API

#YouTubeShorts #SpeedRun #VideoEditing #Fast`,
    tags: [...(DEFAULT_METADATA.tags || []), 'speed run', 'fast', 'quick tutorial'],
  },
};

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
YouTube Upload Script for Bleep That Sh*t! Demos

Usage:
  npx tsx scripts/youtube/upload-to-youtube.ts <video.mp4> [--preset <name>] [--title "..."] [--public]

Options:
  --preset <name>   Use predefined metadata (demonetization-saver, three-ways-to-censor, etc.)
  --title "..."     Custom video title
  --description "..." Custom description
  --public          Upload as public (default: private)
  --help            Show this help

Available presets:
  ${Object.keys(VIDEO_PRESETS).join('\n  ')}

Examples:
  npx tsx scripts/youtube/upload-to-youtube.ts output/bob-ross.mp4 --preset bob-ross-naughty
  npx tsx scripts/youtube/upload-to-youtube.ts my-video.mp4 --title "My Custom Title" --public
`);
    process.exit(0);
  }

  // Parse arguments
  const videoPath = args[0];
  let preset: string | undefined;
  let customTitle: string | undefined;
  let customDescription: string | undefined;
  let privacyStatus: 'public' | 'private' = 'private';

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--preset':
        preset = args[++i];
        break;
      case '--title':
        customTitle = args[++i];
        break;
      case '--description':
        customDescription = args[++i];
        break;
      case '--public':
        privacyStatus = 'public';
        break;
    }
  }

  // Build metadata
  let metadata: VideoMetadata;

  if (preset && VIDEO_PRESETS[preset]) {
    metadata = { ...VIDEO_PRESETS[preset], privacyStatus };
    console.log(`Using preset: ${preset}`);
  } else if (customTitle) {
    metadata = {
      title: customTitle,
      description: customDescription || 'Uploaded with Bleep That Sh*t! automation',
      tags: DEFAULT_METADATA.tags || [],
      privacyStatus,
    };
  } else {
    // Interactive mode
    const title = await askQuestion('Video title: ');
    const description = await askQuestion('Description (or press enter for default): ');

    metadata = {
      title,
      description: description || 'Created with Bleep That Sh*t! - https://bleepthatshit.com',
      tags: DEFAULT_METADATA.tags || [],
      privacyStatus,
    };
  }

  // Upload
  try {
    await uploadVideo(videoPath, metadata);
  } catch (error) {
    console.error('Upload failed:', error);
    process.exit(1);
  }
}

main();
