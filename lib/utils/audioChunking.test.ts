import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createAudioChunks,
  mergeChunkResults,
  applyVADToAudio,
  adjustTimestampsForVAD,
  estimateMemoryUsage,
  calculateOptimalChunkSize,
  checkMemoryUsage,
  formatTime
} from './audioChunking'
import { ChunkTranscriptionResult, VADSegment } from '../types/chunking'

describe('Audio Chunking Utilities', () => {
  describe('createAudioChunks', () => {
    it('should create correct number of chunks for audio data', () => {
      // Create 90 seconds of audio at 16kHz
      const sampleRate = 16000
      const durationSeconds = 90
      const audioData = new Float32Array(sampleRate * durationSeconds)
      
      const { chunks, stats } = createAudioChunks(audioData, sampleRate, {
        chunkLengthSeconds: 30,
        overlapSeconds: 5
      })
      
      // With 30s chunks and 5s overlap, 90s audio should create 4 chunks
      // 0-30, 25-55, 50-80, 75-90
      expect(chunks.length).toBe(4)
      expect(stats.totalDuration).toBe(90)
      expect(stats.totalChunks).toBe(4)
    })
    
    it('should handle audio shorter than chunk length', () => {
      const sampleRate = 16000
      const audioData = new Float32Array(sampleRate * 10) // 10 seconds
      
      const { chunks, stats } = createAudioChunks(audioData, sampleRate, {
        chunkLengthSeconds: 30,
        overlapSeconds: 5
      })
      
      expect(chunks.length).toBe(1)
      expect(chunks[0].isLastChunk).toBe(true)
      expect(chunks[0].startTime).toBe(0)
      expect(chunks[0].endTime).toBe(10)
    })
    
    it('should create chunks with correct overlap', () => {
      const sampleRate = 16000
      const audioData = new Float32Array(sampleRate * 60)
      
      const { chunks } = createAudioChunks(audioData, sampleRate, {
        chunkLengthSeconds: 30,
        overlapSeconds: 5
      })
      
      // First chunk should have no overlap at start
      expect(chunks[0].overlapStart).toBe(0)
      expect(chunks[0].overlapEnd).toBe(5)
      
      // Middle chunks should have overlap on both ends
      if (chunks.length > 2) {
        expect(chunks[1].overlapStart).toBe(5)
        expect(chunks[1].overlapEnd).toBe(5)
      }
      
      // Last chunk should have no overlap at end
      const lastChunk = chunks[chunks.length - 1]
      expect(lastChunk.overlapEnd).toBe(0)
      expect(lastChunk.isLastChunk).toBe(true)
    })
    
    it('should handle edge case of very small overlap', () => {
      const sampleRate = 16000
      const audioData = new Float32Array(sampleRate * 45)
      
      const { chunks } = createAudioChunks(audioData, sampleRate, {
        chunkLengthSeconds: 20,
        overlapSeconds: 1
      })
      
      // Verify chunks don't miss any samples
      let totalSamples = 0
      chunks.forEach(chunk => {
        expect(chunk.audioData.length).toBeGreaterThan(0)
        totalSamples += chunk.audioData.length
      })
      
      // Total samples with overlap should be more than original
      expect(totalSamples).toBeGreaterThanOrEqual(audioData.length)
    })
  })
  
  describe('mergeChunkResults', () => {
    it('should merge chunk results removing overlaps correctly', () => {
      const results: ChunkTranscriptionResult[] = [
        {
          chunkIndex: 0,
          text: 'Hello world',
          chunks: [
            { text: 'Hello', timestamp: [0, 0.5] },
            { text: 'world', timestamp: [0.5, 1] }
          ],
          chunkStartTime: 0,
          chunkEndTime: 30,
          processingTime: 100,
          hasSpeech: true
        },
        {
          chunkIndex: 1,
          text: 'from the second chunk',
          chunks: [
            { text: 'from', timestamp: [26, 26.5] }, // In overlap region
            { text: 'the', timestamp: [30.5, 31] },
            { text: 'second', timestamp: [31, 31.5] },
            { text: 'chunk', timestamp: [31.5, 32] }
          ],
          chunkStartTime: 25,
          chunkEndTime: 55,
          processingTime: 100,
          hasSpeech: true
        }
      ]
      
      const merged = mergeChunkResults(results, { overlapSeconds: 5 })
      
      // Should have words from both chunks minus overlap
      expect(merged.chunks.length).toBe(5) // Hello, world, the, second, chunk
      expect(merged.text).toContain('Hello world')
      expect(merged.text).toContain('the second chunk')
      expect(merged.text).not.toContain('from') // Should be filtered out
    })
    
    it('should handle chunks with no speech', () => {
      const results: ChunkTranscriptionResult[] = [
        {
          chunkIndex: 0,
          text: 'First chunk',
          chunks: [{ text: 'First', timestamp: [0, 0.5] }, { text: 'chunk', timestamp: [0.5, 1] }],
          chunkStartTime: 0,
          chunkEndTime: 30,
          processingTime: 100,
          hasSpeech: true
        },
        {
          chunkIndex: 1,
          text: '',
          chunks: [],
          chunkStartTime: 25,
          chunkEndTime: 55,
          processingTime: 100,
          hasSpeech: false
        },
        {
          chunkIndex: 2,
          text: 'Third chunk',
          chunks: [{ text: 'Third', timestamp: [55, 55.5] }, { text: 'chunk', timestamp: [55.5, 56] }],
          chunkStartTime: 50,
          chunkEndTime: 80,
          processingTime: 100,
          hasSpeech: true
        }
      ]
      
      const merged = mergeChunkResults(results)
      
      expect(merged.chunks.length).toBe(4)
      expect(merged.text).toBe('First chunk Third chunk')
    })
    
    it('should preserve correct timestamps after merging', () => {
      const results: ChunkTranscriptionResult[] = [
        {
          chunkIndex: 0,
          text: 'Test',
          chunks: [{ text: 'Test', timestamp: [10, 11] }],
          chunkStartTime: 0,
          chunkEndTime: 30,
          processingTime: 100,
          hasSpeech: true
        }
      ]
      
      const merged = mergeChunkResults(results)
      
      expect(merged.chunks[0].timestamp[0]).toBe(10)
      expect(merged.chunks[0].timestamp[1]).toBe(11)
    })
  })
  
  describe('applyVADToAudio', () => {
    it('should filter audio based on VAD segments', () => {
      const sampleRate = 16000
      const audioData = new Float32Array(sampleRate * 10) // 10 seconds
      audioData.fill(1.0) // Fill with non-zero values
      
      const vadSegments: VADSegment[] = [
        { start: 1, end: 3, confidence: 0.9 },
        { start: 5, end: 7, confidence: 0.8 }
      ]
      
      const { filteredAudio, mapping } = applyVADToAudio(audioData, vadSegments, sampleRate)
      
      // Should only keep 4 seconds of audio (2 + 2)
      expect(filteredAudio.length).toBe(sampleRate * 4)
      expect(mapping.length).toBe(2)
    })
    
    it('should return original audio when no VAD segments', () => {
      const sampleRate = 16000
      const audioData = new Float32Array(sampleRate * 5)
      
      const { filteredAudio, mapping } = applyVADToAudio(audioData, [], sampleRate)
      
      expect(filteredAudio).toBe(audioData)
      expect(mapping).toEqual([[0, 5]])
    })
    
    it('should handle adjacent VAD segments', () => {
      const sampleRate = 16000
      const audioData = new Float32Array(sampleRate * 10)
      
      const vadSegments: VADSegment[] = [
        { start: 1, end: 3, confidence: 0.9 },
        { start: 3, end: 5, confidence: 0.8 },
        { start: 5, end: 7, confidence: 0.7 }
      ]
      
      const { filteredAudio } = applyVADToAudio(audioData, vadSegments, sampleRate)
      
      // Should keep 6 seconds total (2 + 2 + 2)
      expect(filteredAudio.length).toBe(sampleRate * 6)
    })
  })
  
  describe('adjustTimestampsForVAD', () => {
    it('should adjust timestamps based on VAD mapping', () => {
      const chunks = [
        { text: 'Hello', timestamp: [0, 0.5] as [number, number] },
        { text: 'world', timestamp: [0.5, 1] as [number, number] },
        { text: 'test', timestamp: [2, 2.5] as [number, number] }
      ]
      
      const vadMapping: Array<[number, number]> = [
        [0, 1],   // Filtered time 0 maps to original time 1
        [2, 5]    // Filtered time 2 maps to original time 5
      ]
      
      const adjusted = adjustTimestampsForVAD(chunks, vadMapping)
      
      // First two words should be shifted by 1 second
      expect(adjusted[0].timestamp[0]).toBe(1)
      expect(adjusted[0].timestamp[1]).toBe(1.5)
      expect(adjusted[1].timestamp[0]).toBe(1.5)
      expect(adjusted[1].timestamp[1]).toBe(2)
      
      // Third word should be shifted to match second mapping
      expect(adjusted[2].timestamp[0]).toBe(5)
      expect(adjusted[2].timestamp[1]).toBe(5.5)
    })
  })
  
  describe('estimateMemoryUsage', () => {
    it('should estimate memory usage for audio processing', () => {
      const memoryMB = estimateMemoryUsage(60, 16000) // 1 minute at 16kHz
      
      // 60s * 16000 samples/s * 4 bytes/sample = 3.84MB for audio
      // Plus model (200MB) and overhead (100MB)
      expect(memoryMB).toBeGreaterThan(300)
      expect(memoryMB).toBeLessThan(320)
    })
    
    it('should scale linearly with audio length', () => {
      const memory1Min = estimateMemoryUsage(60)
      const memory2Min = estimateMemoryUsage(120)
      
      const audioDiff = (memory2Min - memory1Min)
      // The difference should be roughly the audio size difference
      expect(audioDiff).toBeCloseTo(3.66, 1) // ~3.66MB for 1 minute at 16kHz
    })
  })
  
  describe('calculateOptimalChunkSize', () => {
    it('should calculate chunk size based on available memory', () => {
      const chunkSize = calculateOptimalChunkSize(3600, 500) // 1 hour, 500MB available
      
      // With 500MB available, minus 300MB overhead = 200MB usable
      // At 16kHz, that's about 3276 seconds, but clamped to max 60
      expect(chunkSize).toBe(60)
    })
    
    it('should respect minimum chunk size', () => {
      const chunkSize = calculateOptimalChunkSize(3600, 350, {
        minChunkSeconds: 20,
        maxChunkSeconds: 60
      })
      
      // With only 50MB usable (350-300), should still return minimum
      expect(chunkSize).toBeGreaterThanOrEqual(20)
    })
    
    it('should respect maximum chunk size', () => {
      const chunkSize = calculateOptimalChunkSize(3600, 10000, {
        maxChunkSeconds: 45
      })
      
      expect(chunkSize).toBe(45)
    })
  })
  
  describe('checkMemoryUsage', () => {
    it('should return memory usage information', () => {
      const { usageMB, available } = checkMemoryUsage()
      
      expect(usageMB).toBeGreaterThanOrEqual(0)
      expect(typeof available).toBe('boolean')
    })
    
    it('should indicate availability based on threshold', () => {
      // Mock performance.memory
      const originalMemory = (performance as any).memory;
      (performance as any).memory = {
        usedJSHeapSize: 1900 * 1024 * 1024, // 1900MB used
        jsHeapSizeLimit: 2048 * 1024 * 1024  // 2048MB limit
      }
      
      const { available } = checkMemoryUsage()
      expect(available).toBe(false) // Less than 100MB free
      
      // Restore
      (performance as any).memory = originalMemory
    })
  })
  
  describe('formatTime', () => {
    it('should format seconds correctly', () => {
      expect(formatTime(45)).toBe('45s')
      expect(formatTime(0)).toBe('0s')
    })
    
    it('should format minutes correctly', () => {
      expect(formatTime(90)).toBe('1m 30s')
      expect(formatTime(120)).toBe('2m 0s')
    })
    
    it('should format hours correctly', () => {
      expect(formatTime(3661)).toBe('1h 1m 1s')
      expect(formatTime(7200)).toBe('2h 0m 0s')
    })
    
    it('should handle edge cases', () => {
      expect(formatTime(59)).toBe('59s')
      expect(formatTime(60)).toBe('1m 0s')
      expect(formatTime(3599)).toBe('59m 59s')
      expect(formatTime(3600)).toBe('1h 0m 0s')
    })
  })
})