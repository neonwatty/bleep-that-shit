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

  // Wait for the results to appear (up to 60s for model load/transcription)
  await page.waitForSelector("#results:not(.hidden)", { timeout: 60000 });

  // Assert that some transcript text is present
  const resultsText = await page.textContent("#results");
  expect(resultsText).toContain("Transcript"); // or another expected keyword
});
