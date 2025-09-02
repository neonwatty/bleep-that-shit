import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Debug Chunking', () => {
  test('Check chunking with test file', async ({ page }) => {
    // Collect console messages
    const consoleLogs: string[] = []
    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`
      consoleLogs.push(text)
      console.log(text)
    })

    // Collect any errors
    page.on('pageerror', error => {
      console.error('Page error:', error.message)
      consoleLogs.push(`[ERROR] ${error.message}`)
    })

    // Navigate to the bleep page
    await page.goto('http://localhost:3020/bleep')
    await page.waitForLoadState('networkidle')

    // Upload the test file
    const fileInput = page.locator('input[type="file"]')
    const testFilePath = path.join(process.cwd(), 'tests/fixtures/files/test_full_old.mp3')
    await fileInput.setInputFiles(testFilePath)

    // Wait for file to be loaded
    await expect(page.locator('text=/File loaded:.*test_full_old\.mp3/')).toBeVisible({ timeout: 5000 })

    // Check if advanced settings are visible
    const advancedSettings = page.locator('text=Advanced Settings')
    const hasAdvancedSettings = await advancedSettings.isVisible()
    console.log('Advanced settings visible:', hasAdvancedSettings)

    // Check chunking checkbox state
    const chunkingCheckbox = page.locator('#useChunking')
    const isChunkingEnabled = await chunkingCheckbox.isChecked()
    console.log('Chunking enabled:', isChunkingEnabled)

    // Start transcription
    console.log('Starting transcription...')
    await page.click('button:has-text("Start Transcription")')

    // Wait a moment for processing to start
    await page.waitForTimeout(2000)

    // Check for progress indicators
    const progressBar = page.locator('.bg-blue-600')
    const hasProgressBar = await progressBar.isVisible()
    console.log('Progress bar visible:', hasProgressBar)

    // Check for chunk progress display
    const chunkProgress = page.locator('text=/Chunk:.*of/')
    const hasChunkProgress = await chunkProgress.isVisible()
    console.log('Chunk progress visible:', hasChunkProgress)

    if (hasChunkProgress) {
      const chunkText = await chunkProgress.textContent()
      console.log('Chunk progress text:', chunkText)
    }

    // Check for any error messages
    const errorMessage = page.locator('text=Transcription Error')
    const hasError = await errorMessage.isVisible()
    if (hasError) {
      const errorText = await page.locator('.text-red-700').textContent()
      console.log('Error found:', errorText)
    }

    // Print relevant console logs
    console.log('\n=== Console Logs ===')
    const relevantLogs = consoleLogs.filter(log => 
      log.includes('[Main]') || 
      log.includes('[Worker]') || 
      log.includes('chunk') || 
      log.includes('Chunk') ||
      log.includes('duration') ||
      log.includes('error') ||
      log.includes('Error')
    )
    relevantLogs.forEach(log => console.log(log))

    // Check specific debug messages
    const hasFileSizeLog = consoleLogs.some(log => log.includes('File size:'))
    const hasChunkingLog = consoleLogs.some(log => log.includes('Should use chunking:'))
    const hasWorkerDuration = consoleLogs.some(log => log.includes('Audio duration:'))
    const hasChunkCount = consoleLogs.some(log => log.includes('Processing') && log.includes('chunks'))

    console.log('\n=== Debug Checks ===')
    console.log('File size logged:', hasFileSizeLog)
    console.log('Chunking decision logged:', hasChunkingLog)
    console.log('Audio duration logged:', hasWorkerDuration)
    console.log('Chunk count logged:', hasChunkCount)

    // Take a screenshot for visual debugging
    await page.screenshot({ path: 'debug-chunking-state.png', fullPage: true })
    console.log('Screenshot saved to debug-chunking-state.png')

    // Wait a bit more to see if transcription completes or shows more progress
    await page.waitForTimeout(5000)

    // Final state check
    const finalProgress = await page.locator('.bg-blue-600').getAttribute('style')
    console.log('Final progress bar state:', finalProgress)

    // Check if transcription completed
    const isComplete = await page.locator('text=Transcription complete').isVisible()
    console.log('Transcription completed:', isComplete)

    // Check if cancel button is visible (indicates still processing)
    const cancelVisible = await page.locator('button:has-text("Cancel")').isVisible()
    console.log('Cancel button visible (still processing):', cancelVisible)
  })
})