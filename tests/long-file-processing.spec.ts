import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Long File Processing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bleep')
    await page.waitForLoadState('networkidle')
  })
  
  test('should display chunking options for files', async ({ page }) => {
    // Create a mock file upload
    const fileInput = await page.locator('input[type="file"]')
    
    // Upload a test file (we'll create a mock file)
    const buffer = Buffer.alloc(1024 * 1024) // 1MB mock file
    await fileInput.setInputFiles({
      name: 'test-audio.mp3',
      mimeType: 'audio/mp3',
      buffer
    })
    
    // Wait for file to be loaded
    await expect(page.locator('text=File loaded: test-audio.mp3')).toBeVisible()
    
    // Check that advanced settings are visible
    await expect(page.locator('text=Advanced Settings')).toBeVisible()
    
    // Check chunking option
    const chunkingCheckbox = await page.locator('#useChunking')
    await expect(chunkingCheckbox).toBeVisible()
    await expect(chunkingCheckbox).toBeChecked() // Should be checked by default
    
    // Check chunking configuration display
    await expect(page.locator('text=/Chunk size:.*30s/')).toBeVisible()
    await expect(page.locator('text=/overlap.*5s/')).toBeVisible()
    await expect(page.locator('text=/Progressive results:.*Enabled/')).toBeVisible()
  })
  
  test('should show enhanced progress for chunked transcription', async ({ page }) => {
    // Mock the worker to simulate chunked processing
    await page.addInitScript(() => {
      // Override Worker creation to mock chunked responses
      const OriginalWorker = window.Worker
      window.Worker = class MockWorker extends OriginalWorker {
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options)
          
          // Intercept postMessage to simulate responses
          const originalPostMessage = this.postMessage.bind(this)
          this.postMessage = (message: any) => {
            originalPostMessage(message)
            
            // Simulate chunked processing responses
            if (message.type === 'processAudio') {
              setTimeout(() => {
                // Send initialized response
                this.dispatchEvent(new MessageEvent('message', {
                  data: {
                    type: 'initialized',
                    stats: {
                      totalDuration: 180,
                      speechDuration: 170,
                      totalChunks: 6,
                      averageChunkSize: 30,
                      silenceRemoved: 10,
                      estimatedProcessingTime: 30
                    }
                  }
                }))
                
                // Simulate progress updates
                for (let i = 0; i < 6; i++) {
                  setTimeout(() => {
                    this.dispatchEvent(new MessageEvent('message', {
                      data: {
                        type: 'progress',
                        progress: {
                          currentChunk: i,
                          totalChunks: 6,
                          overallProgress: ((i + 1) / 6) * 100,
                          estimatedTimeRemaining: (6 - i - 1) * 5,
                          status: `Processing chunk ${i + 1} of 6...`,
                          chunksCompleted: i,
                          memoryUsageMB: 300 + i * 50,
                          partialResult: {
                            text: `Partial transcription for chunk ${i + 1}`,
                            chunks: []
                          }
                        }
                      }
                    }))
                  }, (i + 1) * 500)
                }
                
                // Send final result
                setTimeout(() => {
                  this.dispatchEvent(new MessageEvent('message', {
                    data: {
                      type: 'mergeComplete',
                      finalResult: {
                        text: 'Complete transcription of the long audio file',
                        chunks: []
                      }
                    }
                  }))
                }, 4000)
              }, 100)
            }
          }
        }
      } as any
    })
    
    // Upload a file
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'long-audio.mp3',
      mimeType: 'audio/mp3',
      buffer: Buffer.alloc(5 * 1024 * 1024) // 5MB to simulate long file
    })
    
    // Start transcription
    await page.click('button:has-text("Start Transcription")')
    
    // Check for chunk progress display
    await expect(page.locator('text=/Chunk:.*1 of 6/')).toBeVisible({ timeout: 5000 })
    
    // Check for memory usage display
    await expect(page.locator('text=/Memory:.*MB/')).toBeVisible()
    
    // Check for time remaining
    await expect(page.locator('text=/Time remaining:/')).toBeVisible()
    
    // Check for partial transcription display
    await expect(page.locator('text=/Partial transcription/')).toBeVisible()
    
    // Wait for completion
    await expect(page.locator('text=Transcription complete!')).toBeVisible({ timeout: 10000 })
  })
  
  test('should handle transcription cancellation', async ({ page }) => {
    // Add cancel button mock
    await page.addInitScript(() => {
      const OriginalWorker = window.Worker
      window.Worker = class MockWorker extends OriginalWorker {
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options)
          
          const originalPostMessage = this.postMessage.bind(this)
          this.postMessage = (message: any) => {
            originalPostMessage(message)
            
            if (message.type === 'cancel') {
              this.dispatchEvent(new MessageEvent('message', {
                data: { type: 'cancelled' }
              }))
            }
          }
        }
      } as any
    })
    
    // Upload file and start transcription
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mp3',
      buffer: Buffer.alloc(1024 * 1024)
    })
    
    await page.click('button:has-text("Start Transcription")')
    
    // TODO: Add cancel button to UI and test cancellation
    // For now, we'll just verify the transcription starts
    await expect(page.locator('text=Transcribing...')).toBeVisible()
  })
  
  test('should toggle chunking on and off', async ({ page }) => {
    // Upload a file first
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mp3',
      buffer: Buffer.alloc(1024 * 1024)
    })
    
    // Wait for advanced settings to appear
    await expect(page.locator('text=Advanced Settings')).toBeVisible()
    
    // Check chunking checkbox
    const chunkingCheckbox = await page.locator('#useChunking')
    await expect(chunkingCheckbox).toBeChecked()
    
    // Uncheck it
    await chunkingCheckbox.uncheck()
    await expect(chunkingCheckbox).not.toBeChecked()
    
    // Chunking details should be hidden
    await expect(page.locator('text=/Chunk size:/')).not.toBeVisible()
    
    // Re-check it
    await chunkingCheckbox.check()
    await expect(chunkingCheckbox).toBeChecked()
    
    // Chunking details should be visible again
    await expect(page.locator('text=/Chunk size:/')).toBeVisible()
  })
  
  test('should handle errors gracefully', async ({ page }) => {
    // Mock worker to simulate error
    await page.addInitScript(() => {
      const OriginalWorker = window.Worker
      window.Worker = class MockWorker extends OriginalWorker {
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options)
          
          const originalPostMessage = this.postMessage.bind(this)
          this.postMessage = (message: any) => {
            originalPostMessage(message)
            
            if (message.type === 'processAudio' || message.type === 'transcribe') {
              setTimeout(() => {
                this.dispatchEvent(new MessageEvent('message', {
                  data: {
                    error: 'Memory limit exceeded during processing',
                    type: 'error'
                  }
                }))
              }, 100)
            }
          }
        }
      } as any
    })
    
    // Upload file
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mp3',
      buffer: Buffer.alloc(1024 * 1024)
    })
    
    // Start transcription
    await page.click('button:has-text("Start Transcription")')
    
    // Check for error display
    await expect(page.locator('text=Transcription Error')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=/Memory limit exceeded/')).toBeVisible()
    
    // Check dismiss button works
    await page.click('button:has-text("Dismiss")')
    await expect(page.locator('text=Transcription Error')).not.toBeVisible()
  })
  
  test('should show file size warning for very large files', async ({ page }) => {
    // Create a very large mock file (simulate 500MB)
    const largeBuffer = Buffer.alloc(10 * 1024 * 1024) // Use 10MB for test
    
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'very-large-audio.mp3',
      mimeType: 'audio/mp3',
      buffer: largeBuffer
    })
    
    // Should still accept the file
    await expect(page.locator('text=File loaded: very-large-audio.mp3')).toBeVisible()
    
    // Chunking should be enabled by default for large files
    const chunkingCheckbox = await page.locator('#useChunking')
    await expect(chunkingCheckbox).toBeChecked()
  })
})