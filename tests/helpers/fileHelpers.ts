import { Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Creates a test audio file buffer
 */
export function createTestAudioBuffer(durationSeconds: number = 5): Buffer {
  // Create a minimal valid MP3 header + data
  // This is a simplified version - in production, use actual test files
  return Buffer.from('dummy audio content for ' + durationSeconds + ' seconds');
}

/**
 * Creates a test video file buffer
 */
export function createTestVideoBuffer(durationSeconds: number = 5): Buffer {
  return Buffer.from('dummy video content for ' + durationSeconds + ' seconds');
}

/**
 * Upload a file to the dropzone
 */
export async function uploadFile(
  page: Page,
  options: {
    fileName: string;
    mimeType: string;
    buffer?: Buffer;
    filePath?: string;
  }
): Promise<void> {
  const fileInput = page.getByTestId('file-input');

  if (options.filePath) {
    // Use real file
    await fileInput.setInputFiles(options.filePath);
  } else if (options.buffer) {
    // Use buffer
    await fileInput.setInputFiles({
      name: options.fileName,
      mimeType: options.mimeType,
      buffer: options.buffer,
    });
  } else {
    throw new Error('Either filePath or buffer must be provided');
  }
}

/**
 * Upload a test audio file
 */
export async function uploadTestAudio(
  page: Page,
  options?: {
    fileName?: string;
    filePath?: string;
  }
): Promise<void> {
  const fileName = options?.fileName ?? 'test-audio.mp3';
  const filePath = options?.filePath;

  if (filePath) {
    await uploadFile(page, {
      fileName,
      mimeType: 'audio/mpeg',
      filePath,
    });
  } else {
    await uploadFile(page, {
      fileName,
      mimeType: 'audio/mpeg',
      buffer: createTestAudioBuffer(),
    });
  }
}

/**
 * Upload a test video file
 */
export async function uploadTestVideo(
  page: Page,
  options?: {
    fileName?: string;
    filePath?: string;
  }
): Promise<void> {
  const fileName = options?.fileName ?? 'test-video.mp4';
  const filePath = options?.filePath;

  if (filePath) {
    await uploadFile(page, {
      fileName,
      mimeType: 'video/mp4',
      filePath,
    });
  } else {
    await uploadFile(page, {
      fileName,
      mimeType: 'video/mp4',
      buffer: createTestVideoBuffer(),
    });
  }
}

/**
 * Get path to test fixture file
 */
export function getFixturePath(fileName: string): string {
  return path.join(__dirname, '../fixtures', fileName);
}

/**
 * Check if a file exists in fixtures
 */
export function fixtureExists(fileName: string): boolean {
  return fs.existsSync(getFixturePath(fileName));
}
