import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  file: File | null;
  fileUrl: string | null;
  isLoadingSample: boolean;
  showFileWarning: boolean;
  fileDurationWarning: string | null;
}

export function FileUpload({
  onFileUpload,
  file,
  fileUrl,
  isLoadingSample,
  showFileWarning,
  fileDurationWarning,
}: FileUploadProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles, fileRejections) => {
      const uploadedFile = acceptedFiles[0];
      if (uploadedFile) {
        onFileUpload(uploadedFile);
      } else if (fileRejections.length > 0) {
        // Handle rejected files (wrong type) by passing the rejected file
        // This will trigger the showFileWarning in the parent
        onFileUpload(fileRejections[0].file);
      }
    },
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a'],
      'video/*': ['.mp4', '.mov', '.avi'],
    },
    multiple: false,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        data-testid="file-dropzone"
        className="min-h-[120px] cursor-pointer rounded-lg border-2 border-dashed border-gray-400 p-8 text-center transition-all hover:border-blue-500 hover:bg-gray-50 active:bg-gray-100 sm:min-h-[100px] sm:p-6"
      >
        <input {...getInputProps()} data-testid="file-input" className="sr-only" />
        {isDragActive ? (
          <p className="text-gray-700">Drop the file here...</p>
        ) : (
          <p className="text-gray-700">
            Drag and drop your audio or video file here or click to browse
          </p>
        )}
      </div>

      {!file && !isLoadingSample && (
        <div className="mt-4 text-center">
          <p className="mb-2 text-sm text-gray-600">No video? Try our sample:</p>
          <a
            href="/bleep?sample=bob-ross"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            🎨 Bob Ross Video
          </a>
        </div>
      )}

      {isLoadingSample && (
        <div className="mt-3 rounded-lg border-l-4 border-blue-400 bg-blue-50 p-3">
          <p className="text-sm text-gray-900 sm:text-base">⏳ Loading sample video...</p>
        </div>
      )}

      {showFileWarning && (
        <div
          data-testid="file-warning"
          className="mt-2 rounded border border-red-400 bg-red-100 p-2 text-red-700"
        >
          Please upload a valid audio or video file (MP3, MP4, etc.)
        </div>
      )}

      {fileDurationWarning && (
        <div
          data-testid="file-duration-warning"
          className="mt-2 rounded border border-orange-400 bg-orange-100 p-3 text-orange-800"
        >
          <div className="flex items-start">
            <span className="mr-2">⚠️</span>
            <div>
              {fileDurationWarning}
              <span className="ml-1 text-sm">
                Need help with longer files?{' '}
                <a
                  href="https://discord.gg/8EUxqR93"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 underline hover:text-indigo-800"
                >
                  Ask on Discord
                </a>
              </span>
            </div>
          </div>
        </div>
      )}

      {file && (
        <div className="mt-4">
          <p className="font-semibold text-green-700">File loaded: {file.name}</p>
          {fileUrl && file.type.includes('audio') && (
            <audio controls className="mt-2 w-full">
              <source src={fileUrl} type={file.type} />
            </audio>
          )}
          {fileUrl && file.type.includes('video') && (
            <video controls className="mx-auto mt-2 max-w-2xl rounded-lg shadow-sm">
              <source src={fileUrl} type={file.type} />
            </video>
          )}
        </div>
      )}
    </div>
  );
}
