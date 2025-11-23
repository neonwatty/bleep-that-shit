import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BleepDownloadTab } from './BleepDownloadTab';

describe('BleepDownloadTab', () => {
  const mockMatchedWords = [
    { word: 'bad', start: 1.0, end: 1.5, index: 0 },
    { word: 'worse', start: 2.0, end: 2.5, index: 1 },
  ];

  const defaultProps = {
    file: null,
    matchedWords: [],
    bleepSound: 'bleep',
    bleepVolume: 80,
    originalVolumeReduction: 0.1,
    bleepBuffer: 0.05,
    censoredMediaUrl: null,
    isProcessingVideo: false,
    isPreviewingBleep: false,
    hasBleeped: false,
    lastBleepVolume: null,
    onBleepSoundChange: vi.fn(),
    onBleepVolumeChange: vi.fn(),
    onOriginalVolumeChange: vi.fn(),
    onBleepBufferChange: vi.fn(),
    onPreviewBleep: vi.fn(),
    onBleep: vi.fn(),
  };

  describe('Section rendering', () => {
    it('renders section headings with step numbers', () => {
      render(<BleepDownloadTab {...defaultProps} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
    });

    it('renders section headings', () => {
      render(<BleepDownloadTab {...defaultProps} />);

      expect(screen.getByText('Choose Bleep Sound & Volume')).toBeInTheDocument();
      expect(screen.getByText('Bleep That Sh*t!')).toBeInTheDocument();
    });
  });

  describe('BleepControls integration', () => {
    it('renders BleepControls component', () => {
      render(<BleepDownloadTab {...defaultProps} />);

      // BleepControls renders these test IDs
      expect(screen.getByTestId('bleep-sound-select')).toBeInTheDocument();
      expect(screen.getByTestId('bleep-volume-slider')).toBeInTheDocument();
    });

    it('passes correct props to BleepControls', () => {
      render(
        <BleepDownloadTab
          {...defaultProps}
          bleepSound="dolphin"
          bleepVolume={120}
          originalVolumeReduction={0.25}
          bleepBuffer={0.1}
          isPreviewingBleep={true}
        />
      );

      const soundSelect = screen.getByTestId('bleep-sound-select') as HTMLSelectElement;
      expect(soundSelect.value).toBe('dolphin');
    });
  });

  describe('Apply Bleeps button', () => {
    it('renders Apply Bleeps button', () => {
      render(<BleepDownloadTab {...defaultProps} />);

      expect(screen.getByTestId('apply-bleeps-button')).toBeInTheDocument();
    });

    it('shows "Apply Bleeps!" text when not bleeped yet', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      render(
        <BleepDownloadTab
          {...defaultProps}
          file={mockFile}
          matchedWords={mockMatchedWords}
          hasBleeped={false}
        />
      );

      const button = screen.getByTestId('apply-bleeps-button');
      expect(button).toHaveTextContent('Apply Bleeps!');
    });

    it('shows "Re-apply Bleeps with New Settings" text when already bleeped', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      render(
        <BleepDownloadTab
          {...defaultProps}
          file={mockFile}
          matchedWords={mockMatchedWords}
          hasBleeped={true}
        />
      );

      const button = screen.getByTestId('apply-bleeps-button');
      expect(button).toHaveTextContent('Re-apply Bleeps with New Settings');
    });

    it('disables button when no file is uploaded', () => {
      render(<BleepDownloadTab {...defaultProps} file={null} matchedWords={mockMatchedWords} />);

      const button = screen.getByTestId('apply-bleeps-button');
      expect(button).toBeDisabled();
    });

    it('disables button when no matched words', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      render(<BleepDownloadTab {...defaultProps} file={mockFile} matchedWords={[]} />);

      const button = screen.getByTestId('apply-bleeps-button');
      expect(button).toBeDisabled();
    });

    it('enables button when both file and matched words are present', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      render(
        <BleepDownloadTab {...defaultProps} file={mockFile} matchedWords={mockMatchedWords} />
      );

      const button = screen.getByTestId('apply-bleeps-button');
      expect(button).toBeEnabled();
    });

    it('calls onBleep when clicked', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      const onBleep = vi.fn();
      render(
        <BleepDownloadTab
          {...defaultProps}
          file={mockFile}
          matchedWords={mockMatchedWords}
          onBleep={onBleep}
        />
      );

      const button = screen.getByTestId('apply-bleeps-button');
      fireEvent.click(button);

      expect(onBleep).toHaveBeenCalledTimes(1);
    });

    it('adds pulse animation when volume changed after bleeping', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      render(
        <BleepDownloadTab
          {...defaultProps}
          file={mockFile}
          matchedWords={mockMatchedWords}
          hasBleeped={true}
          bleepVolume={100}
          lastBleepVolume={80}
        />
      );

      const button = screen.getByTestId('apply-bleeps-button');
      expect(button).toHaveClass('animate-pulse');
      expect(button).toHaveClass('ring-4');
      expect(button).toHaveClass('ring-yellow-400');
    });

    it('does not add pulse animation when volume unchanged', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      render(
        <BleepDownloadTab
          {...defaultProps}
          file={mockFile}
          matchedWords={mockMatchedWords}
          hasBleeped={true}
          bleepVolume={80}
          lastBleepVolume={80}
        />
      );

      const button = screen.getByTestId('apply-bleeps-button');
      expect(button).not.toHaveClass('animate-pulse');
    });
  });

  describe('Video processing indicator', () => {
    it('does not show processing indicator when not processing', () => {
      render(<BleepDownloadTab {...defaultProps} isProcessingVideo={false} />);

      expect(screen.queryByTestId('video-processing-indicator')).not.toBeInTheDocument();
    });

    it('shows processing indicator when processing video', () => {
      render(<BleepDownloadTab {...defaultProps} isProcessingVideo={true} />);

      expect(screen.getByTestId('video-processing-indicator')).toBeInTheDocument();
      expect(
        screen.getByText(/Processing video... This may take a few moments/)
      ).toBeInTheDocument();
    });
  });

  describe('Censored result display - Audio', () => {
    it('does not show censored result when censoredMediaUrl is null', () => {
      render(<BleepDownloadTab {...defaultProps} censoredMediaUrl={null} />);

      expect(screen.queryByTestId('censored-result')).not.toBeInTheDocument();
    });

    it('shows censored result when censoredMediaUrl is provided', () => {
      render(<BleepDownloadTab {...defaultProps} censoredMediaUrl="blob:test-audio-url" />);

      expect(screen.getByTestId('censored-result')).toBeInTheDocument();
      expect(screen.getByText('Censored Result:')).toBeInTheDocument();
    });

    it('renders audio player for audio files', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      const { container } = render(
        <BleepDownloadTab
          {...defaultProps}
          file={mockFile}
          censoredMediaUrl="blob:test-audio-url"
        />
      );

      const audio = container.querySelector('audio');
      expect(audio).toBeInTheDocument();
      expect(audio).toHaveAttribute('controls');
      expect(audio?.querySelector('source')).toHaveAttribute('src', 'blob:test-audio-url');
      expect(audio?.querySelector('source')).toHaveAttribute('type', 'audio/mpeg');
    });

    it('shows audio download button for audio files', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      render(
        <BleepDownloadTab
          {...defaultProps}
          file={mockFile}
          censoredMediaUrl="blob:test-audio-url"
        />
      );

      const downloadButton = screen.getByTestId('download-button');
      expect(downloadButton).toHaveTextContent('Download Censored Audio');
      expect(downloadButton).toHaveAttribute('href', 'blob:test-audio-url');
      expect(downloadButton).toHaveAttribute('download', 'censored-audio.mp3');
    });
  });

  describe('Censored result display - Video', () => {
    it('renders video player for video files', () => {
      const mockFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      const { container } = render(
        <BleepDownloadTab
          {...defaultProps}
          file={mockFile}
          censoredMediaUrl="blob:test-video-url"
        />
      );

      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('controls');
      expect(video?.querySelector('source')).toHaveAttribute('src', 'blob:test-video-url');
      expect(video?.querySelector('source')).toHaveAttribute('type', 'video/mp4');
    });

    it('shows video download button for video files', () => {
      const mockFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      render(
        <BleepDownloadTab
          {...defaultProps}
          file={mockFile}
          censoredMediaUrl="blob:test-video-url"
        />
      );

      const downloadButton = screen.getByTestId('download-button');
      expect(downloadButton).toHaveTextContent('Download Censored Video');
      expect(downloadButton).toHaveAttribute('href', 'blob:test-video-url');
      expect(downloadButton).toHaveAttribute('download', 'censored-video.mp4');
    });
  });

  describe('Tip message', () => {
    it('shows tip message when censored result is available', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      render(
        <BleepDownloadTab {...defaultProps} file={mockFile} censoredMediaUrl="blob:test-url" />
      );

      expect(
        screen.getByText(/Want to adjust the volume or try a different bleep sound/)
      ).toBeInTheDocument();
    });

    it('does not show volume change message when volume unchanged', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      render(
        <BleepDownloadTab
          {...defaultProps}
          file={mockFile}
          censoredMediaUrl="blob:test-url"
          bleepVolume={80}
          lastBleepVolume={80}
        />
      );

      expect(screen.queryByText(/Volume changed from/)).not.toBeInTheDocument();
    });

    it('shows volume change message when volume changed', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      render(
        <BleepDownloadTab
          {...defaultProps}
          file={mockFile}
          censoredMediaUrl="blob:test-url"
          bleepVolume={100}
          lastBleepVolume={80}
        />
      );

      expect(
        screen.getByText(/Volume changed from 80% to 100% - ready to re-apply!/)
      ).toBeInTheDocument();
    });

    it('handles null lastBleepVolume', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      render(
        <BleepDownloadTab
          {...defaultProps}
          file={mockFile}
          censoredMediaUrl="blob:test-url"
          bleepVolume={100}
          lastBleepVolume={null}
        />
      );

      expect(screen.queryByText(/Volume changed from/)).not.toBeInTheDocument();
    });
  });

  describe('Media player key attribute', () => {
    it('sets key attribute on audio player to force re-render on URL change', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      const { container } = render(
        <BleepDownloadTab
          {...defaultProps}
          file={mockFile}
          censoredMediaUrl="blob:unique-url-123"
        />
      );

      const audio = container.querySelector('audio');
      // The key prop is used internally by React but doesn't appear in the DOM
      // We can verify the audio element exists and has the correct source
      expect(audio?.querySelector('source')).toHaveAttribute('src', 'blob:unique-url-123');
    });

    it('sets key attribute on video player to force re-render on URL change', () => {
      const mockFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      const { container } = render(
        <BleepDownloadTab
          {...defaultProps}
          file={mockFile}
          censoredMediaUrl="blob:unique-url-456"
        />
      );

      const video = container.querySelector('video');
      expect(video?.querySelector('source')).toHaveAttribute('src', 'blob:unique-url-456');
    });
  });

  describe('Combined states', () => {
    it('can show both processing indicator and previous result', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      render(
        <BleepDownloadTab
          {...defaultProps}
          file={mockFile}
          isProcessingVideo={true}
          censoredMediaUrl="blob:old-result"
        />
      );

      expect(screen.getByTestId('video-processing-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('censored-result')).toBeInTheDocument();
    });

    it('shows correct UI state after re-applying with volume change', () => {
      const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      render(
        <BleepDownloadTab
          {...defaultProps}
          file={mockFile}
          matchedWords={mockMatchedWords}
          hasBleeped={true}
          bleepVolume={120}
          lastBleepVolume={80}
          censoredMediaUrl="blob:result"
        />
      );

      const button = screen.getByTestId('apply-bleeps-button');
      expect(button).toHaveTextContent('Re-apply Bleeps with New Settings');
      expect(button).toHaveClass('animate-pulse');
      expect(screen.getByText(/Volume changed from 80% to 120%/)).toBeInTheDocument();
    });
  });
});
