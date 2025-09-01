// Test setup file for Vitest
import { vi } from 'vitest'

// Mock Web Audio API
global.AudioContext = vi.fn().mockImplementation(() => ({
  sampleRate: 48000,
  createBuffer: vi.fn(),
  createBufferSource: vi.fn(),
  createGain: vi.fn(),
  decodeAudioData: vi.fn()
})) as any

global.OfflineAudioContext = vi.fn().mockImplementation(() => ({
  sampleRate: 48000,
  createBuffer: vi.fn(),
  createBufferSource: vi.fn(),
  createGain: vi.fn(),
  startRendering: vi.fn()
})) as any

// Mock performance.memory if not available
if (!('memory' in performance)) {
  Object.defineProperty(performance, 'memory', {
    value: {
      usedJSHeapSize: 100 * 1024 * 1024,
      totalJSHeapSize: 512 * 1024 * 1024,
      jsHeapSizeLimit: 2048 * 1024 * 1024
    },
    writable: true
  })
}