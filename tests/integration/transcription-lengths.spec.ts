import { test, expect, Page } from '@playwright/test';
import path from 'path';

test.describe('Transcription Length Integration Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/bleep');
    await page.waitForLoadState('networkidle');
  });

  async function uploadAndTranscribe(filename: string) {
    // Upload file
    const fileInput = await page.locator('input[type="file"]');
    const filePath = path.join(__dirname, '..', 'fixtures', 'audio', filename);
    await fileInput.setInputFiles(filePath);
    
    // Wait for file to be loaded
    await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 5000 });
    
    // Start transcription
    await page.click('button:has-text("Start Transcription")');
    
    // Wait for transcription to complete (with longer timeout for larger files)
    await expect(page.locator('text=/Transcription complete/')).toBeVisible({ timeout: 120000 });
    
    // Get the transcript text
    const transcriptElement = await page.locator('.transcript-text, [class*="transcript"], div:has-text("Transcript:")');
    const transcriptText = await transcriptElement.textContent();
    
    return transcriptText || '';
  }

  test('should transcribe complete 10-second audio', async () => {
    // This test would use a real 10-second audio file with known content
    // For now, we'll create a placeholder test structure
    test.skip(); // Skip until we have test fixtures
    
    const transcript = await uploadAndTranscribe('10-second-sample.mp3');
    
    // Verify beginning, middle, and end are present
    expect(transcript).toContain('beginning marker text');
    expect(transcript).toContain('middle marker at 5 seconds');
    expect(transcript).toContain('end marker at 10 seconds');
    
    // Verify reasonable word count (approximately 25-30 words for 10 seconds)
    const wordCount = transcript.split(' ').length;
    expect(wordCount).toBeGreaterThan(20);
    expect(wordCount).toBeLessThan(50);
  });

  test('should transcribe complete 1-minute audio without truncation', async () => {
    test.skip(); // Skip until we have test fixtures
    
    const transcript = await uploadAndTranscribe('1-minute-sample.mp3');
    
    // Check for markers at different timestamps
    expect(transcript).toContain('ten second mark');
    expect(transcript).toContain('thirty second mark');
    expect(transcript).toContain('forty-five second mark');
    expect(transcript).toContain('one minute end mark');
    
    // Verify reasonable word count (approximately 150-180 words per minute)
    const wordCount = transcript.split(' ').length;
    expect(wordCount).toBeGreaterThan(120);
    expect(wordCount).toBeLessThan(250);
  });

  test('should transcribe complete 5-minute audio without truncation', async () => {
    test.skip(); // Skip until we have test fixtures
    
    const transcript = await uploadAndTranscribe('5-minute-sample.mp3');
    
    // Check for markers throughout the audio
    expect(transcript).toContain('minute one marker');
    expect(transcript).toContain('minute two marker');
    expect(transcript).toContain('minute three marker');
    expect(transcript).toContain('minute four marker');
    expect(transcript).toContain('minute five marker');
    
    // Verify the transcript includes content from all chunks
    // 5 minutes = 300 seconds = 10 chunks of 30 seconds each
    const wordCount = transcript.split(' ').length;
    expect(wordCount).toBeGreaterThan(600); // At least 120 words/minute * 5
    expect(wordCount).toBeLessThan(1500);
  });

  test('should handle exactly 30-second audio (chunk boundary)', async () => {
    test.skip(); // Skip until we have test fixtures
    
    const transcript = await uploadAndTranscribe('30-second-exact.mp3');
    
    // Should process as single chunk
    expect(transcript).toContain('start of thirty seconds');
    expect(transcript).toContain('middle at fifteen');
    expect(transcript).toContain('end at thirty');
    
    // Verify complete transcription
    const wordCount = transcript.split(' ').length;
    expect(wordCount).toBeGreaterThan(60);  // ~150 words/min = ~75 for 30s
    expect(wordCount).toBeLessThan(120);
  });

  test('should handle 31-second audio (triggers chunking)', async () => {
    test.skip(); // Skip until we have test fixtures
    
    const transcript = await uploadAndTranscribe('31-second-sample.mp3');
    
    // Should process as two chunks with overlap
    expect(transcript).toContain('start marker');
    expect(transcript).toContain('twenty-nine second mark');
    expect(transcript).toContain('thirty-one second end');
    
    // Verify both chunks are included
    const wordCount = transcript.split(' ').length;
    expect(wordCount).toBeGreaterThan(65);
  });

  test('transcription completeness ratio check', async () => {
    test.skip(); // Skip until we have test fixtures
    
    // Test with a known audio file
    const transcript = await uploadAndTranscribe('2-minute-known-content.mp3');
    
    // Known content has approximately 300 words
    const expectedMinWords = 250;
    const expectedMaxWords = 350;
    const actualWords = transcript.split(' ').length;
    
    expect(actualWords).toBeGreaterThan(expectedMinWords);
    expect(actualWords).toBeLessThan(expectedMaxWords);
    
    // Calculate completeness ratio
    const completenessRatio = actualWords / 300; // 300 is expected count
    expect(completenessRatio).toBeGreaterThan(0.8); // At least 80% complete
    expect(completenessRatio).toBeLessThan(1.2);    // Not over 120% (duplicates)
  });

  test('should not have duplicate content from overlapping chunks', async () => {
    test.skip(); // Skip until we have test fixtures
    
    const transcript = await uploadAndTranscribe('1-minute-sample.mp3');
    
    // Check that overlapping sections aren't duplicated
    // Split into sentences and check for exact duplicates
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const uniqueSentences = new Set(sentences);
    
    // Should have roughly the same number of unique sentences as total
    expect(uniqueSentences.size).toBeGreaterThan(sentences.length * 0.95);
  });
});