/**
 * Audio processing utilities for applying bleeps/censoring
 */

import { getPublicPath } from './paths'

export interface BleepSegment {
  word: string
  start: number
  end: number
}

/**
 * Apply bleeps to an audio file at specified timestamps
 */
export async function applyBleeps(
  audioFile: File,
  bleepSegments: BleepSegment[],
  bleepSound: string = 'bleep'
): Promise<Blob> {
  // Create audio context
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  
  // Load the original audio
  const arrayBuffer = await audioFile.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  
  // Create offline context for rendering
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  )
  
  // Create buffer source for original audio
  const source = offlineContext.createBufferSource()
  source.buffer = audioBuffer
  
  // Create gain nodes for ducking audio during bleeps
  const gainNode = offlineContext.createGain()
  source.connect(gainNode)
  gainNode.connect(offlineContext.destination)
  
  // Load bleep sound
  const bleepResponse = await fetch(getPublicPath(`/bleeps/${bleepSound}.mp3`))
  const bleepArrayBuffer = await bleepResponse.arrayBuffer()
  const bleepBuffer = await audioContext.decodeAudioData(bleepArrayBuffer)
  
  // Schedule gain automation and bleeps
  const now = offlineContext.currentTime
  
  // Set initial gain
  gainNode.gain.setValueAtTime(1, now)
  
  // Schedule volume ducking for each bleep segment
  bleepSegments.forEach(segment => {
    const startTime = segment.start
    const endTime = segment.end
    const duration = endTime - startTime
    
    // Duck the original audio
    gainNode.gain.setValueAtTime(1, startTime - 0.01)
    gainNode.gain.linearRampToValueAtTime(0.1, startTime) // Reduce to 10% volume
    gainNode.gain.setValueAtTime(0.1, endTime)
    gainNode.gain.linearRampToValueAtTime(1, endTime + 0.01)
    
    // Add bleep sound
    const bleepSource = offlineContext.createBufferSource()
    bleepSource.buffer = bleepBuffer
    
    // Create gain node for bleep to adjust volume
    const bleepGain = offlineContext.createGain()
    bleepGain.gain.value = 0.8
    
    bleepSource.connect(bleepGain)
    bleepGain.connect(offlineContext.destination)
    
    // Loop the bleep if needed for longer segments
    if (duration > bleepBuffer.duration) {
      bleepSource.loop = true
      bleepSource.loopEnd = bleepBuffer.duration
    }
    
    bleepSource.start(startTime, 0, duration)
  })
  
  // Start the original audio
  source.start(0)
  
  // Render the audio
  const renderedBuffer = await offlineContext.startRendering()
  
  // Convert to WAV blob
  const wavBlob = await audioBufferToWav(renderedBuffer)
  
  return wavBlob
}

/**
 * Convert AudioBuffer to WAV blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numberOfChannels = buffer.numberOfChannels
  const length = buffer.length * numberOfChannels * 2 + 44
  const outputBuffer = new ArrayBuffer(length)
  const view = new DataView(outputBuffer)
  const channels: Float32Array[] = []
  let offset = 0
  let pos = 0
  
  // Write WAV header
  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true)
    pos += 2
  }
  
  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true)
    pos += 4
  }
  
  // RIFF identifier
  setUint32(0x46464952) // "RIFF"
  setUint32(length - 8) // file length - 8
  setUint32(0x45564157) // "WAVE"
  
  // Format chunk identifier
  setUint32(0x20746d66) // "fmt "
  setUint32(16) // chunk length
  setUint16(1) // PCM format
  setUint16(numberOfChannels)
  setUint32(buffer.sampleRate)
  setUint32(buffer.sampleRate * 2 * numberOfChannels) // byte rate
  setUint16(numberOfChannels * 2) // block align
  setUint16(16) // bits per sample
  
  // Data chunk identifier
  setUint32(0x61746164) // "data"
  setUint32(length - pos - 4) // chunk length
  
  // Write interleaved data
  for (let i = 0; i < numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i))
  }
  
  while (pos < length) {
    for (let i = 0; i < numberOfChannels; i++) {
      const sample = Math.max(-1, Math.min(1, channels[i][offset])) // clamp
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF // scale to 16-bit
      view.setInt16(pos, intSample, true)
      pos += 2
    }
    offset++
  }
  
  return new Blob([outputBuffer], { type: 'audio/wav' })
}

/**
 * For video files, we need to remux with the censored audio
 */
export async function applyBleepsToVideo(
  videoFile: File,
  bleepSegments: BleepSegment[],
  bleepSound: string = 'bleep'
): Promise<Blob> {
  // This would use FFmpeg.wasm to:
  // 1. Extract audio from video
  // 2. Apply bleeps to audio
  // 3. Remux video with new audio
  // For now, returning a placeholder
  
  console.log('Video bleeping not yet implemented')
  return videoFile
}