import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SetupTranscribeTab } from './SetupTranscribeTab';

describe('SetupTranscribeTab', () => {
  const defaultProps = {
    file: null,
    fileUrl: null,
    isLoadingSample: false,
    showFileWarning: false,
    fileDurationWarning: null,
    onFileUpload: vi.fn(),
    language: 'en',
    model: 'Xenova/whisper-base.en',
    isTranscribing: false,
    transcriptionResult: null,
    progress: 0,
    progressText: '',
    errorMessage: null,
    timestampWarning: null,
    onLanguageChange: vi.fn(),
    onModelChange: vi.fn(),
    onTranscribe: vi.fn(),
    onDismissError: vi.fn(),
  };

  describe('Section rendering', () => {
    it('renders all three sections with step numbers', () => {
      render(<SetupTranscribeTab {...defaultProps} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders section headings', () => {
      render(<SetupTranscribeTab {...defaultProps} />);

      expect(screen.getByText('Upload Your File')).toBeInTheDocument();
      expect(screen.getByText('Select Language & Model')).toBeInTheDocument();
      expect(screen.getByText('Transcribe')).toBeInTheDocument();
    });

    it('renders file upload description', () => {
      render(<SetupTranscribeTab {...defaultProps} />);

      expect(screen.getByText(/Audio \(MP3\) or Video \(MP4\) supported/)).toBeInTheDocument();
    });
  });

  describe('Transcribe button', () => {
    it('renders transcribe button', () => {
      render(<SetupTranscribeTab {...defaultProps} />);

      const button = screen.getByTestId('transcribe-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Start Transcription');
    });

    it('disables transcribe button when no file is uploaded', () => {
      render(<SetupTranscribeTab {...defaultProps} file={null} />);

      const button = screen.getByTestId('transcribe-button');
      expect(button).toBeDisabled();
    });

    it('enables transcribe button when file is uploaded', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      render(<SetupTranscribeTab {...defaultProps} file={mockFile} />);

      const button = screen.getByTestId('transcribe-button');
      expect(button).toBeEnabled();
    });

    it('disables transcribe button when transcription is in progress', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      render(<SetupTranscribeTab {...defaultProps} file={mockFile} isTranscribing={true} />);

      const button = screen.getByTestId('transcribe-button');
      expect(button).toBeDisabled();
    });

    it('shows "Transcribing..." text when transcription is in progress', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      render(<SetupTranscribeTab {...defaultProps} file={mockFile} isTranscribing={true} />);

      const button = screen.getByTestId('transcribe-button');
      expect(button).toHaveTextContent('Transcribing...');
    });

    it('calls onTranscribe when clicked', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      const onTranscribe = vi.fn();
      render(<SetupTranscribeTab {...defaultProps} file={mockFile} onTranscribe={onTranscribe} />);

      const button = screen.getByTestId('transcribe-button');
      fireEvent.click(button);

      expect(onTranscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('Progress display', () => {
    it('does not show progress bar when not transcribing', () => {
      render(<SetupTranscribeTab {...defaultProps} />);

      expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('progress-text')).not.toBeInTheDocument();
    });

    it('shows progress bar when transcribing', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      render(
        <SetupTranscribeTab
          {...defaultProps}
          file={mockFile}
          isTranscribing={true}
          progress={50}
          progressText="Processing..."
        />
      );

      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
      expect(screen.getByTestId('progress-text')).toBeInTheDocument();
    });

    it('displays progress text', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      render(
        <SetupTranscribeTab
          {...defaultProps}
          file={mockFile}
          isTranscribing={true}
          progressText="Loading model (50%)..."
        />
      );

      expect(screen.getByText('Loading model (50%)...')).toBeInTheDocument();
    });

    it('sets progress bar width based on progress prop', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      const { container } = render(
        <SetupTranscribeTab {...defaultProps} file={mockFile} isTranscribing={true} progress={75} />
      );

      const progressFill = container.querySelector('.bg-blue-600');
      expect(progressFill).toHaveStyle({ width: '75%' });
    });
  });

  describe('Error display', () => {
    it('does not show error message when errorMessage is null', () => {
      render(<SetupTranscribeTab {...defaultProps} errorMessage={null} />);

      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });

    it('shows error message when errorMessage is provided', () => {
      render(
        <SetupTranscribeTab {...defaultProps} errorMessage="Transcription failed: Out of memory" />
      );

      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText('Transcription Error')).toBeInTheDocument();
      expect(screen.getByText('Transcription failed: Out of memory')).toBeInTheDocument();
    });

    it('shows Dismiss button in error message', () => {
      render(<SetupTranscribeTab {...defaultProps} errorMessage="Error occurred" />);

      expect(screen.getByText('Dismiss')).toBeInTheDocument();
    });

    it('shows Discord help link in error message', () => {
      render(<SetupTranscribeTab {...defaultProps} errorMessage="Error occurred" />);

      const discordLink = screen.getByText('Get help on Discord');
      expect(discordLink).toBeInTheDocument();
      expect(discordLink).toHaveAttribute('href', 'https://discord.gg/8EUxqR93');
      expect(discordLink).toHaveAttribute('target', '_blank');
      expect(discordLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('calls onDismissError when Dismiss button is clicked', () => {
      const onDismissError = vi.fn();
      render(
        <SetupTranscribeTab
          {...defaultProps}
          errorMessage="Error occurred"
          onDismissError={onDismissError}
        />
      );

      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);

      expect(onDismissError).toHaveBeenCalledTimes(1);
    });
  });

  describe('Transcription result display', () => {
    it('does not show transcript result when transcriptionResult is null', () => {
      render(<SetupTranscribeTab {...defaultProps} transcriptionResult={null} />);

      expect(screen.queryByTestId('transcript-result')).not.toBeInTheDocument();
    });

    it('shows transcript result when transcriptionResult is provided', () => {
      const mockResult = {
        text: 'Hello world this is a test',
        chunks: [
          { text: 'Hello', timestamp: [0, 0.5] as [number, number] },
          { text: 'world', timestamp: [0.5, 1.0] as [number, number] },
          { text: 'this', timestamp: [1.0, 1.3] as [number, number] },
          { text: 'is', timestamp: [1.3, 1.5] as [number, number] },
          { text: 'a', timestamp: [1.5, 1.6] as [number, number] },
          { text: 'test', timestamp: [1.6, 2.0] as [number, number] },
        ],
      };
      render(<SetupTranscribeTab {...defaultProps} transcriptionResult={mockResult} />);

      expect(screen.getByTestId('transcript-result')).toBeInTheDocument();
      expect(screen.getByText('Transcript:')).toBeInTheDocument();
    });

    it('displays transcript text', () => {
      const mockResult = {
        text: 'This is the full transcript text',
        chunks: [{ text: 'test', timestamp: [0, 1] as [number, number] }],
      };
      render(<SetupTranscribeTab {...defaultProps} transcriptionResult={mockResult} />);

      expect(screen.getByTestId('transcript-text')).toHaveTextContent(
        'This is the full transcript text'
      );
    });

    it('displays word count', () => {
      const mockResult = {
        text: 'Hello world',
        chunks: [
          { text: 'Hello', timestamp: [0, 0.5] as [number, number] },
          { text: 'world', timestamp: [0.5, 1.0] as [number, number] },
        ],
      };
      render(<SetupTranscribeTab {...defaultProps} transcriptionResult={mockResult} />);

      expect(screen.getByText('Found 2 words with timestamps')).toBeInTheDocument();
    });

    it('shows success message when transcription is complete', () => {
      const mockResult = {
        text: 'Test',
        chunks: [{ text: 'Test', timestamp: [0, 1] as [number, number] }],
      };
      render(<SetupTranscribeTab {...defaultProps} transcriptionResult={mockResult} />);

      expect(screen.getByText(/Transcription complete!/)).toBeInTheDocument();
      expect(
        screen.getByText(/Continue to the Review & Match tab to select words/)
      ).toBeInTheDocument();
    });
  });

  describe('Timestamp warning display', () => {
    it('does not show timestamp warning when timestampWarning is null', () => {
      render(<SetupTranscribeTab {...defaultProps} timestampWarning={null} />);

      expect(screen.queryByTestId('timestamp-warning')).not.toBeInTheDocument();
    });

    it('shows timestamp warning when timestampWarning is provided', () => {
      render(<SetupTranscribeTab {...defaultProps} timestampWarning={{ count: 5, total: 100 }} />);

      expect(screen.getByTestId('timestamp-warning')).toBeInTheDocument();
      expect(screen.getByText(/Timestamp Quality Warning:/)).toBeInTheDocument();
    });

    it('displays correct warning message with counts', () => {
      render(<SetupTranscribeTab {...defaultProps} timestampWarning={{ count: 12, total: 150 }} />);

      expect(
        screen.getByText(/12 out of 150 words had invalid timestamps and were filtered out/)
      ).toBeInTheDocument();
    });

    it('shows Discord help link in timestamp warning', () => {
      render(<SetupTranscribeTab {...defaultProps} timestampWarning={{ count: 5, total: 100 }} />);

      const links = screen.getAllByText('Get help on Discord');
      const warningLink = links.find(
        link => link.closest('[data-testid="timestamp-warning"]') !== null
      );
      expect(warningLink).toBeDefined();
    });
  });

  describe('Component integration', () => {
    it('passes correct props to FileUpload component', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      const onFileUpload = vi.fn();

      render(
        <SetupTranscribeTab
          {...defaultProps}
          file={mockFile}
          fileUrl="blob:test-url"
          isLoadingSample={true}
          showFileWarning={true}
          fileDurationWarning="File too long"
          onFileUpload={onFileUpload}
        />
      );

      // FileUpload renders the dropzone which has data-testid
      expect(screen.getByTestId('file-dropzone')).toBeInTheDocument();
    });

    it('passes correct props to TranscriptionControls component', () => {
      render(
        <SetupTranscribeTab {...defaultProps} language="es" model="Xenova/whisper-small.en" />
      );

      // TranscriptionControls renders selects with data-testids
      expect(screen.getByTestId('language-select')).toBeInTheDocument();
      expect(screen.getByTestId('model-select')).toBeInTheDocument();
    });
  });

  describe('Conditional rendering combinations', () => {
    it('can show both transcription result and timestamp warning together', () => {
      const mockResult = {
        text: 'Test transcript',
        chunks: [{ text: 'Test', timestamp: [0, 1] as [number, number] }],
      };
      render(
        <SetupTranscribeTab
          {...defaultProps}
          transcriptionResult={mockResult}
          timestampWarning={{ count: 3, total: 50 }}
        />
      );

      expect(screen.getByTestId('transcript-result')).toBeInTheDocument();
      expect(screen.getByTestId('timestamp-warning')).toBeInTheDocument();
    });

    it('can show progress bar and error message together', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      render(
        <SetupTranscribeTab
          {...defaultProps}
          file={mockFile}
          isTranscribing={true}
          progress={30}
          progressText="Processing..."
          errorMessage="Previous error"
        />
      );

      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });
  });
});
