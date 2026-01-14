import { createClient } from './client';

export type StorageBucket = 'originals' | 'processed';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileMetadata {
  originalName: string;
  size: number;
  type: string;
  duration?: number;
}

export interface UploadResult {
  path: string;
  fullPath: string;
  metadata: FileMetadata;
}

/**
 * Generate the storage path for a file
 * Pattern: {userId}/{projectId}/{filename}
 */
export function getStoragePath(userId: string, projectId: string, filename: string): string {
  // Sanitize filename - remove special characters, keep extension
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/_{2,}/g, '_');
  return `${userId}/${projectId}/${sanitized}`;
}

/**
 * Upload an original file to storage with progress tracking
 */
export async function uploadOriginalFile(
  file: File,
  userId: string,
  projectId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const supabase = createClient();
  const path = getStoragePath(userId, projectId, file.name);

  const { data, error } = await supabase.storage.from('originals').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Note: Supabase JS client doesn't support onUploadProgress directly
  // For large files, consider using tus-js-client or chunked uploads
  // For now, we report 100% on completion
  if (onProgress) {
    onProgress({ loaded: file.size, total: file.size, percentage: 100 });
  }

  return {
    path: data.path,
    fullPath: `originals/${data.path}`,
    metadata: {
      originalName: file.name,
      size: file.size,
      type: file.type,
    },
  };
}

/**
 * Upload a processed file (blob) to storage
 */
export async function uploadProcessedFile(
  blob: Blob,
  userId: string,
  projectId: string,
  filename: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const supabase = createClient();
  const path = getStoragePath(userId, projectId, filename);

  const { data, error } = await supabase.storage.from('processed').upload(path, blob, {
    cacheControl: '3600',
    upsert: true,
    contentType: blob.type,
  });

  if (error) {
    throw new Error(`Failed to upload processed file: ${error.message}`);
  }

  if (onProgress) {
    onProgress({ loaded: blob.size, total: blob.size, percentage: 100 });
  }

  return {
    path: data.path,
    fullPath: `processed/${data.path}`,
    metadata: {
      originalName: filename,
      size: blob.size,
      type: blob.type,
    },
  };
}

/**
 * Get a signed URL for downloading a file
 * @param bucket - 'originals' or 'processed'
 * @param path - The file path within the bucket
 * @param expiresIn - URL expiry time in seconds (default 1 hour)
 */
export async function getSignedUrl(
  bucket: StorageBucket,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to get signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Get a public URL for a file (only works if bucket is public)
 */
export function getPublicUrl(bucket: StorageBucket, path: string): string {
  const supabase = createClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a single file from storage
 */
export async function deleteFile(bucket: StorageBucket, path: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Delete all files for a project (both original and processed)
 */
export async function deleteProjectFiles(userId: string, projectId: string): Promise<void> {
  const supabase = createClient();
  const folderPath = `${userId}/${projectId}`;

  // List and delete files in originals bucket
  const { data: originalFiles } = await supabase.storage.from('originals').list(folderPath);

  if (originalFiles && originalFiles.length > 0) {
    const originalPaths = originalFiles.map(f => `${folderPath}/${f.name}`);
    await supabase.storage.from('originals').remove(originalPaths);
  }

  // List and delete files in processed bucket
  const { data: processedFiles } = await supabase.storage.from('processed').list(folderPath);

  if (processedFiles && processedFiles.length > 0) {
    const processedPaths = processedFiles.map(f => `${folderPath}/${f.name}`);
    await supabase.storage.from('processed').remove(processedPaths);
  }
}

/**
 * List files in a project folder
 */
export async function listProjectFiles(
  bucket: StorageBucket,
  userId: string,
  projectId: string
): Promise<{ name: string; size: number; createdAt: string }[]> {
  const supabase = createClient();
  const folderPath = `${userId}/${projectId}`;

  const { data, error } = await supabase.storage.from(bucket).list(folderPath);

  if (error) {
    throw new Error(`Failed to list files: ${error.message}`);
  }

  return (data || []).map(file => ({
    name: file.name,
    size: file.metadata?.size || 0,
    createdAt: file.created_at,
  }));
}

/**
 * Download a file as a Blob
 */
export async function downloadFile(bucket: StorageBucket, path: string): Promise<Blob> {
  const supabase = createClient();

  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error) {
    throw new Error(`Failed to download file: ${error.message}`);
  }

  return data;
}
