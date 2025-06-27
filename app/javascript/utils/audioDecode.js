// Utility to decode an audio File/Blob to mono, 16kHz Float32Array using the Web Audio API

/**
 * Decode an audio file/blob to mono, 16kHz PCM Float32Array
 * @param {File|Blob} file - Input audio file (any format supported by browser)
 * @returns {Promise<Float32Array>} - Mono, 16kHz PCM samples
 */
export async function decodeAudioToMono16kHzPCM(file) {
  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  // Decode audio data
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);

  // Convert to mono (average channels if needed)
  let mono;
  if (decoded.numberOfChannels === 1) {
    mono = decoded.getChannelData(0);
  } else {
    const ch0 = decoded.getChannelData(0);
    const ch1 = decoded.getChannelData(1);
    mono = new Float32Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      mono[i] = (ch0[i] + ch1[i]) / 2;
    }
  }

  // Resample to 16kHz if needed
  if (decoded.sampleRate === 16000) {
    return mono;
  } else {
    // Use OfflineAudioContext for resampling
    const offlineCtx = new OfflineAudioContext(
      1,
      Math.ceil((mono.length * 16000) / decoded.sampleRate),
      16000
    );
    const buffer = offlineCtx.createBuffer(1, mono.length, decoded.sampleRate);
    buffer.copyToChannel(mono, 0);
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineCtx.destination);
    source.start();
    const rendered = await offlineCtx.startRendering();
    return rendered.getChannelData(0);
  }
}
