import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FileUpload } from './FileUpload';

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn(config => {
    // Store the config for testing purposes
    (global as any).__dropzoneConfig = config;
    return {
      getRootProps: () => ({ 'data-testid': 'file-dropzone' }),
      getInputProps: () => ({ 'data-testid': 'file-input' }),
      isDragActive: (global as any).__isDragActive || false,
    };
  }),
}));

describe('FileUpload', () => {
  const defaultProps = {
    onFileUpload: vi.fn(),
    file: null,
    fileUrl: null,
    isLoadingSample: false,
    showFileWarning: false,
    fileDurationWarning: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global as any).__isDragActive = false;
    // Default to free user
    mockUseAuth.mockReturnValue({
      isPremium: false,
      isLoading: false,
      user: null,
      session: null,
      profile: null,
      subscriptionTier: 'free',
    });
  });

  it('renders the dropzone area', () => {
    render(<FileUpload {...defaultProps} />);

    const dropzone = screen.getByTestId('file-dropzone');
    expect(dropzone).toBeInTheDocument();
  });

  it('renders file input', () => {
    render(<FileUpload {...defaultProps} />);

    const input = screen.getByTestId('file-input');
    expect(input).toBeInTheDocument();
  });

  it('displays default message when not dragging', () => {
    render(<FileUpload {...defaultProps} />);

    expect(
      screen.getByText(/Drag and drop your audio or video file here or click to browse/i)
    ).toBeInTheDocument();
  });

  it('displays drag active message when dragging', () => {
    (global as any).__isDragActive = true;
    render(<FileUpload {...defaultProps} />);

    expect(screen.getByText(/Drop the file here.../i)).toBeInTheDocument();
  });

  it('shows sample video button when no file is loaded', () => {
    render(<FileUpload {...defaultProps} file={null} />);

    expect(screen.getByText(/No video\? Try our sample:/i)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Bob Ross Video/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/bleep?sample=bob-ross');
  });

  it('hides sample video button when file is loaded', () => {
    const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
    render(<FileUpload {...defaultProps} file={mockFile} />);

    expect(screen.queryByText(/No video\? Try our sample:/i)).not.toBeInTheDocument();
  });

  it('hides sample video button when loading sample', () => {
    render(<FileUpload {...defaultProps} isLoadingSample={true} />);

    expect(screen.queryByText(/No video\? Try our sample:/i)).not.toBeInTheDocument();
  });

  it('shows loading message when loading sample', () => {
    render(<FileUpload {...defaultProps} isLoadingSample={true} />);

    expect(screen.getByText(/⏳ Loading sample video.../i)).toBeInTheDocument();
  });

  it('hides loading message when not loading sample', () => {
    render(<FileUpload {...defaultProps} isLoadingSample={false} />);

    expect(screen.queryByText(/⏳ Loading sample video.../i)).not.toBeInTheDocument();
  });

  it('displays file warning when showFileWarning is true', () => {
    render(<FileUpload {...defaultProps} showFileWarning={true} />);

    const warning = screen.getByTestId('file-warning');
    expect(warning).toBeInTheDocument();
    expect(warning).toHaveTextContent(/Please upload a valid audio or video file/i);
  });

  it('hides file warning when showFileWarning is false', () => {
    render(<FileUpload {...defaultProps} showFileWarning={false} />);

    expect(screen.queryByTestId('file-warning')).not.toBeInTheDocument();
  });

  it('displays duration warning when fileDurationWarning is provided', () => {
    render(<FileUpload {...defaultProps} fileDurationWarning="File is too long (15 minutes)" />);

    const warning = screen.getByTestId('file-duration-warning');
    expect(warning).toBeInTheDocument();
    expect(warning).toHaveTextContent('File is too long (15 minutes)');
  });

  it('hides duration warning when fileDurationWarning is null', () => {
    render(<FileUpload {...defaultProps} fileDurationWarning={null} />);

    expect(screen.queryByTestId('file-duration-warning')).not.toBeInTheDocument();
  });

  it('displays Discord link in duration warning', () => {
    render(<FileUpload {...defaultProps} fileDurationWarning="Warning message" />);

    const link = screen.getByRole('link', { name: /Ask on Discord/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://discord.gg/XuzjVXyjH4');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('displays Pro upgrade CTA in duration warning for free users', () => {
    render(<FileUpload {...defaultProps} fileDurationWarning="Warning message" />);

    expect(
      screen.getByText(/Upgrade to Pro to process files up to 2 hours long/i)
    ).toBeInTheDocument();
    const upgradeButton = screen.getByRole('button', { name: /Upgrade to Pro/i });
    expect(upgradeButton).toBeInTheDocument();
  });

  it('displays info message for premium users with long files', () => {
    mockUseAuth.mockReturnValue({
      isPremium: true,
      isLoading: false,
      user: { id: '123' },
      session: {},
      profile: { subscription_tier: 'pro' },
      subscriptionTier: 'pro',
    });

    render(<FileUpload {...defaultProps} fileDurationWarning="Warning message" />);

    expect(screen.getByTestId('file-duration-info')).toBeInTheDocument();
    expect(screen.getByText(/Long file detected/i)).toBeInTheDocument();
    expect(screen.getByText(/As a Pro member/i)).toBeInTheDocument();
  });

  it('does not show upgrade button to premium users', () => {
    mockUseAuth.mockReturnValue({
      isPremium: true,
      isLoading: false,
      user: { id: '123' },
      session: {},
      profile: { subscription_tier: 'pro' },
      subscriptionTier: 'pro',
    });

    render(<FileUpload {...defaultProps} fileDurationWarning="Warning message" />);

    expect(screen.queryByRole('button', { name: /Upgrade to Pro/i })).not.toBeInTheDocument();
  });

  it('displays file name when file is loaded', () => {
    const mockFile = new File(['content'], 'my-test-file.mp3', { type: 'audio/mp3' });
    render(<FileUpload {...defaultProps} file={mockFile} />);

    expect(screen.getByText(/File loaded: my-test-file.mp3/i)).toBeInTheDocument();
  });

  it('displays audio player for audio files', () => {
    const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
    const mockUrl = 'blob:http://localhost/test';
    const { container } = render(
      <FileUpload {...defaultProps} file={mockFile} fileUrl={mockUrl} />
    );

    const audio = container.querySelector('audio');
    expect(audio).toBeInTheDocument();
    expect(audio?.tagName).toBe('AUDIO');
    const source = audio?.querySelector('source');
    expect(source).toHaveAttribute('src', mockUrl);
    expect(source).toHaveAttribute('type', 'audio/mp3');
  });

  it('displays video player for video files', () => {
    const mockFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
    const mockUrl = 'blob:http://localhost/test';
    const { container } = render(
      <FileUpload {...defaultProps} file={mockFile} fileUrl={mockUrl} />
    );

    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video?.tagName).toBe('VIDEO');
    const source = video?.querySelector('source');
    expect(source).toHaveAttribute('src', mockUrl);
    expect(source).toHaveAttribute('type', 'video/mp4');
  });

  it('does not display player when file is loaded but fileUrl is null', () => {
    const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
    const { container } = render(<FileUpload {...defaultProps} file={mockFile} fileUrl={null} />);

    expect(container.querySelector('audio')).not.toBeInTheDocument();
    expect(container.querySelector('video')).not.toBeInTheDocument();
  });

  it('configures dropzone to accept audio and video files', () => {
    render(<FileUpload {...defaultProps} />);

    const config = (global as any).__dropzoneConfig;
    expect(config.accept).toEqual({
      'audio/*': ['.mp3', '.wav', '.m4a'],
      'video/*': ['.mp4', '.mov', '.avi'],
    });
    expect(config.multiple).toBe(false);
  });

  it('calls onFileUpload when file is accepted', () => {
    const onFileUpload = vi.fn();
    render(<FileUpload {...defaultProps} onFileUpload={onFileUpload} />);

    const config = (global as any).__dropzoneConfig;
    const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });

    // Simulate file drop
    config.onDrop([mockFile], []);

    expect(onFileUpload).toHaveBeenCalledWith(mockFile);
    expect(onFileUpload).toHaveBeenCalledTimes(1);
  });

  it('calls onFileUpload with rejected file when file type is invalid', () => {
    const onFileUpload = vi.fn();
    render(<FileUpload {...defaultProps} onFileUpload={onFileUpload} />);

    const config = (global as any).__dropzoneConfig;
    const mockRejectedFile = new File(['content'], 'test.txt', { type: 'text/plain' });

    // Simulate file rejection
    config.onDrop([], [{ file: mockRejectedFile, errors: [] }]);

    expect(onFileUpload).toHaveBeenCalledWith(mockRejectedFile);
    expect(onFileUpload).toHaveBeenCalledTimes(1);
  });

  it('does not call onFileUpload when no files are provided', () => {
    const onFileUpload = vi.fn();
    render(<FileUpload {...defaultProps} onFileUpload={onFileUpload} />);

    const config = (global as any).__dropzoneConfig;

    // Simulate empty drop
    config.onDrop([], []);

    expect(onFileUpload).not.toHaveBeenCalled();
  });
});
