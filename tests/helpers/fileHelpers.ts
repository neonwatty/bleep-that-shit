import { Page } from '@playwright/test';

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
