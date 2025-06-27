import { cacheModelFile, getCachedModelFile } from "./modelCache";

let statusCallback = null;
export function setCachedFetchStatusCallback(cb) {
  statusCallback = cb;
}

let lastSources = [];
export function resetCachedFetchSources() {
  lastSources = [];
}
export function getCachedFetchSourcesSummary() {
  const sources = lastSources.map((s) => s.source);
  if (sources.every((s) => s === "cache")) return "Loaded from cache";
  if (sources.every((s) => s === "network")) return "Downloaded from network";
  if (sources.length === 0) return "No files loaded";
  return "Partially cached";
}

export async function cachedFetch(url, options) {
  try {
    // Only cache GET requests for model files
    if (options && options.method && options.method !== "GET") {
      return fetch(url, options);
    }

    // Try to get from cache
    const cachedBlob = await getCachedModelFile(url);
    if (cachedBlob) {
      if (statusCallback) statusCallback("cache", url);
      lastSources.push({ source: "cache", url });
      // Return a Response object from the cached blob
      return new Response(cachedBlob);
    }

    // Not in cache, fetch from network
    if (statusCallback) statusCallback("network", url);
    lastSources.push({ source: "network", url });
    const response = await fetch(url, options);
    if (response.ok) {
      const blob = await response.blob();
      await cacheModelFile(url, blob);
      // Return a new Response so the body can be read again
      return new Response(blob, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } else {
      return response;
    }
  } catch (error) {
    if (statusCallback) statusCallback("error", url);
    throw error;
  }
}
