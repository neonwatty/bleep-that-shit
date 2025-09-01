'use client'

import { useState, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import dynamic from 'next/dynamic'
import { decodeAudioToMono16kHzPCM } from '@/lib/utils/audioDecode'
import { applyBleeps, applyBleepsToVideo } from '@/lib/utils/audioProcessor'
import 'plyr-react/plyr.css'

// Dynamically import Plyr to avoid SSR issues
const Plyr = dynamic(() => import('plyr-react'), { 
  ssr: false,
  loading: () => <p>Loading player...</p>
})

interface TranscriptionResult {
  text: string
  chunks: Array<{
    text: string
    timestamp: [number, number]
  }>
}

export default function BleepPage() {
  const [file, setFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [language, setLanguage] = useState('en')
  const [model, setModel] = useState('Xenova/whisper-tiny.en')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [wordsToMatch, setWordsToMatch] = useState('')
  const [matchMode, setMatchMode] = useState({
    exact: true,
    partial: false,
    fuzzy: false
  })
  const [fuzzyDistance, setFuzzyDistance] = useState(1)
  const [matchedWords, setMatchedWords] = useState<Array<{word: string, start: number, end: number}>>([])
  const [bleepSound, setBleepSound] = useState('bleep')
  const [censoredAudioUrl, setCensoredAudioUrl] = useState<string | null>(null)
  const [showFileWarning, setShowFileWarning] = useState(false)
  
  const workerRef = useRef<Worker | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0]
      if (file && (file.type.includes('audio') || file.type.includes('video'))) {
        setFile(file)
        setFileUrl(URL.createObjectURL(file))
        setShowFileWarning(false)
      } else {
        setShowFileWarning(true)
      }
    },
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a'],
      'video/*': ['.mp4', '.mov', '.avi']
    },
    multiple: false
  })

  const handleTranscribe = async () => {
    if (!file) return

    setIsTranscribing(true)
    setProgress(0)
    setProgressText('Initializing...')

    try {
      // Initialize worker using webpack
      if (!workerRef.current) {
        console.log('[Main] Creating new webpack worker')
        
        // Use webpack worker syntax
        workerRef.current = new Worker(
          new URL('../workers/transcriptionWorker.ts', import.meta.url),
          { type: 'module' }
        )
        console.log('[Main] Worker created successfully')
      } else {
        console.log('[Main] Using existing worker')
      }

      const worker = workerRef.current
      
      // Set up error handler first
      worker.onerror = (error) => {
        console.error('[Main] Worker error:', error)
        setErrorMessage('Worker error occurred')
        setIsTranscribing(false)
      }

      // Set up message handler
      worker.onmessage = (event) => {
        console.log('[Main] Received message from worker:', event.data)
        const { type, progress: workerProgress, status, result, error, debug } = event.data
        
        if (debug) {
          console.log(debug)
        }
        if (workerProgress) {
          setProgress(workerProgress)
        }
        if (status) {
          setProgressText(status)
        }
        if (type === 'complete' && result) {
          setTranscriptionResult(result)
          setIsTranscribing(false)
          setProgress(100)
          setProgressText('Transcription complete!')
        }
        if (type === 'extracted') {
          // Handle extracted audio from video - decode it first
          const audioBuffer = event.data.audioBuffer
          setProgressText('Decoding extracted audio...')
          
          // Decode in an async IIFE since onmessage can't be async
          ;(async () => {
            try {
              // Create AudioContext and decode the WAV buffer
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 })
              const decodedAudio = await audioContext.decodeAudioData(audioBuffer)
              const float32Audio = decodedAudio.getChannelData(0)
              
              console.log('Decoded extracted audio to Float32Array, length:', float32Audio.length)
              
              // Create a copy to transfer
              const audioCopy = new Float32Array(float32Audio)
              
              // Send decoded audio to worker with transfer
              worker.postMessage({
                type: 'transcribe',
                audioData: audioCopy,
                model,
                language
              }, [audioCopy.buffer])
            } catch (decodeError) {
              console.error('Failed to decode extracted audio:', decodeError)
              setErrorMessage('Failed to decode extracted audio from video')
              setIsTranscribing(false)
            }
          })()
        }
        if (error) {
          console.error('Worker error:', error)
          setIsTranscribing(false)
          setProgressText('Error: ' + error)
          setErrorMessage(error)
          // Show error in UI
          setTranscriptionResult(null)
        }
      }

      // For audio files, decode to Float32Array in main thread
      if (file.type.includes('audio')) {
        setProgressText('Decoding audio...')
        setProgress(30)
        
        try {
          // Decode audio to mono 16kHz Float32Array
          const audioData = await decodeAudioToMono16kHzPCM(file)
          console.log('Decoded audio to Float32Array, length:', audioData.length)
          
          // Create a copy to transfer
          const audioCopy = new Float32Array(audioData)
          
          console.log('[Main] Sending to worker - type: transcribe, audioData length:', audioCopy.length, 'model:', model, 'language:', language)
          
          // Send decoded audio to worker with transfer
          worker.postMessage({
            type: 'transcribe',
            audioData: audioCopy,
            fileType: file.type,
            model,
            language
          }, [audioCopy.buffer])
          
          console.log('[Main] Message sent to worker')
        } catch (decodeError) {
          console.error('Audio decode error:', decodeError)
          throw new Error('Failed to decode audio file. Please ensure it\'s a valid audio format.')
        }
      } else if (file.type.includes('video')) {
        // For video files, send to worker for extraction first
        const arrayBuffer = await file.arrayBuffer()
        worker.postMessage({
          type: 'extract',
          fileBuffer: arrayBuffer,
          fileType: file.type,
          model,
          language
        })
      } else {
        throw new Error('Unsupported file type')
      }

    } catch (error) {
      console.error('Transcription error:', error)
      setIsTranscribing(false)
      setProgressText('Error during transcription')
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }

  const handleMatch = () => {
    if (!transcriptionResult || !wordsToMatch) return

    console.log('Starting matching with transcription result:', transcriptionResult)
    console.log('Words to match:', wordsToMatch)
    console.log('Match mode:', matchMode)
    console.log('First 5 chunks:', transcriptionResult.chunks.slice(0, 5).map(c => c.text))
    
    const words = wordsToMatch.toLowerCase().split(',').map(w => w.trim()).filter(Boolean)
    const matched: Array<{word: string, start: number, end: number}> = []
    const matchedChunkIndices = new Set<number>() // Track which chunks have been matched

    if (transcriptionResult.chunks && transcriptionResult.chunks.length > 0) {
      console.log('Sample chunk structure:', transcriptionResult.chunks[0])
    }

    transcriptionResult.chunks.forEach((chunk, index) => {
      const chunkText = chunk.text.toLowerCase().trim()
      // Remove common punctuation for exact matching
      const chunkTextClean = chunkText.replace(/[.,!?;:'"]/g, '')
      let isMatch = false
      
      // Check all search words against this chunk
      for (const word of words) {
        if (matchMode.exact) {
          // Try both with and without punctuation
          if (chunkText === word || chunkTextClean === word) {
            console.log(`Exact match: "${chunk.text}" matches "${word}"`)
            isMatch = true
            break
          }
        }
        if (matchMode.partial && chunkText.includes(word)) {
          isMatch = true
          break // Stop checking other words once we have a match
        }
        if (matchMode.fuzzy) {
          // Simple fuzzy matching (Levenshtein distance)
          const distance = levenshteinDistance(chunkText, word)
          if (distance <= fuzzyDistance) {
            isMatch = true
            break // Stop checking other words once we have a match
          }
        }
      }
      
      // Only add this chunk once, even if multiple search terms match it
      if (isMatch && !matchedChunkIndices.has(index)) {
        matchedChunkIndices.add(index)
        const start = chunk.timestamp ? chunk.timestamp[0] : 0
        const end = chunk.timestamp ? chunk.timestamp[1] : 0
        
        console.log(`Match found: "${chunk.text}" at [${start}, ${end}]`)
        
        matched.push({
          word: chunk.text,
          start: start,
          end: end
        })
      }
    })

    console.log('Total matches found:', matched.length)
    setMatchedWords(matched)
    
    if (matched.length === 0) {
      console.log('No matches found. Check if words exist in transcription.')
    }
  }

  const handleBleep = async () => {
    if (!file || matchedWords.length === 0) {
      console.log('Cannot bleep: no file or no matched words')
      return
    }

    try {
      setProgressText('Applying bleeps...')
      setProgress(0)
      
      console.log('Bleeping', matchedWords.length, 'words with', bleepSound, 'sound')
      console.log('Matched words:', matchedWords)
      
      let censoredBlob: Blob
      
      if (file.type.includes('audio')) {
        // Process audio file
        censoredBlob = await applyBleeps(file, matchedWords, bleepSound)
      } else if (file.type.includes('video')) {
        // Process video file (placeholder for now)
        console.log('Video bleeping not yet fully implemented')
        censoredBlob = await applyBleepsToVideo(file, matchedWords, bleepSound)
      } else {
        throw new Error('Unsupported file type for bleeping')
      }
      
      // Create URL for the censored audio
      const url = URL.createObjectURL(censoredBlob)
      setCensoredAudioUrl(url)
      
      setProgress(100)
      setProgressText('Bleeping complete!')
      
      // Clean up old URL
      if (censoredAudioUrl) {
        URL.revokeObjectURL(censoredAudioUrl)
      }
    } catch (error) {
      console.error('Error applying bleeps:', error)
      setErrorMessage('Failed to apply bleeps: ' + (error instanceof Error ? error.message : 'Unknown error'))
      setProgressText('Error applying bleeps')
    }
  }

  // Simple Levenshtein distance implementation
  const levenshteinDistance = (a: string, b: string): number => {
    const matrix = []
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    return matrix[b.length][a.length]
  }

  useEffect(() => {
    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return (
    <div className="editorial-section">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <span className="inline-block align-middle" aria-label="Waveform icon">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="14" width="4" height="8" rx="2" fill="#111"/>
            <rect x="8" y="10" width="4" height="16" rx="2" fill="#111"/>
            <rect x="14" y="6" width="4" height="24" rx="2" fill="#111"/>
            <rect x="20" y="10" width="4" height="16" rx="2" fill="#111"/>
            <rect x="26" y="14" width="4" height="8" rx="2" fill="#111"/>
          </svg>
        </span>
        <span className="text-2xl md:text-3xl" aria-label="Cursing emoji">🙊</span>
        <h1 className="text-4xl md:text-5xl font-extrabold uppercase leading-tight tracking-tight text-black ml-4 font-inter" style={{lineHeight: '0.95'}}>
          Bleep Your Sh*t!
        </h1>
      </div>

      <div className="mb-8 p-3 bg-yellow-100 border-l-4 border-yellow-400">
        <span className="bg-pink-200 px-2 py-1 rounded font-bold">Process your entire audio or video file</span>, censoring selected words with customizable matching and bleep sounds.
      </div>

      {/* Workflow */}
      <div className="mb-2 text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wide">How it works</div>
      <ol className="mb-8 pl-4 md:pl-6 list-decimal text-gray-900 text-base md:text-lg">
        <li><span className="bg-blue-100 text-blue-900 px-2 py-1 rounded">Upload your file</span> (audio or video).</li>
        <li><span className="bg-green-100 text-green-900 px-2 py-1 rounded">Select language and model</span> for transcription.</li>
        <li><span className="bg-indigo-100 text-indigo-900 px-2 py-1 rounded">Transcribe</span> your file to generate a word-level transcript.</li>
        <li><span className="bg-purple-100 text-purple-900 px-2 py-1 rounded">Enter words and matching modes</span> (exact, partial, fuzzy).</li>
        <li><span className="bg-pink-100 text-pink-900 px-2 py-1 rounded">Run matching</span> to find words to censor.</li>
        <li><span className="bg-yellow-100 text-yellow-900 px-2 py-1 rounded">Choose bleep sound</span> for censorship.</li>
        <li><span className="bg-violet-100 text-violet-900 px-2 py-1 rounded">Bleep That Sh*t! and preview/download the censored result.</span></li>
      </ol>

      {/* Step 1: Upload */}
      <section className="editorial-section border-l-4 border-blue-500 pl-4 mb-12">
        <div className="flex items-center mb-2">
          <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 font-bold text-base">1</span>
          <h2 className="text-2xl font-extrabold uppercase text-black font-inter">Upload Your File</h2>
        </div>
        <p className="mb-2 text-base text-blue-900">Audio (MP3) or Video (MP4) supported. Preview your input before processing.</p>
        
        <div 
          {...getRootProps()} 
          className="border-2 border-dashed border-gray-400 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-gray-700">Drop the file here...</p>
          ) : (
            <p className="text-gray-700">Drag and drop your audio or video file here or click to browse</p>
          )}
        </div>

        {showFileWarning && (
          <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            Please upload a valid audio or video file (MP3, MP4, etc.)
          </div>
        )}

        {file && (
          <div className="mt-4">
            <p className="text-green-700 font-semibold">File loaded: {file.name}</p>
            {fileUrl && file.type.includes('audio') && (
              <audio controls className="mt-2 w-full">
                <source src={fileUrl} type={file.type} />
              </audio>
            )}
            {fileUrl && file.type.includes('video') && (
              <video controls className="mt-2 w-full max-w-lg">
                <source src={fileUrl} type={file.type} />
              </video>
            )}
          </div>
        )}
      </section>

      {/* Step 2: Language & Model */}
      <section className="editorial-section border-l-4 border-green-500 pl-4 mb-12">
        <div className="flex items-center mb-2">
          <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 font-bold text-base">2</span>
          <h2 className="text-2xl font-extrabold uppercase text-black font-inter">Select Language & Model</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Language</label>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="ja">Japanese</option>
              <option value="zh">Chinese</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2">Model</label>
            <select 
              value={model} 
              onChange={(e) => setModel(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="Xenova/whisper-tiny.en">Tiny (English only, fastest)</option>
              <option value="Xenova/whisper-base.en">Base (English only, fast)</option>
              <option value="Xenova/whisper-small.en">Small (English only, balanced)</option>
              <option value="Xenova/whisper-tiny">Tiny (Multilingual)</option>
              <option value="Xenova/whisper-base">Base (Multilingual)</option>
              <option value="Xenova/whisper-small">Small (Multilingual)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Step 3: Transcribe */}
      <section className="editorial-section border-l-4 border-indigo-500 pl-4 mb-12">
        <div className="flex items-center mb-2">
          <span className="bg-indigo-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 font-bold text-base">3</span>
          <h2 className="text-2xl font-extrabold uppercase text-black font-inter">Transcribe</h2>
        </div>
        
        <button 
          onClick={handleTranscribe}
          disabled={!file || isTranscribing}
          className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTranscribing ? 'Transcribing...' : 'Start Transcription'}
        </button>

        {isTranscribing && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{width: `${progress}%`}}
              ></div>
            </div>
            <p className="mt-2 text-sm text-gray-600">{progressText}</p>
          </div>
        )}

        {/* Error Display */}
        {errorMessage && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-red-800 font-semibold">Transcription Error</p>
                <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
                <button 
                  onClick={() => setErrorMessage(null)}
                  className="text-red-600 text-sm underline mt-2 hover:text-red-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {transcriptionResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <h3 className="font-bold mb-2">Transcript:</h3>
            <p className="text-gray-800">{transcriptionResult.text}</p>
            <p className="mt-2 text-sm text-gray-600">
              Found {transcriptionResult.chunks.length} words with timestamps
            </p>
          </div>
        )}
      </section>

      {/* Step 4: Word Matching */}
      <section className={`editorial-section border-l-4 border-purple-500 pl-4 mb-12 ${!transcriptionResult ? 'opacity-50' : ''}`}>
          <div className="flex items-center mb-2">
            <span className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 font-bold text-base">4</span>
            <h2 className="text-2xl font-extrabold uppercase text-black font-inter">Enter Words to Bleep</h2>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Words to match (comma-separated)</label>
            <input 
              type="text"
              value={wordsToMatch}
              onChange={(e) => setWordsToMatch(e.target.value)}
              placeholder="e.g., bad, word, curse"
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Matching modes</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input 
                  type="checkbox"
                  checked={matchMode.exact}
                  onChange={(e) => setMatchMode({...matchMode, exact: e.target.checked})}
                  className="mr-2"
                />
                Exact match
              </label>
              <label className="flex items-center">
                <input 
                  type="checkbox"
                  checked={matchMode.partial}
                  onChange={(e) => setMatchMode({...matchMode, partial: e.target.checked})}
                  className="mr-2"
                />
                Partial match
              </label>
              <label className="flex items-center">
                <input 
                  type="checkbox"
                  checked={matchMode.fuzzy}
                  onChange={(e) => setMatchMode({...matchMode, fuzzy: e.target.checked})}
                  className="mr-2"
                />
                Fuzzy match
              </label>
            </div>
            
            {matchMode.fuzzy && (
              <div className="mt-2">
                <label className="text-sm">Fuzzy distance: {fuzzyDistance}</label>
                <input 
                  type="range"
                  min="1"
                  max="3"
                  value={fuzzyDistance}
                  onChange={(e) => setFuzzyDistance(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>

          <button 
            onClick={handleMatch}
            disabled={!transcriptionResult || !wordsToMatch}
            className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Run Matching
          </button>

          {matchedWords.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 rounded">
              <h3 className="font-bold mb-2">Matched {matchedWords.length} words:</h3>
              <div className="flex flex-wrap gap-2">
                {matchedWords.map((match, i) => (
                  <span key={i} className="bg-yellow-200 px-2 py-1 rounded text-sm">
                    {match.word} ({match.start.toFixed(1)}s - {match.end.toFixed(1)}s)
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

      {/* Step 5: Bleep Sound */}
      <section className={`editorial-section border-l-4 border-yellow-500 pl-4 mb-12 ${matchedWords.length === 0 ? 'opacity-50' : ''}`}>
          <div className="flex items-center mb-2">
            <span className="bg-yellow-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 font-bold text-base">5</span>
            <h2 className="text-2xl font-extrabold uppercase text-black font-inter">Choose Bleep Sound</h2>
          </div>
          
          <select 
            value={bleepSound}
            onChange={(e) => setBleepSound(e.target.value)}
            className="w-full max-w-xs p-2 border border-gray-300 rounded"
          >
            <option value="bleep">Classic Bleep</option>
            <option value="brown">Brown Noise</option>
          </select>
        </section>

      {/* Step 6: Bleep! */}
      <section className={`editorial-section border-l-4 border-violet-500 pl-4 mb-12 ${matchedWords.length === 0 ? 'opacity-50' : ''}`}>
          <div className="flex items-center mb-2">
            <span className="bg-violet-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 font-bold text-base">6</span>
            <h2 className="text-2xl font-extrabold uppercase text-black font-inter">Bleep That Sh*t!</h2>
          </div>
          
          <button 
            onClick={handleBleep}
            disabled={!file || matchedWords.length === 0}
            className="btn btn-pink disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Bleeps!
          </button>

          {censoredAudioUrl && (
            <div className="mt-4">
              <h3 className="font-bold mb-2">Censored Result:</h3>
              <audio controls className="w-full">
                <source src={censoredAudioUrl} type="audio/mpeg" />
              </audio>
              <a 
                href={censoredAudioUrl}
                download="censored-audio.mp3"
                className="mt-2 inline-block bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Download Censored Audio
              </a>
            </div>
          )}
        </section>
    </div>
  )
}