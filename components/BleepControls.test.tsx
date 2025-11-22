import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BleepControls } from './BleepControls';

describe('BleepControls', () => {
  const defaultProps = {
    bleepSound: 'bleep',
    bleepVolume: 80,
    originalVolumeReduction: 0.1,
    bleepBuffer: 0.05,
    isPreviewingBleep: false,
    onBleepSoundChange: vi.fn(),
    onBleepVolumeChange: vi.fn(),
    onOriginalVolumeChange: vi.fn(),
    onBleepBufferChange: vi.fn(),
    onPreviewBleep: vi.fn(),
  };

  it('renders all control inputs', () => {
    render(<BleepControls {...defaultProps} />);

    expect(screen.getByTestId('bleep-sound-select')).toBeInTheDocument();
    expect(screen.getByTestId('bleep-volume-slider')).toBeInTheDocument();
    expect(screen.getByTestId('original-volume-slider')).toBeInTheDocument();
    expect(screen.getByTestId('bleep-buffer-slider')).toBeInTheDocument();
    expect(screen.getByTestId('preview-bleep-button')).toBeInTheDocument();
  });

  it('displays current bleep sound selection', () => {
    render(<BleepControls {...defaultProps} bleepSound="dolphin" />);

    const select = screen.getByTestId('bleep-sound-select') as HTMLSelectElement;
    expect(select.value).toBe('dolphin');
  });

  it('displays all available bleep sound options', () => {
    render(<BleepControls {...defaultProps} />);

    const select = screen.getByTestId('bleep-sound-select');
    expect(select).toHaveTextContent('Classic Bleep');
    expect(select).toHaveTextContent('Brown Noise');
    expect(select).toHaveTextContent('Dolphin Sounds Bleep');
    expect(select).toHaveTextContent('T-Rex Roar');
  });

  it('calls onBleepSoundChange when sound selection changes', () => {
    const onBleepSoundChange = vi.fn();
    render(<BleepControls {...defaultProps} onBleepSoundChange={onBleepSoundChange} />);

    const select = screen.getByTestId('bleep-sound-select');
    fireEvent.change(select, { target: { value: 'dolphin' } });

    expect(onBleepSoundChange).toHaveBeenCalledWith('dolphin');
    expect(onBleepSoundChange).toHaveBeenCalledTimes(1);
  });

  it('displays current bleep volume percentage', () => {
    render(<BleepControls {...defaultProps} bleepVolume={120} />);

    expect(screen.getByText('120%')).toBeInTheDocument();
  });

  it('calls onBleepVolumeChange when volume slider changes', () => {
    const onBleepVolumeChange = vi.fn();
    render(<BleepControls {...defaultProps} onBleepVolumeChange={onBleepVolumeChange} />);

    const slider = screen.getByTestId('bleep-volume-slider');
    fireEvent.change(slider, { target: { value: '100' } });

    expect(onBleepVolumeChange).toHaveBeenCalledWith(100);
    expect(onBleepVolumeChange).toHaveBeenCalledTimes(1);
  });

  it('displays current original volume reduction percentage', () => {
    render(<BleepControls {...defaultProps} originalVolumeReduction={0.25} />);

    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('calls onOriginalVolumeChange when original volume slider changes', () => {
    const onOriginalVolumeChange = vi.fn();
    render(<BleepControls {...defaultProps} onOriginalVolumeChange={onOriginalVolumeChange} />);

    const slider = screen.getByTestId('original-volume-slider');
    fireEvent.change(slider, { target: { value: '50' } });

    expect(onOriginalVolumeChange).toHaveBeenCalledWith(0.5);
    expect(onOriginalVolumeChange).toHaveBeenCalledTimes(1);
  });

  it('displays current bleep buffer in seconds', () => {
    render(<BleepControls {...defaultProps} bleepBuffer={0.15} />);

    expect(screen.getByText('0.15s')).toBeInTheDocument();
  });

  it('calls onBleepBufferChange when buffer slider changes', () => {
    const onBleepBufferChange = vi.fn();
    render(<BleepControls {...defaultProps} onBleepBufferChange={onBleepBufferChange} />);

    const slider = screen.getByTestId('bleep-buffer-slider');
    fireEvent.change(slider, { target: { value: '0.25' } });

    expect(onBleepBufferChange).toHaveBeenCalledWith(0.25);
    expect(onBleepBufferChange).toHaveBeenCalledTimes(1);
  });

  it('shows "Preview Bleep" text when not previewing', () => {
    render(<BleepControls {...defaultProps} isPreviewingBleep={false} />);

    const button = screen.getByTestId('preview-bleep-button');
    expect(button).toHaveTextContent('🔊 Preview Bleep');
  });

  it('shows "Playing..." text when previewing', () => {
    render(<BleepControls {...defaultProps} isPreviewingBleep={true} />);

    const button = screen.getByTestId('preview-bleep-button');
    expect(button).toHaveTextContent('🔊 Playing...');
  });

  it('calls onPreviewBleep when preview button is clicked', () => {
    const onPreviewBleep = vi.fn();
    render(<BleepControls {...defaultProps} onPreviewBleep={onPreviewBleep} />);

    const button = screen.getByTestId('preview-bleep-button');
    fireEvent.click(button);

    expect(onPreviewBleep).toHaveBeenCalledTimes(1);
  });

  it('disables preview button when isPreviewingBleep is true', () => {
    render(<BleepControls {...defaultProps} isPreviewingBleep={true} />);

    const button = screen.getByTestId('preview-bleep-button');
    expect(button).toBeDisabled();
  });

  it('enables preview button when isPreviewingBleep is false', () => {
    render(<BleepControls {...defaultProps} isPreviewingBleep={false} />);

    const button = screen.getByTestId('preview-bleep-button');
    expect(button).toBeEnabled();
  });

  it('sets correct slider attributes for bleep volume', () => {
    render(<BleepControls {...defaultProps} />);

    const slider = screen.getByTestId('bleep-volume-slider') as HTMLInputElement;
    expect(slider.type).toBe('range');
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('150');
    expect(slider.step).toBe('5');
  });

  it('sets correct slider attributes for original volume', () => {
    render(<BleepControls {...defaultProps} />);

    const slider = screen.getByTestId('original-volume-slider') as HTMLInputElement;
    expect(slider.type).toBe('range');
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('100');
    expect(slider.step).toBe('10');
  });

  it('sets correct slider attributes for bleep buffer', () => {
    render(<BleepControls {...defaultProps} />);

    const slider = screen.getByTestId('bleep-buffer-slider') as HTMLInputElement;
    expect(slider.type).toBe('range');
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('0.5');
    expect(slider.step).toBe('0.05');
  });

  it('displays buffer description text', () => {
    render(<BleepControls {...defaultProps} bleepBuffer={0.1} />);

    expect(screen.getByText(/Extends bleep 0.10s before and after each word/i)).toBeInTheDocument();
  });
});
