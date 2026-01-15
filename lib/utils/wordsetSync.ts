'use client';

import { db } from './db/wordsetDb';

const SYNC_COMPLETED_KEY = 'wordset_sync_completed';

/**
 * Check if wordsets have already been synced for this user
 */
export function hasSyncedWordsets(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  const syncedUsers = JSON.parse(localStorage.getItem(SYNC_COMPLETED_KEY) || '{}');
  return !!syncedUsers[userId];
}

/**
 * Mark wordsets as synced for this user
 */
function markSyncCompleted(userId: string): void {
  if (typeof window === 'undefined') return;
  const syncedUsers = JSON.parse(localStorage.getItem(SYNC_COMPLETED_KEY) || '{}');
  syncedUsers[userId] = Date.now();
  localStorage.setItem(SYNC_COMPLETED_KEY, JSON.stringify(syncedUsers));
}

/**
 * Sync local wordsets from IndexedDB to Supabase
 * This is called on first login to migrate existing local wordsets
 */
export async function syncLocalWordsetsToSupabase(userId: string): Promise<{
  synced: number;
  skipped: number;
  error?: string;
}> {
  // Skip if already synced
  if (hasSyncedWordsets(userId)) {
    return { synced: 0, skipped: 0 };
  }

  try {
    // Get all local wordsets (excluding system defaults)
    const localWordsets = await db.wordsets.filter(ws => !ws.isDefault).toArray();

    if (localWordsets.length === 0) {
      markSyncCompleted(userId);
      return { synced: 0, skipped: 0 };
    }

    // Fetch existing cloud wordsets to avoid duplicates
    const response = await fetch('/api/wordsets');
    if (!response.ok) {
      return { synced: 0, skipped: 0, error: 'Failed to fetch existing wordsets' };
    }

    const { wordsets: cloudWordsets } = await response.json();
    const cloudNames = new Set(cloudWordsets.map((ws: { name: string }) => ws.name.toLowerCase()));

    // Filter out wordsets that already exist in the cloud
    const wordsetsToSync = localWordsets.filter(ws => !cloudNames.has(ws.name.toLowerCase()));

    if (wordsetsToSync.length === 0) {
      markSyncCompleted(userId);
      return { synced: 0, skipped: localWordsets.length };
    }

    // Transform local wordsets to API format
    const wordsetPayload = wordsetsToSync.map(ws => ({
      name: ws.name,
      words: ws.words,
      color: ws.color || null,
      is_default: false,
    }));

    // Sync to cloud
    const syncResponse = await fetch('/api/wordsets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wordsets: wordsetPayload }),
    });

    if (!syncResponse.ok) {
      const data = await syncResponse.json();
      return { synced: 0, skipped: 0, error: data.error || 'Failed to sync wordsets' };
    }

    const { created } = await syncResponse.json();

    markSyncCompleted(userId);

    return {
      synced: created,
      skipped: localWordsets.length - wordsetsToSync.length,
    };
  } catch (error) {
    console.error('Error syncing wordsets:', error);
    return {
      synced: 0,
      skipped: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch wordsets from Supabase and merge into local IndexedDB
 * This keeps local and cloud wordsets in sync
 */
export async function fetchCloudWordsetsToLocal(): Promise<{
  fetched: number;
  error?: string;
}> {
  try {
    const response = await fetch('/api/wordsets');
    if (!response.ok) {
      return { fetched: 0, error: 'Failed to fetch wordsets' };
    }

    const { wordsets: cloudWordsets } = await response.json();

    if (!cloudWordsets || cloudWordsets.length === 0) {
      return { fetched: 0 };
    }

    // Get existing local wordsets (non-default)
    const localWordsets = await db.wordsets.filter(ws => !ws.isDefault).toArray();
    const localNames = new Set(localWordsets.map(ws => ws.name.toLowerCase()));

    // Add cloud wordsets that don't exist locally
    let fetched = 0;
    for (const cloudWs of cloudWordsets) {
      if (!localNames.has(cloudWs.name.toLowerCase())) {
        await db.wordsets.add({
          name: cloudWs.name,
          words: cloudWs.words,
          color: cloudWs.color || undefined,
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 1,
          isDefault: false,
          createdAt: new Date(cloudWs.created_at),
          updatedAt: new Date(cloudWs.updated_at),
        });
        fetched++;
      }
    }

    return { fetched };
  } catch (error) {
    console.error('Error fetching cloud wordsets:', error);
    return {
      fetched: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
