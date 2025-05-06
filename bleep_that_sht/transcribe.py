import whisper_timestamped as whisper
from typing import Tuple

avaliable_models = ["tiny", "base", "small", "medium", "large-v3-turbo", "large-v3"]


def transcribe(local_file_path: str, model: str = "tiny", device: str = "cpu") -> Tuple[str, dict]:
    """
    Transcribe audio file

    Args:
        local_file_path: Path to the audio file
        model: Whisper model name
        device: Computing device (cpu or cuda)

    Returns:
        Tuple of (transcript text, timestamped transcript)
    """
    assert model in avaliable_models, f"input model '{model}' not a member of available models = {avaliable_models}"
    model = whisper.load_model(model, device=device)
    process_output = whisper.transcribe(model, local_file_path, verbose=False)
    transcript = process_output["text"]
    timestamped_transcript = process_output["segments"]

    return transcript, timestamped_transcript
