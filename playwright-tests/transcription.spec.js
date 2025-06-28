import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function screenshotOnFailure(page, name) {
  try {
    await page.screenshot({ path: `test-results/${name}.png`, fullPage: true });
    console.log(`[Screenshot] Saved to test-results/${name}.png`);
  } catch (e) {
    console.error("[Screenshot] Failed to save screenshot:", e);
  }
}

test("user can upload mp3 and get transcription", async ({ page }) => {
  try {
    await page.goto("http://bleep-that-sht.localhost:3000/transcription-view");
    const filePath = path.resolve(__dirname, "../test/fixtures/files/test.mp3");
    const fileInput = await page.$("#fileInput");
    await fileInput.setInputFiles(filePath);
    await page.waitForSelector("#transcribeButton:not([disabled])", {
      timeout: 10000,
    });
    await page.click("#transcribeButton");
    await page.waitForSelector("#results:not(.hidden)", { timeout: 30000 });
    const resultsText = await page.textContent("#results");
    expect(resultsText).toContain("Transcript");
  } catch (e) {
    await screenshotOnFailure(page, "mp3-failure");
    throw e;
  }
});

test("user can upload mp4 and get transcription", async ({ page }) => {
  try {
    await page.goto("http://bleep-that-sht.localhost:3000/transcription-view");
    const filePath = path.resolve(__dirname, "../test/fixtures/files/test.mp4");
    const fileInput = await page.$("#fileInput");
    await fileInput.setInputFiles(filePath);
    await page.waitForSelector("#transcribeButton:not([disabled])", {
      timeout: 10000,
    });
    await page.click("#transcribeButton");
    await page.waitForSelector("#results:not(.hidden)", { timeout: 30000 });
    const resultsText = await page.textContent("#results");
    expect(resultsText).toContain("Transcript");
  } catch (e) {
    await screenshotOnFailure(page, "mp4-failure");
    throw e;
  }
});

test("user can cancel transcription", async ({ page }) => {
  try {
    await page.goto("http://bleep-that-sht.localhost:3000/transcription-view");
    const filePath = path.resolve(__dirname, "../test/fixtures/files/test.mp3");
    const fileInput = await page.$("#fileInput");
    await fileInput.setInputFiles(filePath);
    await page.waitForSelector("#transcribeButton:not([disabled])", {
      timeout: 10000,
    });
    await page.click("#transcribeButton");
    await page.waitForSelector("#cancelTranscriptionButton:not(.hidden)", {
      timeout: 10000,
    });
    await page.click("#cancelTranscriptionButton");
    await page.waitForSelector("text=Transcription cancelled.", {
      timeout: 10000,
    });
    const resultsText = await page.textContent("#results");
    expect(resultsText).not.toContain("Transcript");
  } catch (e) {
    await screenshotOnFailure(page, "cancel-failure");
    throw e;
  }
});
