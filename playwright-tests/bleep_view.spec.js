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

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    const safeTitle = testInfo.title
      .replace(/[^a-z0-9\-_]+/gi, "_")
      .toLowerCase();
    await screenshotOnFailure(page, `failure-${safeTitle}`);
  }
});

test("bleep-view: exact matching finds words with punctuation", async ({
  page,
}) => {
  try {
    await page.goto("http://bleep-that-sht.localhost:3000/bleep-view");
    const filePath = path.resolve(__dirname, "../test/fixtures/files/test.mp3");
    const fileInput = await page.$("#bleepFileInput");
    await fileInput.setInputFiles(filePath);
    await page.waitForSelector("#bleepModel", { timeout: 5000 });
    await page.selectOption(
      "#bleepModel",
      "onnx-community/whisper-tiny_timestamped"
    );
    await page.waitForSelector("#transcribeAndBleepButton:not([disabled])", {
      timeout: 10000,
    });
    await page.click("#transcribeAndBleepButton");
    await page.waitForSelector("#bleepResultsContainer .mb-6", {
      timeout: 30000,
    });
    // Enter censor words
    await page.fill("#bleepWords", "the");
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
    expect(matchResults.toLowerCase()).toContain("the");
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
    await page.waitForSelector("#bleepModel", { timeout: 5000 });
    await page.selectOption(
      "#bleepModel",
      "onnx-community/whisper-tiny_timestamped"
    );
    await page.waitForSelector("#transcribeAndBleepButton:not([disabled])", {
      timeout: 10000,
    });
    await page.click("#transcribeAndBleepButton");
    await page.waitForSelector("#bleepResultsContainer .mb-6", {
      timeout: 30000,
    });
    // Enter censor word 'unite'
    await page.fill("#bleepWords", "th");
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
    expect(matchResults.toLowerCase()).toContain("that's");
    expect(matchResults.toLowerCase()).toContain("the");

    // Should be two matches
    const matchCount = (matchResults.match(/th/gi) || []).length;
    expect(matchCount).toBe(2);
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
    await page.waitForSelector("#bleepModel", { timeout: 5000 });
    await page.selectOption(
      "#bleepModel",
      "onnx-community/whisper-tiny_timestamped"
    );
    await page.waitForSelector("#transcribeAndBleepButton:not([disabled])", {
      timeout: 10000,
    });
    await page.click("#transcribeAndBleepButton");
    await page.waitForSelector("#bleepResultsContainer .mb-6", {
      timeout: 30000,
    });
    // Enter censor word 'th'
    await page.fill("#bleepWords", "th");
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
    // Count the number of matches listed after the colon
    const matchesList = matchResults.split(":")[1];
    const matches = matchesList
      ? matchesList.split(/\[.*?\]/).filter((s) => s.trim()).length
      : 0;
    console.log("Fuzzy matching (distance 1) matches:", matches);
    expect(matches).toBe(2);
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
    await page.waitForSelector("#bleepModel", { timeout: 5000 });
    await page.selectOption(
      "#bleepModel",
      "onnx-community/whisper-tiny_timestamped"
    );
    await page.waitForSelector("#transcribeAndBleepButton:not([disabled])", {
      timeout: 10000,
    });
    await page.click("#transcribeAndBleepButton");
    await page.waitForSelector("#bleepResultsContainer .mb-6", {
      timeout: 30000,
    });
    // Enter censor word 'reuntd' (edit distance 2 from 'reunited')
    await page.fill("#bleepWords", "th");
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
    // Count the number of matches listed after the colon
    const matchesList = matchResults.split(":")[1];
    const matches = matchesList
      ? matchesList.split(/\[.*?\]/).filter((s) => s.trim()).length
      : 0;
    console.log("Fuzzy matching (distance 2) matches:", matches);
    expect(matches).toBe(5);
  } catch (e) {
    await screenshotOnFailure(
      page,
      "bleep-view-fuzzy-matching-distance2-failure"
    );
    throw e;
  }
});

