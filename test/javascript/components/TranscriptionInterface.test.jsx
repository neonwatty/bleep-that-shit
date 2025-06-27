import React from "react";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import TranscriptionInterface from "../../../app/javascript/components/TranscriptionInterface";
import { TranscriptionService } from "../../../app/javascript/services/transcriptionService";

// Mock react-dropzone
vi.mock("react-dropzone", () => ({
  useDropzone: () => ({
    getRootProps: () => ({
      onClick: vi.fn(),
      onDrop: vi.fn(),
    }),
    getInputProps: () => ({
      type: "file",
      accept: "audio/*",
    }),
    isDragActive: false,
  }),
}));

// Mock the TranscriptionService
vi.mock("../../../app/javascript/services/transcriptionService", () => ({
  TranscriptionService: vi.fn(() => ({
    getSupportedLanguages: vi.fn().mockResolvedValue([
      { code: "auto", name: "Auto-detect" },
      { code: "en", name: "English" },
      { code: "fr", name: "French" },
    ]),
    transcribe: vi.fn().mockImplementation(async (buffer, config) => {
      // Simulate progress updates
      for (let i = 0; i <= 100; i += 20) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        config.onProgress?.(i / 100);
      }

      // Simulate chunk completion
      config.onChunkComplete?.([
        {
          text: "Test transcription",
          start: 0,
          end: 5,
          confidence: 0.9,
        },
      ]);

      return [];
    }),
  })),
}));

describe("TranscriptionInterface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<TranscriptionInterface />);
    expect(screen.getByText("Audio Transcription")).toBeInTheDocument();
  });

  it("loads and displays supported languages", async () => {
    render(<TranscriptionInterface />);

    // Wait for languages to load
    await screen.findByText("Auto-detect");
    await screen.findByText("English");
    await screen.findByText("French");
  });

  it("handles language selection", async () => {
    render(<TranscriptionInterface />);

    // Wait for languages to load
    await screen.findByText("Auto-detect");

    // Find and click the language select
    const languageSelect = screen.getByRole("combobox", { name: /language/i });
    fireEvent.mouseDown(languageSelect);

    // Select French
    const frenchOption = await screen.findByText("French");
    fireEvent.click(frenchOption);

    expect(languageSelect).toHaveValue("fr");
  });

  it("handles model selection", () => {
    render(<TranscriptionInterface />);

    // Find and click the model select
    const modelSelect = screen.getByRole("combobox", { name: /model/i });
    fireEvent.mouseDown(modelSelect);

    // Select large model
    const largeModelOption = screen.getByText("Large Model (More Accurate)");
    fireEvent.click(largeModelOption);

    expect(modelSelect).toHaveValue("large");
  });

  it("shows file upload dropzone", () => {
    render(<TranscriptionInterface />);

    const dropzone = screen.getByTestId("dropzone");
    expect(dropzone).toBeInTheDocument();
    expect(
      screen.getByText(/drag & drop an audio file here/i)
    ).toBeInTheDocument();
  });

  it("disables transcribe button when no file is selected", () => {
    render(<TranscriptionInterface />);

    const transcribeButton = screen.getByTestId("transcribe-button");
    expect(transcribeButton).toBeDisabled();
  });

  it("handles file upload", async () => {
    render(<TranscriptionInterface />);

    // Create a mock file
    const file = new File(["audio content"], "test.mp3", { type: "audio/mp3" });

    // Get the dropzone and simulate file drop
    const dropzone = screen.getByTestId("dropzone");
    const input = dropzone.querySelector("input");

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    // Check if file name is displayed
    await waitFor(() => {
      expect(screen.getByText(/test\.mp3/)).toBeInTheDocument();
    });

    // Check if transcribe button is enabled
    const transcribeButton = screen.getByTestId("transcribe-button");
    expect(transcribeButton).not.toBeDisabled();
  });

  it("displays transcription results after successful transcription", async () => {
    render(<TranscriptionInterface />);

    // Create and upload a mock file
    const file = new File(["audio content"], "test.mp3", { type: "audio/mp3" });
    const dropzone = screen.getByTestId("dropzone");
    const input = dropzone.querySelector("input");

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    // Start transcription
    const transcribeButton = screen.getByTestId("transcribe-button");
    await act(async () => {
      fireEvent.click(transcribeButton);
    });

    // Check for progress indicator
    const progressBar = await screen.findByRole("progressbar");
    expect(progressBar).toBeInTheDocument();

    // Check for results
    await screen.findByText("Test transcription");
    expect(screen.getByText("[0s - 5s]")).toBeInTheDocument();
  });

  it("handles transcription errors", async () => {
    // Mock transcription service to throw an error
    TranscriptionService.mockImplementationOnce(() => ({
      getSupportedLanguages: vi.fn().mockResolvedValue([]),
      transcribe: vi.fn().mockRejectedValue(new Error("Transcription failed")),
    }));

    render(<TranscriptionInterface />);

    // Create and upload a mock file
    const file = new File(["audio content"], "test.mp3", { type: "audio/mp3" });
    const dropzone = screen.getByTestId("dropzone");
    const input = dropzone.querySelector("input");

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    // Start transcription
    const transcribeButton = screen.getByTestId("transcribe-button");
    await act(async () => {
      fireEvent.click(transcribeButton);
    });

    // Check for error message
    const errorMessage = await screen.findByText(/transcription failed/i);
    expect(errorMessage).toBeInTheDocument();
  });

  it("shows loading state during transcription", async () => {
    render(<TranscriptionInterface />);

    // Create and upload a mock file
    const file = new File(["audio content"], "test.mp3", { type: "audio/mp3" });
    const dropzone = screen.getByTestId("dropzone");
    const input = dropzone.querySelector("input");

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    // Start transcription
    const transcribeButton = screen.getByTestId("transcribe-button");
    await act(async () => {
      fireEvent.click(transcribeButton);
    });

    // Check for loading state
    expect(screen.getByText("Transcribing...")).toBeInTheDocument();
    expect(transcribeButton).toBeDisabled();
  });

  it("resets progress and error state when starting new transcription", async () => {
    render(<TranscriptionInterface />);

    // Create and upload a mock file
    const file = new File(["audio content"], "test.mp3", { type: "audio/mp3" });
    const dropzone = screen.getByTestId("dropzone");
    const input = dropzone.querySelector("input");

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    // Start transcription
    const transcribeButton = screen.getByTestId("transcribe-button");
    await act(async () => {
      fireEvent.click(transcribeButton);
    });

    // Wait for completion
    await screen.findByText("Test transcription");

    // Start another transcription
    await act(async () => {
      fireEvent.click(transcribeButton);
    });

    // Check that progress is reset
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar.getAttribute("aria-valuenow")).toBe("0");
  });
});
