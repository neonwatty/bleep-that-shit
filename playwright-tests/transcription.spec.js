import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("user can upload mp3 and get transcription", async ({ page }) => {
  // Go to the transcription test page on the custom subdomain
  await page.goto("http://bleep-that-sht.localhost:3000/transcription-test");

  // Upload the mp3 file
  const filePath = path.resolve(__dirname, "../test/fixtures/files/test.mp3");
  const fileInput = await page.$("#fileInput");
  await fileInput.setInputFiles(filePath);

  // Click the transcribe button
  await page.click("#transcribeButton");

  // Wait for the results to appear (up to 30s for model load/transcription)
  await page.waitForSelector("#results:not(.hidden)", { timeout: 30000 });

  // Assert that some transcript text is present
  const resultsText = await page.textContent("#results");
  expect(resultsText).toContain("Transcript"); // or another expected keyword
});

test("user can upload mp4 and get transcription", async ({ page }) => {
  // Go to the transcription test page on the custom subdomain
  await page.goto("http://bleep-that-sht.localhost:3000/transcription-test");

  // Upload the mp4 file
  const filePath = path.resolve(__dirname, "../test/fixtures/files/test.mp4");
  const fileInput = await page.$("#fileInput");
  await fileInput.setInputFiles(filePath);

  // Click the transcribe button
  await page.click("#transcribeButton");

  // Wait for the results to appear (up to 30s for model load/transcription)
  await page.waitForSelector("#results:not(.hidden)", { timeout: 30000 });

  // Assert that some transcript text is present
  const resultsText = await page.textContent("#results");
  expect(resultsText).toContain("Transcript"); // or another expected keyword
});

test("user can cancel transcription", async ({ page }) => {
  // Go to the transcription test page
  await page.goto("http://bleep-that-sht.localhost:3000/transcription-test");

  // Upload the mp3 file
  const filePath = path.resolve(__dirname, "../test/fixtures/files/test.mp3");
  const fileInput = await page.$("#fileInput");
  await fileInput.setInputFiles(filePath);

  // Click the transcribe button
  await page.click("#transcribeButton");

  // Wait for the Cancel button to appear (transcription in progress)
  await page.waitForSelector("#cancelTranscriptionButton:not(.hidden)", {
    timeout: 10000,
  });

  // Click the Cancel button
  await page.click("#cancelTranscriptionButton");

  // Wait for the progress text to show 'Transcription cancelled.'
  await page.waitForSelector("text=Transcription cancelled.", {
    timeout: 10000,
  });

  // Ensure no results are displayed
  const resultsText = await page.textContent("#results");
  expect(resultsText).not.toContain("Transcript");
});
