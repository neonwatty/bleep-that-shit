import { test, expect } from '@playwright/test'

test.describe('Transcription Cancellation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bleep')
    await page.waitForLoadState('networkidle')
  })
  
  test('should show cancel button during transcription', async ({ page }) => {
    // Upload a file
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-audio.mp3',
      mimeType: 'audio/mp3',
      buffer: Buffer.alloc(1024 * 1024) // 1MB mock file
    })
    
    // Wait for file to be loaded
    await expect(page.locator('text=File loaded: test-audio.mp3')).toBeVisible()
    
    // Start transcription
    await page.click('button:has-text("Start Transcription")')
    
    // Cancel button should appear
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible({ timeout: 5000 })
    
    // Transcribing button should be disabled
    await expect(page.locator('button:has-text("Transcribing...")')).toBeDisabled()
  })
  
  test('should cancel transcription when cancel button is clicked', async ({ page }) => {
    // Mock worker to simulate long-running transcription
    await page.addInitScript(() => {
      const OriginalWorker = window.Worker
      window.Worker = class MockWorker extends OriginalWorker {
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options)
          
          const originalPostMessage = this.postMessage.bind(this)
          let cancelRequested = false
          
          this.postMessage = (message: any) => {
            originalPostMessage(message)
            
            if (message.type === 'cancel') {
              cancelRequested = true
              // Respond with cancelled message
              setTimeout(() => {
                this.dispatchEvent(new MessageEvent('message', {
                  data: { type: 'cancelled' }
                }))
              }, 100)
            }
            
            if ((message.type === 'processAudio' || message.type === 'transcribe') && !cancelRequested) {
              // Simulate slow processing
              let progress = 0
              const interval = setInterval(() => {
                if (cancelRequested) {
                  clearInterval(interval)
                  return
                }
                
                progress += 10
                this.dispatchEvent(new MessageEvent('message', {
                  data: {
                    type: 'progress',
                    progress: {
                      currentChunk: Math.floor(progress / 20),
                      totalChunks: 5,
                      overallProgress: progress,
                      estimatedTimeRemaining: (100 - progress) * 0.5,
                      status: `Processing... ${progress}%`,
                      chunksCompleted: Math.floor(progress / 20),
                      memoryUsageMB: 300
                    }
                  }
                }))
                
                if (progress >= 100) {
                  clearInterval(interval)
                  this.dispatchEvent(new MessageEvent('message', {
                    data: {
                      type: 'complete',
                      result: { text: 'Test transcription', chunks: [] }
                    }
                  }))
                }
              }, 500) // Update every 500ms
            }
          }
        }
      } as any
    })
    
    // Upload file
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'long-audio.mp3',
      mimeType: 'audio/mp3',
      buffer: Buffer.alloc(5 * 1024 * 1024) // 5MB to simulate long file
    })
    
    // Start transcription
    await page.click('button:has-text("Start Transcription")')
    
    // Wait for some progress
    await page.waitForTimeout(1000)
    
    // Click cancel button
    await page.click('button:has-text("Cancel")')
    
    // Should show cancelling state
    await expect(page.locator('button:has-text("Cancelling...")')).toBeVisible()
    
    // Should show cancelled message
    await expect(page.locator('text=/cancelled/i')).toBeVisible({ timeout: 5000 })
    
    // Start button should be enabled again
    await expect(page.locator('button:has-text("Start Transcription")')).toBeEnabled({ timeout: 5000 })
    
    // Cancel button should disappear
    await expect(page.locator('button:has-text("Cancel")')).not.toBeVisible()
  })
  
  test('should handle cancel during different stages', async ({ page }) => {
    let messageCount = 0
    
    await page.addInitScript(() => {
      const OriginalWorker = window.Worker
      window.Worker = class MockWorker extends OriginalWorker {
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options)
          
          const originalPostMessage = this.postMessage.bind(this)
          
          this.postMessage = (message: any) => {
            originalPostMessage(message)
            
            if (message.type === 'cancel') {
              setTimeout(() => {
                this.dispatchEvent(new MessageEvent('message', {
                  data: { type: 'cancelled' }
                }))
              }, 50)
            }
            
            if (message.type === 'initialize') {
              this.dispatchEvent(new MessageEvent('message', {
                data: {
                  type: 'initialized',
                  stats: { totalChunks: 3 }
                }
              }))
            }
          }
        }
      } as any
    })
    
    // Test 1: Cancel during initialization
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mp3',
      buffer: Buffer.alloc(1024 * 1024)
    })
    
    // Start and immediately cancel
    await page.click('button:has-text("Start Transcription")')
    await page.click('button:has-text("Cancel")', { timeout: 1000 })
    
    // Should handle cancellation gracefully
    await expect(page.locator('text=/cancelled/i')).toBeVisible({ timeout: 5000 })
  })
  
  test('should disable cancel button while cancelling', async ({ page }) => {
    await page.addInitScript(() => {
      const OriginalWorker = window.Worker
      window.Worker = class MockWorker extends OriginalWorker {
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options)
          
          const originalPostMessage = this.postMessage.bind(this)
          
          this.postMessage = (message: any) => {
            originalPostMessage(message)
            
            if (message.type === 'cancel') {
              // Delay response to test cancelling state
              setTimeout(() => {
                this.dispatchEvent(new MessageEvent('message', {
                  data: { type: 'cancelled' }
                }))
              }, 1000)
            }
          }
        }
      } as any
    })
    
    // Upload file and start
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mp3',
      buffer: Buffer.alloc(1024 * 1024)
    })
    
    await page.click('button:has-text("Start Transcription")')
    
    // Click cancel
    const cancelButton = page.locator('button:has-text("Cancel")')
    await cancelButton.click()
    
    // Should show cancelling state and be disabled
    const cancellingButton = page.locator('button:has-text("Cancelling...")')
    await expect(cancellingButton).toBeVisible()
    await expect(cancellingButton).toBeDisabled()
  })
  
  test('should terminate worker if it does not respond to cancel', async ({ page }) => {
    await page.addInitScript(() => {
      const OriginalWorker = window.Worker
      window.Worker = class MockWorker extends OriginalWorker {
        terminated = false
        
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options)
          
          const originalPostMessage = this.postMessage.bind(this)
          
          this.postMessage = (message: any) => {
            originalPostMessage(message)
            
            // Intentionally don't respond to cancel to test timeout
            if (message.type === 'cancel') {
              // Do nothing - simulate unresponsive worker
            }
          }
        }
        
        terminate() {
          this.terminated = true
          console.log('Worker terminated')
        }
      } as any
    })
    
    // Upload file and start
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mp3',
      buffer: Buffer.alloc(1024 * 1024)
    })
    
    await page.click('button:has-text("Start Transcription")')
    await page.waitForTimeout(500)
    
    // Click cancel
    await page.click('button:has-text("Cancel")')
    
    // Wait for timeout (2 seconds as per implementation)
    await page.waitForTimeout(2500)
    
    // Should be reset even without worker response
    await expect(page.locator('button:has-text("Start Transcription")')).toBeEnabled()
    await expect(page.locator('button:has-text("Cancel")')).not.toBeVisible()
  })
})