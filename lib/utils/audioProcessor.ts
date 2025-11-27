/**
 * Audio processing utilities for applying bleeps/censoring
 */

import { getPublicPath } from './paths';

export interface BleepSegment {
  word: string;
  start: number;
  end: number;
}

/**
 * Apply bleeps to an audio file at specified timestamps
 */
export async function applyBleeps(
  audioFile: File,
  bleepSegments: BleepSegment[],
  bleepSound: string = 'bleep',
  bleepVolume: number = 0.8,
  originalVolumeReduction: number = 0.1 // New parameter
): Promise<Blob> {
  // Create audio context
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  // Load the original audio
  const arrayBuffer = await audioFile.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Create offline context for rendering
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  // Create buffer source for original audio
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;

  // Create gain nodes for ducking audio during bleeps
  const gainNode = offlineContext.createGain();
  source.connect(gainNode);
  gainNode.connect(offlineContext.destination);

  // Load bleep sound (skip for silence mode)
  let bleepBuffer: AudioBuffer | null = null;
  if (bleepSound !== 'silence') {
    const bleepResponse = await fetch(getPublicPath(`/bleeps/${bleepSound}.mp3`));
    const bleepArrayBuffer = await bleepResponse.arrayBuffer();
    bleepBuffer = await audioContext.decodeAudioData(bleepArrayBuffer);
  }

  // Schedule gain automation and bleeps
  const now = offlineContext.currentTime;

  // Set initial gain
  gainNode.gain.setValueAtTime(1, now);

  console.log(
    `[Audio Processing] Applying ${bleepSegments.length} ${bleepSound === 'silence' ? 'silences' : 'bleeps'} with:`
  );
  console.log(`- Bleep sound: ${bleepSound}`);
  console.log(`- Bleep volume: ${bleepVolume}`);
  console.log(`- Original volume during bleeps: ${originalVolumeReduction}`);

  // Schedule volume ducking for each bleep segment
  bleepSegments.forEach((segment, index) => {
    const startTime = segment.start;
    const endTime = segment.end;
    const duration = endTime - startTime;

    // Defensive check for null timestamps
    const startStr = typeof startTime === 'number' ? startTime.toFixed(3) : 'N/A';
    const endStr = typeof endTime === 'number' ? endTime.toFixed(3) : 'N/A';
    const durationStr = typeof duration === 'number' ? duration.toFixed(3) : 'N/A';

    console.log(
      `  ${bleepSound === 'silence' ? 'Silence' : 'Bleep'} ${index + 1}: "${segment.word}" at ${startStr}s - ${endStr}s (duration: ${durationStr}s)`
    );

    // Duck the original audio
    gainNode.gain.setValueAtTime(1, Math.max(0, startTime - 0.01));
    gainNode.gain.linearRampToValueAtTime(originalVolumeReduction, startTime);
    gainNode.gain.setValueAtTime(originalVolumeReduction, endTime);
    gainNode.gain.linearRampToValueAtTime(1, endTime + 0.01);

    // Add bleep sound (skip for silence mode)
    if (bleepBuffer) {
      const bleepSource = offlineContext.createBufferSource();
      bleepSource.buffer = bleepBuffer;

      // Create gain node for bleep to adjust volume
      const bleepGain = offlineContext.createGain();
      bleepGain.gain.value = bleepVolume;

      bleepSource.connect(bleepGain);
      bleepGain.connect(offlineContext.destination);

      // Loop the bleep if needed for longer segments
      if (duration > bleepBuffer.duration) {
        bleepSource.loop = true;
        bleepSource.loopEnd = bleepBuffer.duration;
      }

      bleepSource.start(startTime, 0, duration);
    }
  });

  // Start the original audio
  source.start(0);

  // Render the audio
  const renderedBuffer = await offlineContext.startRendering();

  // Convert to WAV blob
  const wavBlob = await audioBufferToWav(renderedBuffer);

  return wavBlob;
}

/**
 * Convert AudioBuffer to WAV blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numberOfChannels = buffer.numberOfChannels;
  const length = buffer.length * numberOfChannels * 2 + 44;
  const outputBuffer = new ArrayBuffer(length);
  const view = new DataView(outputBuffer);
  const channels: Float32Array[] = [];
  let offset = 0;
  let pos = 0;

  // Write WAV header
  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };

  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  // RIFF identifier
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  // Format chunk identifier
  setUint32(0x20746d66); // "fmt "
  setUint32(16); // chunk length
  setUint16(1); // PCM format
  setUint16(numberOfChannels);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numberOfChannels); // byte rate
  setUint16(numberOfChannels * 2); // block align
  setUint16(16); // bits per sample

  // Data chunk identifier
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4); // chunk length

  // Write interleaved data
  for (let i = 0; i < numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numberOfChannels; i++) {
      const sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff; // scale to 16-bit
      view.setInt16(pos, intSample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([outputBuffer], { type: 'audio/wav' });
}

/**
 * For video files, we need to remux with the censored audio
 */
