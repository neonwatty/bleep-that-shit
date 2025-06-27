import { chunkAudioBuffer } from "./audioChunking.js";

// Helper to create a dummy Float32Array of a given length
function createDummyAudio(length) {
  const arr = new Float32Array(length);
  for (let i = 0; i < length; i++) arr[i] = Math.sin(i / 100); // just some data
  return arr;
}

function testChunking() {
  // 1. Test with exactly one chunk (30s)
  const oneChunk = createDummyAudio(480000);
  let chunks = chunkAudioBuffer(oneChunk);
  console.assert(chunks.length === 1, "Should be 1 chunk for 30s audio");
  console.assert(chunks[0].chunk.length === 480000, "Chunk should be 30s long");

  // 2. Test with a little more than one chunk (35s)
  const twoChunks = createDummyAudio(560000); // 35s
  chunks = chunkAudioBuffer(twoChunks);
  console.assert(chunks.length === 2, "Should be 2 chunks for 35s audio");
  // First chunk: 480000, second chunk: 80000 (35s - 30s + 5s overlap)
  console.assert(
    chunks[0].chunk.length === 480000,
    "First chunk should be 30s"
  );
  console.assert(chunks[1].chunk.length === 80000, "Second chunk should be 5s");

  // 3. Test with a long audio (e.g., 2.5 chunks)
  const longAudio = createDummyAudio(900000); // 56.25s
  chunks = chunkAudioBuffer(longAudio);
  console.assert(chunks.length === 2, "Should be 2 chunks for 56.25s audio");
  // First chunk: 480000, second chunk: 420000 (900000 - (480000 - 80000))
  console.assert(
    chunks[0].chunk.length === 480000,
    "First chunk should be 30s"
  );
  console.assert(
    chunks[1].chunk.length === 420000,
    "Second chunk should be remainder"
  );

  console.log("All chunkAudioBuffer tests passed!");
}

testChunking();
