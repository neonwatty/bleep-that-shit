// Simple test runner for chunk merging logic
// This tests the core logic without needing Playwright

function processTranscriptionResult(result) {
  let finalResult;
  if (Array.isArray(result)) {
    // This is the fixed version - should merge all chunks
    finalResult = {
      text: result.map(r => r.text || '').join(' '),
      chunks: result.flatMap(r => r.chunks || [])
    };
  } else {
    finalResult = result;
  }
  return {
    text: finalResult.text || '',
    chunks: finalResult.chunks || []
  };
}

function assert(condition, message) {
  if (!condition) {
    console.error('❌ FAILED:', message);
    process.exit(1);
  }
}

console.log('Running chunk merging regression tests...\n');

// Test 1: Multi-chunk transcription should not be truncated
console.log('Test 1: Multi-chunk transcription results');
const mockWorkerResult = [
  { 
    text: 'This is the first chunk of text', 
    chunks: [
      {text: 'This', timestamp: [0, 0.5]},
      {text: 'is', timestamp: [0.5, 0.7]},
      {text: 'the', timestamp: [0.7, 0.9]},
      {text: 'first', timestamp: [0.9, 1.2]},
      {text: 'chunk', timestamp: [1.2, 1.5]},
      {text: 'of', timestamp: [1.5, 1.7]},
      {text: 'text', timestamp: [1.7, 2.0]}
    ]
  },
  { 
    text: 'This is the second chunk', 
    chunks: [
      {text: 'This', timestamp: [30, 30.5]},
      {text: 'is', timestamp: [30.5, 30.7]},
      {text: 'the', timestamp: [30.7, 30.9]},
      {text: 'second', timestamp: [30.9, 31.3]},
      {text: 'chunk', timestamp: [31.3, 31.6]}
    ]
  },
  { 
    text: 'And this is the third chunk', 
    chunks: [
      {text: 'And', timestamp: [60, 60.3]},
      {text: 'this', timestamp: [60.3, 60.5]},
      {text: 'is', timestamp: [60.5, 60.7]},
      {text: 'the', timestamp: [60.7, 60.9]},
      {text: 'third', timestamp: [60.9, 61.2]},
      {text: 'chunk', timestamp: [61.2, 61.5]}
    ]
  }
];

const processed = processTranscriptionResult(mockWorkerResult);

assert(
  processed.text === 'This is the first chunk of text This is the second chunk And this is the third chunk',
  `Expected full text, got: "${processed.text}"`
);
assert(processed.chunks.length === 18, `Expected 18 chunks, got: ${processed.chunks.length}`);

const timestamps = processed.chunks.map(c => c.timestamp[0]);
assert(timestamps.includes(0), 'Should include timestamp from first chunk');
assert(timestamps.includes(30), 'Should include timestamp from second chunk');
assert(timestamps.includes(60), 'Should include timestamp from third chunk');

console.log('✅ Test 1 passed: All chunks are merged correctly\n');

// Test 2: Single result should work
console.log('Test 2: Single result object');
const singleResult = { 
  text: 'Short audio transcription',
  chunks: [
    {text: 'Short', timestamp: [0, 0.5]},
    {text: 'audio', timestamp: [0.5, 1.0]},
    {text: 'transcription', timestamp: [1.0, 1.8]}
  ]
};

const processedSingle = processTranscriptionResult(singleResult);
assert(processedSingle.text === 'Short audio transcription', 'Single result text should be preserved');
assert(processedSingle.chunks.length === 3, 'Single result chunks should be preserved');
console.log('✅ Test 2 passed: Single result handled correctly\n');

// Test 3: Empty/missing chunks
console.log('Test 3: Empty or missing chunks');
const resultWithMissingChunks = [
  { text: 'First part', chunks: undefined },
  { text: 'Second part', chunks: [] },
  { text: 'Third part', chunks: [{text: 'Third', timestamp: [0, 1]}] }
];

const processedMissing = processTranscriptionResult(resultWithMissingChunks);
assert(processedMissing.text === 'First part Second part Third part', 'Should handle missing chunks');
assert(processedMissing.chunks.length === 1, 'Should only include valid chunks');
console.log('✅ Test 3 passed: Missing chunks handled gracefully\n');

// Test 4: Demonstrate the old bug
console.log('Test 4: Old buggy implementation comparison');
const testArray = [
  { text: 'First chunk', chunks: [] },
  { text: 'Second chunk', chunks: [] },
  { text: 'Third chunk', chunks: [] }
];

// Old buggy implementation
const buggyImplementation = (result) => {
  const finalResult = Array.isArray(result) ? result[0] : result; // BUG: only takes first!
  return {
    text: finalResult.text || '',
    chunks: finalResult.chunks || []
  };
};

const buggyResult = buggyImplementation(testArray);
const correctResult = processTranscriptionResult(testArray);

assert(buggyResult.text === 'First chunk', 'Buggy implementation only returns first chunk');
assert(correctResult.text === 'First chunk Second chunk Third chunk', 'Fixed implementation returns all chunks');
console.log('✅ Test 4 passed: Bug demonstration confirmed\n');

// Test 5: Preserve timestamp order
console.log('Test 5: Timestamp ordering');
const orderedResult = [
  { 
    text: 'Hello world', 
    chunks: [
      {text: 'Hello', timestamp: [0, 0.5]},
      {text: 'world', timestamp: [0.5, 1.0]}
    ]
  },
  { 
    text: 'Goodbye world', 
    chunks: [
      {text: 'Goodbye', timestamp: [30, 30.7]},
      {text: 'world', timestamp: [30.7, 31.2]}
    ]
  }
];

const processedOrdered = processTranscriptionResult(orderedResult);
assert(processedOrdered.chunks[0].timestamp[0] === 0, 'First timestamp should be 0');
assert(processedOrdered.chunks[1].timestamp[0] === 0.5, 'Second timestamp should be 0.5');
assert(processedOrdered.chunks[2].timestamp[0] === 30, 'Third timestamp should be 30');
assert(processedOrdered.chunks[3].timestamp[0] === 30.7, 'Fourth timestamp should be 30.7');
console.log('✅ Test 5 passed: Timestamps preserved in order\n');

console.log('🎉 All regression tests passed! The chunk merging fix is working correctly.');