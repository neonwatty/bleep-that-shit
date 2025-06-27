import { vi } from "vitest";

// Mock IndexedDB
class IDBRequest {
  constructor() {
    this.result = null;
    this.error = null;
    this.source = null;
    this.transaction = null;
    this.readyState = "pending";
  }
}

class IDBOpenDBRequest extends IDBRequest {
  constructor() {
    super();
    this.onupgradeneeded = null;
    this.onblocked = null;
  }
}

class IDBDatabase {
  constructor(name) {
    this.name = name;
    this.version = 1;
    this.objectStoreNames = [];
    this.onabort = null;
    this.onclose = null;
    this.onerror = null;
    this.onversionchange = null;
  }

  createObjectStore(name, options = {}) {
    this.objectStoreNames.push(name);
    return new IDBObjectStore(name, options);
  }

  transaction(storeNames, mode = "readonly") {
    return new IDBTransaction(this, storeNames, mode);
  }

  close() {}
}

class IDBObjectStore {
  constructor(name, options = {}) {
    this.name = name;
    this.keyPath = options.keyPath;
    this.autoIncrement = options.autoIncrement || false;
    this.indexNames = [];
  }

  put(value, key) {
    const request = new IDBRequest();
    Promise.resolve().then(() => {
      request.result = key;
      request.readyState = "done";
      if (request.onsuccess) request.onsuccess(new Event("success"));
    });
    return request;
  }

  get(key) {
    const request = new IDBRequest();
    Promise.resolve().then(() => {
      request.result = mockData.get(key) || null;
      request.readyState = "done";
      if (request.onsuccess) request.onsuccess(new Event("success"));
    });
    return request;
  }
}

class IDBTransaction {
  constructor(db, storeNames, mode) {
    this.db = db;
    this.mode = mode;
    this.objectStoreNames = storeNames;
    this.error = null;
    this.onabort = null;
    this.oncomplete = null;
    this.onerror = null;
  }

  objectStore(name) {
    return new IDBObjectStore(name);
  }
}

// Mock storage for data
const mockData = new Map();

const indexedDB = {
  open(name, version) {
    const request = new IDBOpenDBRequest();
    Promise.resolve().then(() => {
      request.result = new IDBDatabase(name);
      request.readyState = "done";
      if (request.onupgradeneeded) {
        request.onupgradeneeded(new Event("upgradeneeded"));
      }
      if (request.onsuccess) {
        request.onsuccess(new Event("success"));
      }
    });
    return request;
  },

  deleteDatabase(name) {
    const request = new IDBOpenDBRequest();
    Promise.resolve().then(() => {
      mockData.clear();
      request.readyState = "done";
      if (request.onsuccess) request.onsuccess(new Event("success"));
    });
    return request;
  },
};

// Mock Blob implementation
class MockBlob {
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
}

// Mock ReadableStream implementation
class MockReadableStream {
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
}

// Set up global mocks
global.Blob = MockBlob;
global.ReadableStream = MockReadableStream;

// Mock Headers
global.Headers = class MockHeaders extends Map {
  constructor(init = {}) {
    super();
    if (typeof init === "object") {
      Object.entries(init).forEach(([key, value]) => this.set(key, value));
    }
  }
};

// Mock Response
global.Response = class MockResponse {
  constructor(body, options = {}) {
    this.body = body;
    this.status = options.status || 200;
    this.statusText = options.statusText || "OK";
    this.headers = new Headers(options.headers || {});
    this._blob = body instanceof Blob ? body : new Blob([body]);
    this.ok = this.status >= 200 && this.status < 300;
  }

  async blob() {
    return this._blob;
  }

  async arrayBuffer() {
    return this._blob.arrayBuffer();
  }

  async text() {
    return this._blob.text();
  }
};

// Add to global scope
Object.defineProperty(global, "indexedDB", {
  value: indexedDB,
  writable: true,
});
