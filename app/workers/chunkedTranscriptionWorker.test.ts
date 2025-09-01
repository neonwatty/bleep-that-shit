import { describe, it, expect, vi } from 'vitest'
import type { ChunkedWorkerMessage, ChunkedWorkerResponse, AudioChunk } from '@/lib/types/chunking'

// Since workers run in a different context and require a browser environment,
// we'll focus on testing the message structure and types rather than the actual worker execution

describe('Chunked Transcription Worker Types', () => {
  describe('Message Types', () => {
    it('should create valid initialize message', () => {
      const message: ChunkedWorkerMessage = {
        type: 'initialize',
        config: {
          chunkLengthSeconds: 30,
          overlapSeconds: 5,
          enableVAD: true,
          vadThreshold: 0.5,
          maxMemoryMB: 2048,
          enableProgressiveResults: true,
          workerPoolSize: 1,
          minChunkSeconds: 10,
          maxChunkSeconds: 60
        }
      }
      
      expect(message.type).toBe('initialize')
      expect(message.config.chunkLengthSeconds).toBe(30)
    })
    
    it('should create valid processChunk message', () => {
      const chunk: AudioChunk = {
        index: 0,
        startTime: 0,
        endTime: 30,
        audioData: new Float32Array(480000),
        isLastChunk: false,
        overlapStart: 0,
        overlapEnd: 5
      }
      
      const message: ChunkedWorkerMessage = {
        type: 'processChunk',
        chunk,
        model: 'Xenova/whisper-tiny.en',
        language: 'en'
      }
      
      expect(message.type).toBe('processChunk')
      expect(message.chunk.index).toBe(0)
      expect(message.model).toContain('whisper')
    })
    
    it('should create valid cancel message', () => {
      const message: ChunkedWorkerMessage = {
        type: 'cancel'
      }
      
      expect(message.type).toBe('cancel')
    })
    
    it('should create valid getMemoryUsage message', () => {
      const message: ChunkedWorkerMessage = {
        type: 'getMemoryUsage'
      }
      
      expect(message.type).toBe('getMemoryUsage')
    })
  })
  
  describe('Response Types', () => {
    it('should create valid initialized response', () => {
      const response: ChunkedWorkerResponse = {
        type: 'initialized',
        stats: {
          totalDuration: 120,
          speechDuration: 110,
          totalChunks: 4,
          averageChunkSize: 30,
          silenceRemoved: 10,
          estimatedProcessingTime: 20
        }
      }
      
      expect(response.type).toBe('initialized')
      if (response.type === 'initialized') {
        expect(response.stats.totalDuration).toBe(120)
        expect(response.stats.totalChunks).toBe(4)
      }
    })
    
    it('should create valid chunkComplete response', () => {
      const response: ChunkedWorkerResponse = {
        type: 'chunkComplete',
        result: {
          chunkIndex: 0,
          text: 'Transcribed text',
          chunks: [
            { text: 'Transcribed', timestamp: [0, 0.8] },
            { text: 'text', timestamp: [0.8, 1.2] }
          ],
          chunkStartTime: 0,
          chunkEndTime: 30,
          processingTime: 1500,
          hasSpeech: true
        }
      }
      
      expect(response.type).toBe('chunkComplete')
      if (response.type === 'chunkComplete') {
        expect(response.result.chunkIndex).toBe(0)
        expect(response.result.text).toContain('Transcribed')
      }
    })
    
    it('should create valid progress response', () => {
      const response: ChunkedWorkerResponse = {
        type: 'progress',
        progress: {
          currentChunk: 1,
          totalChunks: 5,
          overallProgress: 40,
          estimatedTimeRemaining: 60,
          status: 'Processing chunk 2 of 5',
          chunksCompleted: 1,
          memoryUsageMB: 450,
          partialResult: {
            text: 'Partial result',
            chunks: []
          }
        }
      }
      
      expect(response.type).toBe('progress')
      if (response.type === 'progress') {
        expect(response.progress.currentChunk).toBe(1)
        expect(response.progress.overallProgress).toBe(40)
      }
    })
    
    it('should create valid error response', () => {
      const response: ChunkedWorkerResponse = {
        type: 'error',
        error: 'Failed to process chunk',
        details: 'Out of memory'
      }
      
      expect(response.type).toBe('error')
      if (response.type === 'error') {
        expect(response.error).toContain('Failed')
        expect(response.details).toContain('memory')
      }
    })
    
    it('should create valid cancelled response', () => {
      const response: ChunkedWorkerResponse = {
        type: 'cancelled'
      }
      
      expect(response.type).toBe('cancelled')
    })
    
    it('should create valid memoryUsage response', () => {
      const response: ChunkedWorkerResponse = {
        type: 'memoryUsage',
        usageMB: 512.5
      }
      
      expect(response.type).toBe('memoryUsage')
      if (response.type === 'memoryUsage') {
        expect(response.usageMB).toBeGreaterThan(0)
      }
    })
  })
  
  describe('Legacy Message Support', () => {
    it('should support legacy transcribe message format', () => {
      const legacyMessage = {
        type: 'transcribe',
        audioData: new Float32Array(160000),
        model: 'Xenova/whisper-tiny.en',
        language: 'en',
        fileType: 'audio/mp3'
      }
      
      expect(legacyMessage.type).toBe('transcribe')
      expect(legacyMessage.audioData).toBeInstanceOf(Float32Array)
    })
    
    it('should support legacy extract message format', () => {
      const extractMessage = {
        type: 'extract',
        fileBuffer: new ArrayBuffer(1024),
        fileType: 'video/mp4'
      }
      
      expect(extractMessage.type).toBe('extract')
      expect(extractMessage.fileBuffer).toBeInstanceOf(ArrayBuffer)
    })
    
    it('should support processAudio message format', () => {
      const processMessage = {
        type: 'processAudio',
        audioData: new Float32Array(480000),
        model: 'Xenova/whisper-tiny.en',
        language: 'en',
        config: {
          chunkLengthSeconds: 30,
          overlapSeconds: 5,
          enableProgressiveResults: true
        }
      }
      
      expect(processMessage.type).toBe('processAudio')
      expect(processMessage.config.chunkLengthSeconds).toBe(30)
    })
  })
})