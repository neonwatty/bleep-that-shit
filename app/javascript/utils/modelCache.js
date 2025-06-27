import Dexie from "dexie";

// Set up the IndexedDB database
const db = new Dexie("ModelCacheDB");
db.version(1).stores({
  files: "url", // Use the file URL as the primary key
});

// Store a blob by URL
export async function cacheModelFile(url, blob) {
  await db.files.put({ url, blob });
}

// Retrieve a blob by URL
export async function getCachedModelFile(url) {
  const entry = await db.files.get(url);
  return entry ? entry.blob : null;
}
