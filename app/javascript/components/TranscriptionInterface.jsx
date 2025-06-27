import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { TranscriptionService } from "../services/transcriptionService";
import { Button, Select, Progress, Alert, Space, Typography } from "antd";
import { CloudUploadOutlined, LoadingOutlined } from "@ant-design/icons";

const { Title } = Typography;
const { Option } = Select;

const TranscriptionInterface = () => {
  const [service] = useState(() => new TranscriptionService());
  const [languages, setLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState("auto");
  const [selectedModel, setSelectedModel] = useState("base");
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [transcriptionResults, setTranscriptionResults] = useState([]);
  const [audioFile, setAudioFile] = useState(null);

  // Load supported languages on mount
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const supportedLanguages = await service.getSupportedLanguages();
        setLanguages(supportedLanguages);
      } catch (err) {
        console.error("Failed to load languages:", err);
        setError("Failed to load supported languages");
      }
    };
    loadLanguages();
  }, [service]);

  const handleModelChange = useCallback((value) => {
    setSelectedModel(value);
  }, []);

  const handleLanguageChange = useCallback((value) => {
    setSelectedLanguage(value);
  }, []);

  const handleTranscriptionProgress = useCallback((progress) => {
    setProgress(Math.round(progress * 100));
  }, []);

  const handleChunkComplete = useCallback((chunk) => {
    setTranscriptionResults((prev) => [...prev, ...chunk]);
  }, []);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setAudioFile(file);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "audio/*": [".mp3", ".wav", ".m4a", ".ogg", ".flac"],
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleTranscribe = useCallback(async () => {
    if (!audioFile) {
      setError("Please select an audio file first");
      return;
    }

    setError(null);
    setProgress(0);
    setTranscriptionResults([]);
    setIsProcessing(true);

    try {
      const modelId =
        selectedModel === "base"
          ? "onnx-community/whisper-base_timestamped"
          : "onnx-community/whisper-large-v3-turbo_timestamped";

      const arrayBuffer = await audioFile.arrayBuffer();
      await service.transcribe(arrayBuffer, {
        model: modelId,
        language: selectedLanguage,
        onProgress: handleTranscriptionProgress,
        onChunkComplete: handleChunkComplete,
      });
    } catch (err) {
      console.error("Transcription failed:", err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [
    service,
    selectedModel,
    selectedLanguage,
    handleTranscriptionProgress,
    handleChunkComplete,
    audioFile,
  ]);

  return (
    <div className="transcription-interface">
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Title level={2}>Audio Transcription</Title>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            closable
            onClose={() => setError(null)}
          />
        )}

        <Space>
          <Select
            value={selectedModel}
            onChange={handleModelChange}
            style={{ width: 200 }}
            disabled={isProcessing}
          >
            <Option value="base">Base Model (Faster)</Option>
            <Option value="large">Large Model (More Accurate)</Option>
          </Select>

          <Select
            value={selectedLanguage}
            onChange={handleLanguageChange}
            style={{ width: 200 }}
            disabled={isProcessing}
          >
            {languages.map(({ code, name }) => (
              <Option key={code} value={code}>
                {name}
              </Option>
            ))}
          </Select>
        </Space>

        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? "active" : ""} ${
            audioFile ? "has-file" : ""
          }`}
          data-testid="dropzone"
        >
          <input {...getInputProps()} />
          <CloudUploadOutlined
            style={{ fontSize: "24px", marginBottom: "8px" }}
          />
          {audioFile ? (
            <p>Selected: {audioFile.name}</p>
          ) : isDragActive ? (
            <p>Drop the audio file here</p>
          ) : (
            <p>Drag & drop an audio file here, or click to select</p>
          )}
          <p className="file-info">Supports MP3, WAV, M4A, OGG, FLAC</p>
        </div>

        <Button
          type="primary"
          onClick={handleTranscribe}
          disabled={!audioFile || isProcessing}
          icon={isProcessing ? <LoadingOutlined /> : null}
          data-testid="transcribe-button"
        >
          {isProcessing ? "Transcribing..." : "Start Transcription"}
        </Button>

        {isProcessing && (
          <Progress
            percent={progress}
            status="active"
            format={(percent) => `${percent}% Complete`}
          />
        )}

        <div className="transcription-results">
          {transcriptionResults.map((result, index) => (
            <div key={index} className="transcription-segment">
              <span className="timestamp">
                [{Math.floor(result.start)}s - {Math.ceil(result.end)}s]
              </span>
              <span className="text">{result.text}</span>
            </div>
          ))}
        </div>
      </Space>

      <style jsx>{`
        .transcription-interface {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }
        .dropzone {
          padding: 20px;
          border: 2px dashed #d9d9d9;
          border-radius: 4px;
          background-color: #fafafa;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .dropzone:hover {
          border-color: #1890ff;
        }
        .dropzone.active {
          border-color: #1890ff;
          background-color: #e6f7ff;
        }
        .dropzone.has-file {
          border-color: #52c41a;
          background-color: #f6ffed;
        }
        .file-info {
          color: #666;
          font-size: 12px;
          margin-top: 8px;
        }
        .transcription-results {
          margin-top: 20px;
          max-height: 400px;
          overflow-y: auto;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          padding: 10px;
        }
        .transcription-segment {
          margin: 10px 0;
          padding: 5px;
          border-bottom: 1px solid #f0f0f0;
        }
        .timestamp {
          color: #666;
          margin-right: 10px;
          font-family: monospace;
        }
        .text {
          font-size: 16px;
        }
      `}</style>
    </div>
  );
};

export default TranscriptionInterface;
