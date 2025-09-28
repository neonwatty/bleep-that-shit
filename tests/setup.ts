import '@testing-library/jest-dom';
import { vi } from 'vitest';

const OriginalFile = global.File;
const OriginalBlob = global.Blob;

class MockFile {
  private _data: ArrayBuffer;
  name: string;
  type: string;
  size: number;

  constructor(bits: any[], name: string, options?: any) {
    this.name = name;
    this.type = options?.type || '';
    if (bits[0] instanceof ArrayBuffer) {
      this._data = bits[0];
    } else {
      this._data = new ArrayBuffer(0);
    }
    this.size = this._data.byteLength;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this._data;
  }

  async text(): Promise<string> {
    const decoder = new TextDecoder();
    return decoder.decode(this._data);
  }
}

class MockBlob {
  private _data: ArrayBuffer;
  type: string;
  size: number;

  constructor(blobParts?: any[], options?: any) {
    this.type = options?.type || '';
    if (blobParts && blobParts[0] instanceof ArrayBuffer) {
      this._data = blobParts[0];
    } else {
      this._data = new ArrayBuffer(0);
    }
    this.size = this._data.byteLength;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this._data;
  }

  async text(): Promise<string> {
    const decoder = new TextDecoder();
    return decoder.decode(this._data);
  }
}

global.File = MockFile as any;
global.Blob = MockBlob as any;

class MockAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  duration: number;
  private channels: Float32Array[];

  constructor(options: { numberOfChannels: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels;
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.duration = this.length / this.sampleRate;
    this.channels = Array.from(
      { length: this.numberOfChannels },
      () => new Float32Array(this.length)
    );
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel];
  }

  copyToChannel(source: Float32Array, channelNumber: number, startInChannel = 0): void {
    const dest = this.channels[channelNumber];
    for (let i = 0; i < source.length; i++) {
      if (startInChannel + i < dest.length) {
        dest[startInChannel + i] = source[i];
      }
    }
  }
}

class MockAudioNode {
  connect() {
    return this;
  }
  disconnect() {}
}

class MockGainNode extends MockAudioNode {
  gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  };
}

class MockBufferSource extends MockAudioNode {
  buffer: MockAudioBuffer | null = null;
  loop = false;
  loopEnd = 0;
  start = vi.fn();
  stop = vi.fn();
}

class MockOfflineAudioContext {
  destination = new MockAudioNode();
  currentTime = 0;
  sampleRate: number;
  length: number;

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.length = length;
    this.sampleRate = sampleRate;
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): MockAudioBuffer {
    return new MockAudioBuffer({ numberOfChannels, length, sampleRate });
  }

  createBufferSource(): MockBufferSource {
    return new MockBufferSource();
  }

  createGain(): MockGainNode {
    return new MockGainNode();
  }

  async startRendering(): Promise<MockAudioBuffer> {
    return new MockAudioBuffer({
      numberOfChannels: 1,
      length: this.length,
      sampleRate: this.sampleRate,
    });
  }
}

class MockAudioContext {
  sampleRate = 44100;
  destination = new MockAudioNode();

  async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<MockAudioBuffer> {
    return new MockAudioBuffer({
      numberOfChannels: 2,
      length: arrayBuffer.byteLength / 4,
      sampleRate: this.sampleRate,
    });
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): MockAudioBuffer {
    return new MockAudioBuffer({ numberOfChannels, length, sampleRate });
  }

  createBufferSource(): MockBufferSource {
    return new MockBufferSource();
  }

  createGain(): MockGainNode {
    return new MockGainNode();
  }
}

global.AudioContext = MockAudioContext as any;
(global as any).webkitAudioContext = MockAudioContext;
global.OfflineAudioContext = MockOfflineAudioContext as any;

global.fetch = vi.fn((input: RequestInfo | URL) => {
  const url = typeof input === 'string' ? input : input.toString();
  if (url.includes('/bleeps/')) {
    const buffer = new ArrayBuffer(1000);
    return Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(buffer),
    } as Response);
  }
  return Promise.reject(new Error(`Unhandled fetch: ${url}`));
}) as any;

Object.defineProperty(window, 'location', {
  value: {
    pathname: '/',
    href: 'http://localhost:3000/',
  },
  writable: true,
});