test("bleep-view: audio player shows markers for mp3", async ({ page }) => {
  // Capture browser console logs
  page.on("console", (msg) => {
    if (msg.type() === "log") {
      console.log("[BROWSER LOG]", msg.text());
    }
  });
  try {
    await page.goto("http://bleep-that-sht.localhost:3000/bleep-view");
    // Wait for the model dropdown to be present
    await page.waitForSelector("#bleepModel", { timeout: 5000 });
    // Select the Tiny model for transcription
    await page.selectOption(
      "#bleepModel",
      "onnx-community/whisper-tiny_timestamped"
    );
    // Debug: print the selected model value (browser-side and Node-side)
    await page.evaluate(() => {
      const val = document.querySelector("#bleepModel").value;
      console.log("[DEBUG] (browser) Selected model:", val);
    });
    const selected = await page.$eval("#bleepModel", (el) => el.value);
    console.log("[DEBUG] (node) Selected model:", selected);
    const fileInput = await page.$("#bleepFileInput");
    await fileInput.setInputFiles("test/fixtures/files/test.mp3");
    await page.waitForSelector("#transcribeAndBleepButton:not([disabled])", {
      timeout: 10000,
    });
    await page.click("#transcribeAndBleepButton");
    await page.waitForSelector("#bleepResultsContainer .mb-6", {
      timeout: 30000,
    });
    // Enter a bleep word that is present in the transcript
    await page.fill("#bleepWords", "the");
    await page.click("#runMatchingButton");
    // Wait for the Plyr audio player to appear (not the raw <audio> tag)
    await page.waitForSelector("#censoredAudioPlayerContainer .plyr", {
      timeout: 10000,
    });
    // Wait for at least one marker to appear
    await page.waitForSelector(
      "#censoredAudioPlayerContainer .plyr__progress__marker",
      { timeout: 5000 }
    );
    const markerCount = await page.$$eval(
      "#censoredAudioPlayerContainer .plyr__progress__marker",
      (els) => els.length
    );
    expect(markerCount).toBeGreaterThan(0);
  } catch (e) {
    await screenshotOnFailure(page, "bleep-view-audio-player-markers-failure");
    throw e;
  }
});

// test("bleep-view: video player shows markers for mp4", async ({ page }) => {
//   // Capture browser console logs and errors
//   page.on("console", (msg) => {
//     if (msg.type() === "log") {
//       console.log("[BROWSER LOG]", msg.text());
//     } else if (msg.type() === "error") {
//       console.error("[BROWSER ERROR]", msg.text());
//     } else if (msg.type() === "warning") {
//       console.warn("[BROWSER WARN]", msg.text());
//     }
//   });
//   try {
//     await page.goto("http://bleep-that-sht.localhost:3000/bleep-view");
//     await page.waitForSelector("#bleepModel", { timeout: 5000 });
//     await page.selectOption(
//       "#bleepModel",
//       "onnx-community/whisper-tiny_timestamped"
//     );
//     await page.evaluate(() =>
//       console.log(
//         "[DEBUG] (browser) Selected model:",
//         document.getElementById("bleepModel").value
//       )
//     );
//     const selected = await page.$eval("#bleepModel", (el) => el.value);
//     console.log("[DEBUG] (node) Selected model:", selected);
//     const fileInput = await page.$("#bleepFileInput");
//     await fileInput.setInputFiles("test/fixtures/files/test.mp4");
//     // Wait for the transcribe button to become enabled
//     await page.waitForSelector("#transcribeAndBleepButton:not([disabled])", {
//       timeout: 10000,
//     });
//     await page.click("#transcribeAndBleepButton");
//     await page.waitForSelector("#bleepResultsContainer .mb-6", {
//       timeout: 30000,
//     });
//     // Fill in the bleep word input and run matching
//     await page.fill("#bleepWords", "sister");
//     await page.click("#runMatchingButton");
//     // Wait for the Plyr video player to appear
//     await page.waitForSelector("#censoredVideoPlayerContainer .plyr", {
//       timeout: 60000,
//     });
//     // Wait for at least one marker to appear
//     await page.waitForSelector(
//       "#censoredVideoPlayerContainer .plyr__progress__marker",
//       { timeout: 5000 }
//     );
//     const markerCount = await page.$$eval(
//       "#censoredVideoPlayerContainer .plyr__progress__marker",
//       (els) => els.length
//     );
//     expect(markerCount).toBeGreaterThan(0);
//   } catch (e) {
//     await screenshotOnFailure(page, "bleep-view-video-player-markers-failure");
//     throw e;
//   }
// }, 60000); // 60 seconds
