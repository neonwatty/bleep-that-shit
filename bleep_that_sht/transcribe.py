import whisper_timestamped as whisper
from typing import Tuple

avaliable_models = ["tiny", "base", "small", "medium", "large-v3-turbo", "large-v3"]


def transcribe(local_file_path: str, model: str = "tiny", device: str = "cpu") -> Tuple[str, dict]:
    assert model in avaliable_models, f"input model '{model}' not a member of available models = {avaliable_models}"
    model = whisper.load_model(model, device="cpu")
    process_output = whisper.transcribe(model, local_file_path, verbose=False)
    transcript = process_output["text"]
    timestamped_transcript = process_output["segments"]
    return transcript, timestamped_transcript
