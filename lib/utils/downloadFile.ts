/**
 * Check if running in a Capacitor native environment (iOS/Android app)
 */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  // Check for Capacitor native platform
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  return win.Capacitor?.isNativePlatform?.() === true;
}

/**
 * Check if the Web Share API is available and supports files
 */
function canUseWebShare(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator;
}

/**
 * Downloads a file using the best available method:
 * - Web Share API (iOS Safari, modern browsers)
 * - Standard anchor download (desktop browsers)
 */
export async function downloadFile(
  blobUrl: string,
  filename: string,
  mimeType: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Fetch the blob from the URL
    const response = await fetch(blobUrl);
    const blob = await response.blob();

    // Try Web Share API first (works great on iOS)
    if (canUseWebShare()) {
      const file = new File([blob], filename, { type: mimeType });
      const shareData = { files: [file] };

      if (navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return {
            success: true,
            message: '✅ Shared successfully! Choose "Save Video" to save to Photos.',
          };
        } catch (shareError) {
          // User cancelled or share failed, fall through to alternative
          if ((shareError as Error).name === 'AbortError') {
            return { success: true, message: 'Share cancelled' };
          }
        }
      }
    }

    // Fallback: Standard download link
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // On iOS native app, anchor downloads don't work well
    if (isNativeApp()) {
      return {
        success: true,
        message: '💡 Tip: Long-press the video above and select "Save to Photos" to save it.',
      };
    }

    return { success: true, message: '✅ Download started' };
  } catch (error) {
    console.error('Download failed:', error);
    return {
      success: false,
      message: `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
