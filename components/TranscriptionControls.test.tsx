import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TranscriptionControls } from './TranscriptionControls';

describe('TranscriptionControls', () => {
  const defaultProps = {
    language: 'en',
    model: 'Xenova/whisper-base.en',
    onLanguageChange: vi.fn(),
    onModelChange: vi.fn(),
  };

  it('renders language select', () => {
    render(<TranscriptionControls {...defaultProps} />);

    expect(screen.getByTestId('language-select')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
  });

  it('renders model select', () => {
    render(<TranscriptionControls {...defaultProps} />);

    expect(screen.getByTestId('model-select')).toBeInTheDocument();
    expect(screen.getByText('Model')).toBeInTheDocument();
  });

  it('displays current language selection', () => {
    render(<TranscriptionControls {...defaultProps} language="es" />);

    const select = screen.getByTestId('language-select') as HTMLSelectElement;
    expect(select.value).toBe('es');
  });

  it('displays current model selection', () => {
    render(<TranscriptionControls {...defaultProps} model="Xenova/whisper-tiny.en" />);

    const select = screen.getByTestId('model-select') as HTMLSelectElement;
    expect(select.value).toBe('Xenova/whisper-tiny.en');
  });

  it('displays all available language options', () => {
    render(<TranscriptionControls {...defaultProps} />);

    const select = screen.getByTestId('language-select');
    expect(select).toHaveTextContent('English');
    expect(select).toHaveTextContent('Spanish');
    expect(select).toHaveTextContent('French');
    expect(select).toHaveTextContent('German');
    expect(select).toHaveTextContent('Italian');
    expect(select).toHaveTextContent('Portuguese');
    expect(select).toHaveTextContent('Dutch');
    expect(select).toHaveTextContent('Polish');
    expect(select).toHaveTextContent('Japanese');
    expect(select).toHaveTextContent('Chinese');
    expect(select).toHaveTextContent('Korean');
  });

  it('has correct language option values', () => {
    const { container } = render(<TranscriptionControls {...defaultProps} />);

    const options = container.querySelectorAll('[data-testid="language-select"] option');
    const values = Array.from(options).map(option => (option as HTMLOptionElement).value);

    expect(values).toEqual(['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ja', 'zh', 'ko']);
  });

  it('displays all available model options', () => {
    render(<TranscriptionControls {...defaultProps} />);

    const select = screen.getByTestId('model-select');
    // MobileSelect shows labels only in the button, descriptions are shown in bottom sheet
    expect(select).toHaveTextContent('Tiny (~50 MB)');
    expect(select).toHaveTextContent('Base (~85 MB)');
    expect(select).toHaveTextContent('Small (~275 MB)');
    expect(select).toHaveTextContent('Medium (~800 MB)');
    expect(select).toHaveTextContent('Tiny Multilingual (~50 MB)');
    expect(select).toHaveTextContent('Base Multilingual (~85 MB)');
    expect(select).toHaveTextContent('Small Multilingual (~275 MB)');
    expect(select).toHaveTextContent('Medium Multilingual (~800 MB)');
  });

  it('has correct model option values', () => {
    const { container } = render(<TranscriptionControls {...defaultProps} />);

    const options = container.querySelectorAll('[data-testid="model-select"] option');
    const values = Array.from(options).map(option => (option as HTMLOptionElement).value);

    expect(values).toEqual([
      'Xenova/whisper-tiny.en',
      'Xenova/whisper-base.en',
      'Xenova/whisper-small.en',
      'onnx-community/whisper-medium.en_timestamped',
      'Xenova/whisper-tiny',
      'Xenova/whisper-base',
      'Xenova/whisper-small',
      'onnx-community/whisper-medium_timestamped',
    ]);
  });

  it('calls onLanguageChange when language is changed', () => {
    const onLanguageChange = vi.fn();
    render(<TranscriptionControls {...defaultProps} onLanguageChange={onLanguageChange} />);

    const select = screen.getByTestId('language-select');
    fireEvent.change(select, { target: { value: 'fr' } });

    expect(onLanguageChange).toHaveBeenCalledWith('fr');
    expect(onLanguageChange).toHaveBeenCalledTimes(1);
  });

  it('calls onModelChange when model is changed', () => {
    const onModelChange = vi.fn();
    render(<TranscriptionControls {...defaultProps} onModelChange={onModelChange} />);

    const select = screen.getByTestId('model-select');
    fireEvent.change(select, { target: { value: 'Xenova/whisper-small.en' } });

    expect(onModelChange).toHaveBeenCalledWith('Xenova/whisper-small.en');
    expect(onModelChange).toHaveBeenCalledTimes(1);
  });

  it('can change language to each available option', () => {
    const onLanguageChange = vi.fn();
    render(<TranscriptionControls {...defaultProps} onLanguageChange={onLanguageChange} />);

    const languages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ja', 'zh', 'ko'];
    const select = screen.getByTestId('language-select');

    languages.forEach(lang => {
      fireEvent.change(select, { target: { value: lang } });
      expect(onLanguageChange).toHaveBeenCalledWith(lang);
    });

    expect(onLanguageChange).toHaveBeenCalledTimes(languages.length);
  });

  it('can change model to each available option', () => {
    const onModelChange = vi.fn();
    render(<TranscriptionControls {...defaultProps} onModelChange={onModelChange} />);

    const models = [
      'Xenova/whisper-tiny.en',
      'Xenova/whisper-base.en',
      'Xenova/whisper-small.en',
      'onnx-community/whisper-medium.en_timestamped',
      'Xenova/whisper-tiny',
      'Xenova/whisper-base',
      'Xenova/whisper-small',
      'onnx-community/whisper-medium_timestamped',
    ];
    const select = screen.getByTestId('model-select');

    models.forEach(model => {
      fireEvent.change(select, { target: { value: model } });
      expect(onModelChange).toHaveBeenCalledWith(model);
    });

    expect(onModelChange).toHaveBeenCalledTimes(models.length);
  });

  it('renders both selects in a grid layout', () => {
    const { container } = render(<TranscriptionControls {...defaultProps} />);

    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveClass('grid-cols-1');
    expect(gridContainer).toHaveClass('lg:grid-cols-2');
  });
});