export async function applyBleepsToVideo(
  videoFile: File,
  bleepSegments: BleepSegment[],
  bleepSound: string = 'bleep',
  bleepVolume: number = 0.8,
  originalVolumeReduction: number = 0.1 // New parameter
): Promise<Blob> {
  console.log('Starting video bleeping process...');

  // Step 1: Extract audio from video using FFmpeg in a worker
  const extractWorker = new Worker(
    new URL('../../app/workers/transcriptionWorker.ts', import.meta.url),
    { type: 'module' }
  );

  const extractedAudio = await new Promise<ArrayBuffer>((resolve, reject) => {
    extractWorker.onmessage = event => {
      if (event.data.type === 'extracted') {
        resolve(event.data.audioBuffer);
        extractWorker.terminate();
      } else if (event.data.error) {
        reject(new Error(event.data.error));
        extractWorker.terminate();
      }
    };

    extractWorker.onerror = error => {
      reject(error);
      extractWorker.terminate();
    };

    videoFile.arrayBuffer().then(buffer => {
      extractWorker.postMessage({
        type: 'extract',
        fileBuffer: buffer,
        fileType: videoFile.type,
      });
    });
  });

  // Step 2: Decode extracted audio and apply bleeps
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(extractedAudio);

  // Create offline context for rendering
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  // Create buffer source for original audio
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;

  // Create gain nodes for ducking audio during bleeps
  const gainNode = offlineContext.createGain();
  source.connect(gainNode);
  gainNode.connect(offlineContext.destination);

  // Load bleep sound (skip for silence mode)
  let bleepBuffer: AudioBuffer | null = null;
  if (bleepSound !== 'silence') {
    const bleepResponse = await fetch(getPublicPath(`/bleeps/${bleepSound}.mp3`));
    const bleepArrayBuffer = await bleepResponse.arrayBuffer();
    bleepBuffer = await audioContext.decodeAudioData(bleepArrayBuffer);
  }

  // Schedule gain automation and bleeps
  const now = offlineContext.currentTime;

  // Set initial gain
  gainNode.gain.setValueAtTime(1, now);

  console.log(
    `[Audio Processing] Applying ${bleepSegments.length} ${bleepSound === 'silence' ? 'silences' : 'bleeps'} with:`
  );
  console.log(`- Bleep sound: ${bleepSound}`);
  console.log(`- Bleep volume: ${bleepVolume}`);
  console.log(`- Original volume during bleeps: ${originalVolumeReduction}`);

  // Schedule volume ducking for each bleep segment
  bleepSegments.forEach((segment, index) => {
    const startTime = segment.start;
    const endTime = segment.end;
    const duration = endTime - startTime;

    // Defensive check for null timestamps
    const startStr = typeof startTime === 'number' ? startTime.toFixed(3) : 'N/A';
    const endStr = typeof endTime === 'number' ? endTime.toFixed(3) : 'N/A';
    const durationStr = typeof duration === 'number' ? duration.toFixed(3) : 'N/A';

    console.log(
      `  ${bleepSound === 'silence' ? 'Silence' : 'Bleep'} ${index + 1}: "${segment.word}" at ${startStr}s - ${endStr}s (duration: ${durationStr}s)`
    );

    // Duck the original audio
    gainNode.gain.setValueAtTime(1, Math.max(0, startTime - 0.01));
    gainNode.gain.linearRampToValueAtTime(originalVolumeReduction, startTime);
    gainNode.gain.setValueAtTime(originalVolumeReduction, endTime);
    gainNode.gain.linearRampToValueAtTime(1, endTime + 0.01);

    // Add bleep sound (skip for silence mode)
    if (bleepBuffer) {
      const bleepSource = offlineContext.createBufferSource();
      bleepSource.buffer = bleepBuffer;

      // Create gain node for bleep to adjust volume
      const bleepGain = offlineContext.createGain();
      bleepGain.gain.value = bleepVolume;

      bleepSource.connect(bleepGain);
      bleepGain.connect(offlineContext.destination);

      // Loop the bleep if needed for longer segments
      if (duration > bleepBuffer.duration) {
        bleepSource.loop = true;
        bleepSource.loopEnd = bleepBuffer.duration;
      }

      bleepSource.start(startTime, 0, duration);
    }
  });

  // Start the original audio
  source.start(0);

  // Render the censored audio
  const renderedBuffer = await offlineContext.startRendering();

  // Convert to WAV blob
  const censoredAudioBlob = await audioBufferToWav(renderedBuffer);

  // Step 3: Remux video with censored audio using worker
  const remuxWorker = new Worker(new URL('../../app/workers/remuxWorker.ts', import.meta.url), {
    type: 'module',
  });

  const remuxedVideo = await new Promise<Blob>((resolve, reject) => {
    remuxWorker.onmessage = event => {
      if (event.data.type === 'complete') {
        const videoBlob = new Blob([event.data.videoBuffer], { type: 'video/mp4' });
        resolve(videoBlob);
        remuxWorker.terminate();
      } else if (event.data.type === 'error') {
        reject(new Error(event.data.error));
        remuxWorker.terminate();
      }
    };

    remuxWorker.onerror = error => {
      reject(error);
      remuxWorker.terminate();
    };

    Promise.all([videoFile.arrayBuffer(), censoredAudioBlob.arrayBuffer()]).then(
      ([videoBuffer, audioBuffer]) => {
        remuxWorker.postMessage(
          {
            type: 'remux',
            videoBuffer,
            audioBuffer,
          },
          [videoBuffer, audioBuffer]
        );
      }
    );
  });

  console.log('Video bleeping complete!');
  return remuxedVideo;
}
