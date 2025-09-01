import { describe, it, expect } from 'vitest'
import { DEFAULT_CHUNKING_CONFIG } from './chunking'
import type { 
  ChunkingConfig, 
  AudioChunk, 
  ChunkTranscriptionResult,
  TranscriptionProgress,
  VADSegment,
  ChunkingStats
} from './chunking'

describe('Chunking Types and Configuration', () => {
  describe('DEFAULT_CHUNKING_CONFIG', () => {
    it('should have valid default configuration values', () => {
      expect(DEFAULT_CHUNKING_CONFIG.chunkLengthSeconds).toBe(30)
      expect(DEFAULT_CHUNKING_CONFIG.overlapSeconds).toBe(5)
      expect(DEFAULT_CHUNKING_CONFIG.enableVAD).toBe(true)
      expect(DEFAULT_CHUNKING_CONFIG.vadThreshold).toBe(0.5)
      expect(DEFAULT_CHUNKING_CONFIG.maxMemoryMB).toBe(2048)
      expect(DEFAULT_CHUNKING_CONFIG.enableProgressiveResults).toBe(true)
      expect(DEFAULT_CHUNKING_CONFIG.workerPoolSize).toBe(1)
      expect(DEFAULT_CHUNKING_CONFIG.minChunkSeconds).toBe(10)
      expect(DEFAULT_CHUNKING_CONFIG.maxChunkSeconds).toBe(60)
    })
    
    it('should have overlap less than chunk length', () => {
      expect(DEFAULT_CHUNKING_CONFIG.overlapSeconds).toBeLessThan(
        DEFAULT_CHUNKING_CONFIG.chunkLengthSeconds
      )
    })
    
    it('should have valid memory limit', () => {
      expect(DEFAULT_CHUNKING_CONFIG.maxMemoryMB).toBeGreaterThan(256)
      expect(DEFAULT_CHUNKING_CONFIG.maxMemoryMB).toBeLessThanOrEqual(8192)
    })
    
    it('should have valid VAD threshold', () => {
      expect(DEFAULT_CHUNKING_CONFIG.vadThreshold).toBeGreaterThanOrEqual(0)
      expect(DEFAULT_CHUNKING_CONFIG.vadThreshold).toBeLessThanOrEqual(1)
    })
  })
  
  describe('Type Structure Validation', () => {
    it('should create valid AudioChunk object', () => {
      const chunk: AudioChunk = {
        index: 0,
        startTime: 0,
        endTime: 30,
        audioData: new Float32Array(480000),
        isLastChunk: false,
        overlapStart: 0,
        overlapEnd: 5
      }
      
      expect(chunk.index).toBeTypeOf('number')
      expect(chunk.startTime).toBeLessThan(chunk.endTime)
      expect(chunk.audioData).toBeInstanceOf(Float32Array)
      expect(chunk.isLastChunk).toBeTypeOf('boolean')
      expect(chunk.overlapStart).toBeGreaterThanOrEqual(0)
      expect(chunk.overlapEnd).toBeGreaterThanOrEqual(0)
    })
    
    it('should create valid ChunkTranscriptionResult', () => {
      const result: ChunkTranscriptionResult = {
        chunkIndex: 0,
        text: 'Test transcription',
        chunks: [
          { text: 'Test', timestamp: [0, 0.5] },
          { text: 'transcription', timestamp: [0.5, 1.2] }
        ],
        chunkStartTime: 0,
        chunkEndTime: 30,
        processingTime: 1500,
        hasSpeech: true
      }
      
      expect(result.chunkIndex).toBeGreaterThanOrEqual(0)
      expect(result.text).toBeTypeOf('string')
      expect(result.chunks).toBeInstanceOf(Array)
      expect(result.chunks[0].timestamp[0]).toBeLessThanOrEqual(result.chunks[0].timestamp[1])
      expect(result.processingTime).toBeGreaterThan(0)
      expect(result.hasSpeech).toBeTypeOf('boolean')
    })
    
    it('should create valid TranscriptionProgress', () => {
      const progress: TranscriptionProgress = {
        currentChunk: 2,
        totalChunks: 10,
        overallProgress: 25,
        estimatedTimeRemaining: 120,
        status: 'Processing chunk 3 of 10',
        chunksCompleted: 2,
        memoryUsageMB: 512,
        partialResult: {
          text: 'Partial text',
          chunks: []
        }
      }
      
      expect(progress.currentChunk).toBeLessThan(progress.totalChunks)
      expect(progress.overallProgress).toBeGreaterThanOrEqual(0)
      expect(progress.overallProgress).toBeLessThanOrEqual(100)
      expect(progress.estimatedTimeRemaining).toBeGreaterThanOrEqual(0)
      expect(progress.status).toBeTypeOf('string')
      expect(progress.chunksCompleted).toBeLessThanOrEqual(progress.totalChunks)
      expect(progress.memoryUsageMB).toBeGreaterThan(0)
    })
    
    it('should create valid VADSegment', () => {
      const segment: VADSegment = {
        start: 10.5,
        end: 25.3,
        confidence: 0.95
      }
      
      expect(segment.start).toBeLessThan(segment.end)
      expect(segment.confidence).toBeGreaterThanOrEqual(0)
      expect(segment.confidence).toBeLessThanOrEqual(1)
    })
    
    it('should create valid ChunkingStats', () => {
      const stats: ChunkingStats = {
        totalDuration: 180,
        speechDuration: 150,
        totalChunks: 6,
        averageChunkSize: 30,
        silenceRemoved: 30,
        estimatedProcessingTime: 30
      }
      
      expect(stats.speechDuration).toBeLessThanOrEqual(stats.totalDuration)
      expect(stats.totalChunks).toBeGreaterThan(0)
      expect(stats.averageChunkSize).toBeGreaterThan(0)
      expect(stats.silenceRemoved).toBeGreaterThanOrEqual(0)
      expect(stats.silenceRemoved).toBeLessThanOrEqual(stats.totalDuration)
      expect(stats.estimatedProcessingTime).toBeGreaterThan(0)
    })
  })
  
  describe('Configuration Constraints', () => {
    it('should validate chunk size constraints', () => {
      const config: ChunkingConfig = {
        ...DEFAULT_CHUNKING_CONFIG,
        chunkLengthSeconds: 45,
        minChunkSeconds: 10,
        maxChunkSeconds: 60
      }
      
      expect(config.chunkLengthSeconds).toBeGreaterThanOrEqual(config.minChunkSeconds)
      expect(config.chunkLengthSeconds).toBeLessThanOrEqual(config.maxChunkSeconds)
    })
    
    it('should ensure overlap is less than chunk length', () => {
      const config: ChunkingConfig = {
        ...DEFAULT_CHUNKING_CONFIG,
        chunkLengthSeconds: 20,
        overlapSeconds: 3
      }
      
      expect(config.overlapSeconds).toBeLessThan(config.chunkLengthSeconds / 2)
    })
    
    it('should have positive worker pool size', () => {
      const config: ChunkingConfig = {
        ...DEFAULT_CHUNKING_CONFIG,
        workerPoolSize: 4
      }
      
      expect(config.workerPoolSize).toBeGreaterThan(0)
      expect(config.workerPoolSize).toBeLessThanOrEqual(8) // Reasonable upper limit
    })
  })
  
  describe('Edge Cases', () => {
    it('should handle minimal configuration', () => {
      const minimalConfig: Partial<ChunkingConfig> = {
        chunkLengthSeconds: 10,
        overlapSeconds: 0
      }
      
      const merged = { ...DEFAULT_CHUNKING_CONFIG, ...minimalConfig }
      
      expect(merged.chunkLengthSeconds).toBe(10)
      expect(merged.overlapSeconds).toBe(0)
      expect(merged.enableVAD).toBe(true) // Should preserve defaults
    })
    
    it('should handle chunks with no transcription', () => {
      const emptyResult: ChunkTranscriptionResult = {
        chunkIndex: 0,
        text: '',
        chunks: [],
        chunkStartTime: 0,
        chunkEndTime: 30,
        processingTime: 500,
        hasSpeech: false
      }
      
      expect(emptyResult.text).toBe('')
      expect(emptyResult.chunks).toHaveLength(0)
      expect(emptyResult.hasSpeech).toBe(false)
    })
    
    it('should handle progress at boundaries', () => {
      const startProgress: TranscriptionProgress = {
        currentChunk: 0,
        totalChunks: 5,
        overallProgress: 0,
        estimatedTimeRemaining: 100,
        status: 'Starting',
        chunksCompleted: 0,
        memoryUsageMB: 100
      }
      
      const endProgress: TranscriptionProgress = {
        currentChunk: 4,
        totalChunks: 5,
        overallProgress: 100,
        estimatedTimeRemaining: 0,
        status: 'Complete',
        chunksCompleted: 5,
        memoryUsageMB: 150
      }
      
      expect(startProgress.overallProgress).toBe(0)
      expect(endProgress.overallProgress).toBe(100)
      expect(endProgress.estimatedTimeRemaining).toBe(0)
    })
  })
})