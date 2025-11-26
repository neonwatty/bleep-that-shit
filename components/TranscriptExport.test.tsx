import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TranscriptExport } from './TranscriptExport';

vi.mock('@/lib/utils/transcriptExport', async () => {
  const actual = await vi.importActual('@/lib/utils/transcriptExport');
  return {
    ...actual,
    downloadTranscript: vi.fn(),
  };
});

import { downloadTranscript } from '@/lib/utils/transcriptExport';

describe('TranscriptExport', () => {
  const mockDataWithChunks = {
    text: 'Test transcript',
    chunks: [
      { text: 'Test', timestamp: [0, 1] as [number, number] },
      { text: 'transcript', timestamp: [1, 2] as [number, number] },
    ],
  };

  const mockDataWithoutChunks = {
    text: 'Test transcript',
    chunks: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders format selector', () => {
    render(<TranscriptExport transcriptData={mockDataWithChunks} />);

    expect(screen.getByTestId('export-format-select')).toBeInTheDocument();
  });

  it('renders export button', () => {
    render(<TranscriptExport transcriptData={mockDataWithChunks} />);

    expect(screen.getByTestId('export-transcript-button')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  it('renders label', () => {
    render(<TranscriptExport transcriptData={mockDataWithChunks} />);

    expect(screen.getByText('Export Transcript:')).toBeInTheDocument();
  });

  it('shows all format options when chunks are available', () => {
    render(<TranscriptExport transcriptData={mockDataWithChunks} />);

    const select = screen.getByTestId('export-format-select');
    expect(select).toHaveTextContent('Plain Text (.txt)');
    expect(select).toHaveTextContent('SRT Subtitles (.srt)');
    expect(select).toHaveTextContent('JSON with Timestamps (.json)');
  });

  it('shows only txt option when no chunks available', () => {
    render(<TranscriptExport transcriptData={mockDataWithoutChunks} />);

    const select = screen.getByTestId('export-format-select');
    expect(select).toHaveTextContent('Plain Text (.txt)');
    expect(select).not.toHaveTextContent('SRT Subtitles (.srt)');
    expect(select).not.toHaveTextContent('JSON with Timestamps (.json)');
  });

  it('defaults to txt format', () => {
    render(<TranscriptExport transcriptData={mockDataWithChunks} />);

    const select = screen.getByTestId('export-format-select') as HTMLSelectElement;
    expect(select.value).toBe('txt');
  });

  it('calls downloadTranscript with txt format on button click', () => {
    render(<TranscriptExport transcriptData={mockDataWithChunks} filename="test" />);

    fireEvent.click(screen.getByTestId('export-transcript-button'));

    expect(downloadTranscript).toHaveBeenCalledWith(mockDataWithChunks, 'txt', 'test');
  });

  it('calls downloadTranscript with selected format', () => {
    render(<TranscriptExport transcriptData={mockDataWithChunks} filename="test" />);

    fireEvent.change(screen.getByTestId('export-format-select'), {
      target: { value: 'srt' },
    });
    fireEvent.click(screen.getByTestId('export-transcript-button'));

    expect(downloadTranscript).toHaveBeenCalledWith(mockDataWithChunks, 'srt', 'test');
  });

  it('calls downloadTranscript with json format', () => {
    render(<TranscriptExport transcriptData={mockDataWithChunks} />);

    fireEvent.change(screen.getByTestId('export-format-select'), {
      target: { value: 'json' },
    });
    fireEvent.click(screen.getByTestId('export-transcript-button'));

    expect(downloadTranscript).toHaveBeenCalledWith(mockDataWithChunks, 'json', undefined);
  });

  it('applies custom className', () => {
    const { container } = render(
      <TranscriptExport transcriptData={mockDataWithChunks} className="custom-class" />
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('passes undefined filename when not provided', () => {
    render(<TranscriptExport transcriptData={mockDataWithChunks} />);

    fireEvent.click(screen.getByTestId('export-transcript-button'));

    expect(downloadTranscript).toHaveBeenCalledWith(mockDataWithChunks, 'txt', undefined);
  });

  it('updates selected format when changed', () => {
    render(<TranscriptExport transcriptData={mockDataWithChunks} />);

    const select = screen.getByTestId('export-format-select') as HTMLSelectElement;

    fireEvent.change(select, { target: { value: 'srt' } });
    expect(select.value).toBe('srt');

    fireEvent.change(select, { target: { value: 'json' } });
    expect(select.value).toBe('json');

    fireEvent.change(select, { target: { value: 'txt' } });
    expect(select.value).toBe('txt');
  });
});
