'use client'

import { useState, useRef } from 'react'
import { useDropzone } from 'react-dropzone'

interface ModelResult {
  model: string
  text: string
  time: number
  status: 'pending' | 'processing' | 'complete' | 'error'
  error?: string
}

export default function SamplerPage() {
  const [file, setFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [sampleStart, setSampleStart] = useState(0)
  const [sampleDuration, setSampleDuration] = useState(10)
  const [language, setLanguage] = useState('en')
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<ModelResult[]>([])
  const [fileDurationWarning, setFileDurationWarning] = useState<string | null>(null)
  
  const audioRef = useRef<HTMLAudioElement>(null)

  const models = [
    { id: 'Xenova/whisper-tiny.en', name: 'Tiny (English)', size: '39 MB' },
    { id: 'Xenova/whisper-base.en', name: 'Base (English)', size: '74 MB' },
    { id: 'Xenova/whisper-small.en', name: 'Small (English)', size: '242 MB' },
    { id: 'Xenova/whisper-tiny', name: 'Tiny (Multilingual)', size: '39 MB' },
    { id: 'Xenova/whisper-base', name: 'Base (Multilingual)', size: '74 MB' },
    { id: 'Xenova/whisper-small', name: 'Small (Multilingual)', size: '242 MB' }
  ]

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0]
      if (file && (file.type.includes('audio') || file.type.includes('video'))) {
        setFile(file)
        const url = URL.createObjectURL(file)
        setFileUrl(url)
        setResults([])
        setFileDurationWarning(null)
        
        // Check file duration
        try {
          const mediaElement = document.createElement(file.type.includes('video') ? 'video' : 'audio')
          mediaElement.src = url
          
          await new Promise((resolve) => {
            mediaElement.addEventListener('loadedmetadata', () => {
              const duration = mediaElement.duration
              if (duration > 600) { // 10 minutes = 600 seconds
                const minutes = Math.floor(duration / 60)
                const seconds = Math.floor(duration % 60)
                setFileDurationWarning(`This file is ${minutes}:${seconds.toString().padStart(2, '0')} long. The sampler works on files of any length, but full transcription is limited to 10 minutes.`)
              }
              resolve(null)
            })
          })
        } catch (error) {
          console.error('Error checking file duration:', error)
        }
      }
    },
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a'],
      'video/*': ['.mp4', '.mov', '.avi']
    },
    multiple: false
  })

  const handleSampleAll = async () => {
    if (!file) return

    setIsProcessing(true)
    
    // Initialize results
    const initialResults: ModelResult[] = models.map(model => ({
      model: model.name,
      text: '',
      time: 0,
      status: 'pending'
    }))
    setResults(initialResults)

    // Process each model
    for (let i = 0; i < models.length; i++) {
      const model = models[i]
      
      // Update status to processing
      setResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: 'processing' as const } : r
      ))

      try {
        const startTime = Date.now()
        
        // Create a webpack worker for this model
        const worker = new Worker(
          new URL('../workers/transcriptionSamplerWorker.ts', import.meta.url),
          { type: 'module' }
        )
        
        await new Promise<void>((resolve, reject) => {
          worker.onmessage = (event) => {
            const { type, result, error } = event.data
            
            if (type === 'complete' && result) {
              const endTime = Date.now()
              setResults(prev => prev.map((r, idx) => 
                idx === i ? {
                  ...r,
                  text: result.text,
                  time: (endTime - startTime) / 1000,
                  status: 'complete' as const
                } : r
              ))
              worker.terminate()
              resolve()
            }
            
            if (error) {
              setResults(prev => prev.map((r, idx) => 
                idx === i ? {
                  ...r,
                  status: 'error' as const,
                  error: error
                } : r
              ))
              worker.terminate()
              reject(error)
            }
          }

          // Extract and decode sample from file
          file.arrayBuffer().then(async buffer => {
            try {
              // Decode audio in main thread
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 })
              const decodedBuffer = await audioContext.decodeAudioData(buffer.slice(0))
              
              // Extract the sample based on start and duration
              const startSample = Math.floor(sampleStart * 16000)
              const durationSamples = Math.floor(sampleDuration * 16000)
              const channelData = decodedBuffer.getChannelData(0)
              
              // Extract the sample
              const sampleAudio = new Float32Array(durationSamples)
              for (let i = 0; i < durationSamples && startSample + i < channelData.length; i++) {
                sampleAudio[i] = channelData[startSample + i]
              }
              
              // Send to worker
              const sampleCopy = new Float32Array(sampleAudio)
              worker.postMessage({
                audioData: sampleCopy,
                model: model.id,
                language
              }, [sampleCopy.buffer])
            } catch (err) {
              console.error('Error decoding audio:', err)
              worker.postMessage({ error: 'Failed to decode audio' })
            }
          })
        })
        
      } catch (error) {
        console.error(`Error with model ${model.name}:`, error)
      }
    }

    setIsProcessing(false)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime
      setSampleStart(Math.floor(currentTime))
    }
  }

  return (
    <div className="editorial-section">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold uppercase text-black font-inter mb-4">
          Transcription Sampler
        </h1>
        <p className="text-lg text-gray-700">
          Compare different Whisper models on a short audio sample to find the best balance of speed and accuracy for your needs.
        </p>
      </div>

      {/* Info Box */}
      <div className="mb-8 p-4 bg-blue-50 border-l-4 border-blue-400">
        <h2 className="font-bold text-blue-900 mb-2">Why use the sampler?</h2>
        <ul className="list-disc pl-5 text-blue-800">
          <li>Test multiple models on the same audio snippet</li>
          <li>Compare transcription accuracy across models</li>
          <li>See performance differences (speed vs quality)</li>
          <li>Choose the right model before processing your full file</li>
        </ul>
        <div className="mt-3 text-sm text-blue-900">
          <span className="inline-flex items-center">⏱️ <strong className="ml-1">Note:</strong> Full transcription supports files up to 10 minutes.</span>
        </div>
      </div>

      {/* Step 1: Upload */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 font-inter">Step 1: Upload Audio/Video</h2>
        
        <div 
          {...getRootProps()} 
          className="border-2 border-dashed border-gray-400 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-gray-700">Drop the file here...</p>
          ) : (
            <div>
              <p className="text-gray-700 mb-2">Drag and drop your audio or video file here</p>
              <p className="text-sm text-gray-500">or click to browse</p>
            </div>
          )}
        </div>

        {fileDurationWarning && (
          <div className="mt-3 p-3 bg-orange-100 border border-orange-400 text-orange-800 rounded">
            <div className="flex items-start">
              <span className="mr-2">⚠️</span>
              <div>{fileDurationWarning}</div>
            </div>
          </div>
        )}

        {file && (
          <div className="mt-4">
            <p className="text-green-700 font-semibold mb-2">File loaded: {file.name}</p>
            {fileUrl && (
              <audio 
                ref={audioRef}
                controls 
                className="w-full"
                onTimeUpdate={handleTimeUpdate}
              >
                <source src={fileUrl} type={file.type} />
              </audio>
            )}
          </div>
        )}
      </section>

      {/* Step 2: Configure Sample */}
      {file && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 font-inter">Step 2: Configure Sample</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Sample Start (seconds)</label>
              <input 
                type="number"
                value={sampleStart}
                onChange={(e) => setSampleStart(Number(e.target.value))}
                min="0"
                className="w-full p-2 border border-gray-300 rounded"
              />
              <p className="text-xs text-gray-500 mt-1">Click on the audio player to set start time</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2">Sample Duration (seconds)</label>
              <input 
                type="number"
                value={sampleDuration}
                onChange={(e) => setSampleDuration(Number(e.target.value))}
                min="5"
                max="30"
                className="w-full p-2 border border-gray-300 rounded"
              />
              <p className="text-xs text-gray-500 mt-1">5-30 seconds recommended</p>
            </div>
            
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
          </div>
        </section>
      )}

      {/* Step 3: Run Comparison */}
      {file && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 font-inter">Step 3: Run Comparison</h2>
          
          <button 
            onClick={handleSampleAll}
            disabled={isProcessing}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Compare All Models'}
          </button>

          <div className="mt-6 text-sm text-gray-600">
            <p>⚠️ First-time model downloads may take longer (39-242 MB per model)</p>
            <p>Models are cached locally for faster subsequent use</p>
          </div>
        </section>
      )}

      {/* Results */}
      {results.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 font-inter">Results</h2>
          
          <div className="space-y-4">
            {results.map((result, index) => (
              <div 
                key={index}
                className={`p-4 border rounded-lg ${
                  result.status === 'complete' ? 'border-green-400 bg-green-50' :
                  result.status === 'error' ? 'border-red-400 bg-red-50' :
                  result.status === 'processing' ? 'border-blue-400 bg-blue-50' :
                  'border-gray-300 bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{result.model}</h3>
                  <div className="text-right">
                    {result.status === 'complete' && (
                      <span className="text-green-600 font-semibold">
                        ✓ {result.time.toFixed(2)}s
                      </span>
                    )}
                    {result.status === 'processing' && (
                      <span className="text-blue-600">Processing...</span>
                    )}
                    {result.status === 'error' && (
                      <span className="text-red-600">Error</span>
                    )}
                    {result.status === 'pending' && (
                      <span className="text-gray-500">Waiting...</span>
                    )}
                  </div>
                </div>
                
                {result.text && (
                  <div className="mt-2 p-3 bg-white rounded border border-gray-200">
                    <p className="text-sm">{result.text}</p>
                  </div>
                )}
                
                {result.error && (
                  <div className="mt-2 text-red-600 text-sm">
                    Error: {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          {results.every(r => r.status === 'complete') && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-400 rounded">
              <h3 className="font-bold mb-2">Recommendation</h3>
              <p className="text-sm">
                Based on your results, consider using{' '}
                <strong>
                  {results.reduce((fastest, current) => 
                    current.time < fastest.time ? current : fastest
                  ).model}
                </strong>{' '}
                for the fastest processing, or review the transcriptions above for accuracy.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}