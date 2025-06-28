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

test("bleep-view: exact matching finds words with punctuation", async ({
  page,
}) => {
  try {
    await page.goto("http://bleep-that-sht.localhost:3000/bleep-view");
    const filePath = path.resolve(__dirname, "../test/fixtures/files/test.mp3");
    const fileInput = await page.$("#bleepFileInput");
    await fileInput.setInputFiles(filePath);
    await page.waitForSelector("#transcribeAndBleepButton:not([disabled])", {
      timeout: 10000,
    });
    await page.click("#transcribeAndBleepButton");
    await page.waitForSelector("#bleepResultsContainer .mb-6", {
      timeout: 30000,
    });
    // Enter censor words
    await page.fill("#bleepWords", "and, were");
    // Ensure 'Exact' is checked
    const exactCheckbox = await page.$("#matchExact");
    if (!(await exactCheckbox.isChecked())) {
      await exactCheckbox.check();
    }
    // Click Run Matching
    await page.click("#runMatchingButton");
    // Wait for results
    await page.waitForSelector("#bleepMatchResults ul", { timeout: 10000 });
    const matchResults = await page.textContent("#bleepMatchResults");
    expect(matchResults.toLowerCase()).toContain("and");
    expect(matchResults.toLowerCase()).toContain("were");
  } catch (e) {
    await screenshotOnFailure(page, "bleep-view-matching-failure");
    throw e;
  }
});

test("bleep-view: shows warning and disables transcribe for mismatched file type", async ({
  page,
}) => {
  try {
    await page.goto("http://bleep-that-sht.localhost:3000/bleep-view");
    // Use test_wrong.mp3 (actually an mp4 audio file)
    const filePath = path.resolve(
      __dirname,
      "../test/fixtures/files/test_wrong.mp3"
    );
    const fileInput = await page.$("#bleepFileInput");
    await fileInput.setInputFiles(filePath);
    await page.waitForTimeout(500); // Give async check time to run
    // Print warning area contents for debugging
    const debugWarning = await page.textContent("#bleepFileWarning");
    console.log("[DEBUG] bleepFileWarning:", debugWarning);
    // Wait for warning
    await page.waitForSelector("#bleepFileWarning div.text-red-600", {
      timeout: 5000,
    });
    const warningText = await page.textContent("#bleepFileWarning");
    expect(warningText).toContain("does not match detected type");
    // Transcribe button should be disabled
    const disabled = await page.getAttribute(
      "#transcribeAndBleepButton",
      "disabled"
    );
    expect(disabled).not.toBeNull();
  } catch (e) {
    await screenshotOnFailure(page, "bleep-view-mismatch-warning-failure");
    throw e;
  }
});

test("bleep-view: partial matching finds substrings in transcript words", async ({
  page,
}) => {
  try {
    await page.goto("http://bleep-that-sht.localhost:3000/bleep-view");
    const filePath = path.resolve(__dirname, "../test/fixtures/files/test.mp3");
    const fileInput = await page.$("#bleepFileInput");
    await fileInput.setInputFiles(filePath);
    await page.waitForSelector("#transcribeAndBleepButton:not([disabled])", {
      timeout: 10000,
    });
    await page.click("#transcribeAndBleepButton");
    await page.waitForSelector("#bleepResultsContainer .mb-6", {
      timeout: 30000,
    });
    // Enter censor word 'unite'
    await page.fill("#bleepWords", "unite");
    // Enable Partial matching
    const partialCheckbox = await page.$("#matchPartial");
    if (!(await partialCheckbox.isChecked())) {
      await partialCheckbox.check();
    }
    // Click Run Matching
    await page.click("#runMatchingButton");
    // Wait for results
    await page.waitForSelector("#bleepMatchResults ul", { timeout: 10000 });
    const matchResults = await page.textContent("#bleepMatchResults");
    expect(matchResults.toLowerCase()).toContain("reunited");
    // Should only be one match
    const matchCount = (matchResults.match(/reunited/gi) || []).length;
    expect(matchCount).toBe(1);
  } catch (e) {
    await screenshotOnFailure(page, "bleep-view-partial-matching-failure");
    throw e;
  }
});

test("bleep-view: fuzzy matching finds similar words in transcript", async ({
  page,
}) => {
  try {
    await page.goto("http://bleep-that-sht.localhost:3000/bleep-view");
    const filePath = path.resolve(__dirname, "../test/fixtures/files/test.mp3");
    const fileInput = await page.$("#bleepFileInput");
    await fileInput.setInputFiles(filePath);
    await page.waitForSelector("#transcribeAndBleepButton:not([disabled])", {
      timeout: 10000,
    });
    await page.click("#transcribeAndBleepButton");
    await page.waitForSelector("#bleepResultsContainer .mb-6", {
      timeout: 30000,
    });
    // Enter censor word 'reunitd' (typo for 'reunited')
    await page.fill("#bleepWords", "reunitd");
    // Enable Fuzzy matching
    const fuzzyCheckbox = await page.$("#matchFuzzy");
    if (!(await fuzzyCheckbox.isChecked())) {
      await fuzzyCheckbox.check();
    }
    // Set fuzzy distance to 1
    await page.fill("#fuzzyDistance", "1");
    // Click Run Matching
    await page.click("#runMatchingButton");
    // Wait for results
    await page.waitForSelector("#bleepMatchResults ul", { timeout: 10000 });
    const matchResults = await page.textContent("#bleepMatchResults");
    expect(matchResults.toLowerCase()).toContain("reunited");
    // Should only be one match
    const matchCount = (matchResults.match(/reunited/gi) || []).length;
    expect(matchCount).toBe(1);
  } catch (e) {
    await screenshotOnFailure(page, "bleep-view-fuzzy-matching-failure");
    throw e;
  }
});

test("bleep-view: fuzzy matching finds words with edit distance 2", async ({
  page,
}) => {
  try {
    await page.goto("http://bleep-that-sht.localhost:3000/bleep-view");
    const filePath = path.resolve(__dirname, "../test/fixtures/files/test.mp3");
    const fileInput = await page.$("#bleepFileInput");
    await fileInput.setInputFiles(filePath);
    await page.waitForSelector("#transcribeAndBleepButton:not([disabled])", {
      timeout: 10000,
    });
    await page.click("#transcribeAndBleepButton");
    await page.waitForSelector("#bleepResultsContainer .mb-6", {
      timeout: 30000,
    });
    // Enter censor word 'reuntd' (edit distance 2 from 'reunited')
    await page.fill("#bleepWords", "reuntd");
    // Enable Fuzzy matching
    const fuzzyCheckbox = await page.$("#matchFuzzy");
    if (!(await fuzzyCheckbox.isChecked())) {
      await fuzzyCheckbox.check();
    }
    // Set fuzzy distance to 2
    await page.fill("#fuzzyDistance", "2");
    // Click Run Matching
    await page.click("#runMatchingButton");
    // Wait for results
    await page.waitForSelector("#bleepMatchResults ul", { timeout: 10000 });
    const matchResults = await page.textContent("#bleepMatchResults");
    expect(matchResults.toLowerCase()).toContain("reunited");
    // Should only be one match
    const matchCount = (matchResults.match(/reunited/gi) || []).length;
    expect(matchCount).toBe(1);
  } catch (e) {
    await screenshotOnFailure(
      page,
      "bleep-view-fuzzy-matching-distance2-failure"
    );
    throw e;
  }
});
