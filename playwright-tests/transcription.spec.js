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

test("transcription-view: shows warning and disables transcribe for mismatched file type", async ({
  page,
}) => {
  try {
    await page.goto("http://bleep-that-sht.localhost:3000/transcription-view");
    // Use test_wrong.mp3 (actually an mp4 audio file)
    const filePath = path.resolve(
      __dirname,
      "../test/fixtures/files/test_wrong.mp3"
    );
    const fileInput = await page.$("#fileInput");
    await fileInput.setInputFiles(filePath);
    await page.waitForTimeout(500); // Give async check time to run
    // Print warning area contents for debugging
    const debugWarning = await page.textContent("#transcriptionFileWarning");
    console.log("[DEBUG] transcriptionFileWarning:", debugWarning);
    // Wait for warning
    await page.waitForSelector("#transcriptionFileWarning div.text-red-600", {
      timeout: 5000,
    });
    const warningText = await page.textContent("#transcriptionFileWarning");
    expect(warningText).toContain("does not match detected type");
    // Transcribe button should be disabled
    const disabled = await page.getAttribute("#transcribeButton", "disabled");
    expect(disabled).not.toBeNull();
  } catch (e) {
    await screenshotOnFailure(
      page,
      "transcription-view-mismatch-warning-failure"
    );
    throw e;
  }
});
