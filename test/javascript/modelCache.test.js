import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as modelCache from "../../app/javascript/utils/modelCache";
import {
  cachedFetch,
  setCachedFetchStatusCallback,
  resetCachedFetchSources,
  getCachedFetchSourcesSummary,
} from "../../app/javascript/utils/cachedFetch";

// Mock Blob if needed
if (typeof Blob === "undefined") {
  global.Blob = class MockBlob {
    constructor(parts, options = {}) {
      this._parts = parts;
      this._type = options.type || "";
      this._size = parts.reduce((total, part) => total + (part.length || 0), 0);
    }

    get size() {
      return this._size;
    }

    get type() {
      return this._type;
    }

    slice(start, end, contentType) {
      return new MockBlob(this._parts, { type: contentType || this._type });
    }

    async arrayBuffer() {
      const totalLength = this._parts.reduce(
        (total, part) => total + part.length,
        0
      );
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const part of this._parts) {
        result.set(part, offset);
        offset += part.length;
      }
      return result.buffer;
    }

    async text() {
      return this._parts.join("");
    }

    stream() {
      return new ReadableStream({
        start: (controller) => {
          this._parts.forEach((part) => controller.enqueue(part));
          controller.close();
        },
      });
    }
  };
}

// Mock ReadableStream if not available in test environment
if (typeof ReadableStream === "undefined") {
  global.ReadableStream = class MockReadableStream {
    constructor(source) {
      this._source = source;
      this._controller = null;
    }

    getReader() {
      return {
        read: async () => {
          if (this._source && this._source.start) {
            if (!this._controller) {
              this._controller = {
                enqueue: (chunk) => ({ value: chunk, done: false }),
                close: () => ({ done: true }),
              };
              await this._source.start(this._controller);
            }
          }
          return { done: true };
        },
        releaseLock: () => {},
      };
    }
  };
}

// Mock storage using a Map
const mockStorage = new Map();

// Mock status callback
const mockStatusCallback = vi.fn();

describe("Model Caching System", () => {
  beforeEach(() => {
    // Clear mocks and storage before each test
    mockStorage.clear();
    mockStatusCallback.mockClear();
    vi.clearAllMocks();

    // Set up status callback
    setCachedFetchStatusCallback(mockStatusCallback);
    resetCachedFetchSources();

    // Mock the modelCache functions
    vi.spyOn(modelCache, "cacheModelFile").mockImplementation(
      async (url, blob) => {
        mockStorage.set(url, blob);
      }
    );

    vi.spyOn(modelCache, "getCachedModelFile").mockImplementation(
      async (url) => {
        return mockStorage.get(url) || null;
      }
    );

    // Mock global fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should cache model files and retrieve them correctly", async () => {
    const testUrl = "https://example.com/model.onnx";
    const testData = new Uint8Array([1, 2, 3, 4]);
    const testBlob = new Blob([testData], { type: "application/octet-stream" });

    await modelCache.cacheModelFile(testUrl, testBlob);
    const result = await modelCache.getCachedModelFile(testUrl);

    expect(result).toBeDefined();
    const resultBuffer = await result.arrayBuffer();
    const resultArray = new Uint8Array(resultBuffer);
    expect(Array.from(resultArray)).toEqual(Array.from(testData));
  });

  it("should handle cachedFetch correctly for both network and cache scenarios", async () => {
    const testUrl = "https://example.com/model.onnx";
    const testData = new Uint8Array([1, 2, 3, 4]);
    const testBlob = new Blob([testData], { type: "application/octet-stream" });

    // First request - from network
    global.fetch.mockResolvedValueOnce(
      new Response(testBlob, {
        status: 200,
        statusText: "OK",
        headers: { "Content-Type": "application/octet-stream" },
      })
    );

    const result1 = await cachedFetch(testUrl);
    const buffer1 = await result1.arrayBuffer();
    const data1 = new Uint8Array(buffer1);
    expect(Array.from(data1)).toEqual(Array.from(testData));
    expect(mockStatusCallback).toHaveBeenCalledWith("network", testUrl);

    // Second request - from cache
    mockStatusCallback.mockClear();
    const result2 = await cachedFetch(testUrl);
    const buffer2 = await result2.arrayBuffer();
    const data2 = new Uint8Array(buffer2);
    expect(Array.from(data2)).toEqual(Array.from(testData));
    expect(mockStatusCallback).toHaveBeenCalledWith("cache", testUrl);
  });

  it("should handle non-GET requests by passing through to fetch", async () => {
    const testUrl = "https://example.com/model.onnx";
    const options = { method: "POST", body: "test" };
    const mockResponse = new Response("success", { status: 200 });

    global.fetch.mockResolvedValueOnce(mockResponse);

    const result = await cachedFetch(testUrl, options);
    expect(result).toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(testUrl, options);
    expect(mockStatusCallback).not.toHaveBeenCalled();
  });

  it("should handle network errors gracefully", async () => {
    const testUrl = "https://example.com/model.onnx";
    const networkError = new Error("Network error");
    networkError.name = "NetworkError";

    // Reset status callback mock
    mockStatusCallback.mockClear();

    // Mock a network error
    global.fetch.mockRejectedValueOnce(networkError);

    // Test that the error is thrown
    await expect(cachedFetch(testUrl)).rejects.toThrow("Network error");

    // Verify callbacks were called in correct order
    expect(mockStatusCallback).toHaveBeenCalledTimes(2);
    expect(mockStatusCallback.mock.calls[0]).toEqual(["network", testUrl]);
    expect(mockStatusCallback.mock.calls[1]).toEqual(["error", testUrl]);

    // Verify no caching occurred
    expect(modelCache.cacheModelFile).not.toHaveBeenCalled();
    expect(mockStorage.size).toBe(0);
  });

  it("should handle multiple files with mixed sources correctly", async () => {
    const url1 = "https://example.com/model1.onnx";
    const url2 = "https://example.com/model2.onnx";
    const testData1 = new Uint8Array([1, 2, 3]);
    const testData2 = new Uint8Array([4, 5, 6]);
    const blob1 = new Blob([testData1], { type: "application/octet-stream" });
    const blob2 = new Blob([testData2], { type: "application/octet-stream" });

    // Cache first file
    await modelCache.cacheModelFile(url1, blob1);

    // Mock network fetch for second file
    global.fetch.mockResolvedValueOnce(
      new Response(blob2, {
        status: 200,
        statusText: "OK",
        headers: { "Content-Type": "application/octet-stream" },
      })
    );

    // Reset status callback
    mockStatusCallback.mockClear();

    // Fetch both files
    const [result1, result2] = await Promise.all([
      cachedFetch(url1),
      cachedFetch(url2),
    ]);

    // Verify results
    const buffer1 = await result1.arrayBuffer();
    const buffer2 = await result2.arrayBuffer();
    const data1 = new Uint8Array(buffer1);
    const data2 = new Uint8Array(buffer2);

    expect(Array.from(data1)).toEqual(Array.from(testData1));
    expect(Array.from(data2)).toEqual(Array.from(testData2));

    // Verify status callback calls
    expect(mockStatusCallback).toHaveBeenCalledTimes(2);
    expect(mockStatusCallback.mock.calls[0]).toEqual(["cache", url1]);
    expect(mockStatusCallback.mock.calls[1]).toEqual(["network", url2]);
  });
});
