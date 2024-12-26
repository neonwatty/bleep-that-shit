<a href="https://huggingface.co/spaces/neonwatty/bleep_that_sht" target="_parent"><img src="https://img.shields.io/badge/🤗-HuggingFace%20Space-cyan.svg" alt="HuggingFace Space"/></a>
<a href="https://colab.research.google.com/github/jermwatt/bleep_that_sht/blob/main/beep_that_sht_walkthrough.ipynb" target="_parent"><img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab"/></a> <a href="https://www.youtube.com/watch?v=U8Ki9dD3HF0" target="_parent"><img src="https://badges.aleen42.com/src/youtube.svg" alt="Youtube"/></a>
[![Python application](https://github.com/neonwatty/bleep_that_sht/actions/workflows/python-app.yml/badge.svg)](https://github.com/neonwatty/bleep_that_sht/actions/workflows/python-app.yml/python-app.yml) <a href="https://www.producthunt.com/posts/bleep-that-sh-t?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-bleep&#0045;that&#0045;sh&#0045;t" target="_parent"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=470378&theme=light" alt="Bleep&#0032;That&#0032;Sh&#0042;t&#0033; - A&#0032;whisper&#0032;app&#0032;that&#0032;bleeps&#0032;out&#0032;chosen&#0032;words&#0032;in&#0032;YouTube&#0032;videos | Product Hunt" style="width: 250px; height: 45px;" /></a>

# Automatically censor and bleep out words in audio and video using AI. Free and built to self-host with Python and Docker.

Make someone sound naughty 😈 or make your content more Ad-friendly.

Works by bleeping out keywords of your choice from an mp4 by leveraging a transcription model (here Whisper) to transcribe the audio, then target and replace chosen words with _bleep_ sounds using the extracted timestamps associated with your chosen word(s).

All processing is performed locally.

- [Version overall comparison](#version-overall-comparison)

- [Examples](#examples)
- [Installation](#installation)
  - [For local videos](#for-local-videos)
  - [For Youtube videos](#for-youtube-videos)
- [Walkthrough](#walkthrough)

## Examples

Some examples of the end product (make sure to turn volume on, its off by default).

https://github.com/user-attachments/assets/da50f8a9-27ba-4747-92e0-72a25e65175c

Let's look more closely at the last example above - below is a short clip we'll bleep out some words from using the pipeline in this repo. (make sure to turn on audio - its off by default)

https://github.com/neonwatty/bleep_that_sht/assets/16326421/fb8568fe-aba0-49e2-a563-642d658c0651

Now the same clip with the words - "treetz", "ice", "cream", "chocolate", "syrup", and "cookie" - bleeped out

https://github.com/neonwatty/bleep_that_sht/assets/16326421/63ebd7a0-46f6-4efd-80ea-20512ff427c0

## Installation

### For local videos

To get setup to run the notebook / bleep your own videos / run the strealit demo first install the requirements for this project by pasting the below in your terminal.

```python
pip install -r requirements.streamlit
```

To install requirements for the gradio demo use this install

```python
pip install -r requirements.gradio
```

You will need [ffmpeg](https://www.ffmpeg.org/download.html) installed on your machine as well.

### For Youtube videos

Start this streamlit demo locally that lets you enter in a youtube / shorts url to a video you wish to bleep

```python
python -m streamlit run bleep_that_sht/app_url_download.py
```

Alternatively you can start a gradio server with the same functionality

```python
python -m bleep_that_sht/gradio_app_url_download.py
```

You can also use docker compose

```bash
docker compose up
```

## Walkthrough

See `beep_that_sht_walkthrough.ipynb`) to play / see nitty gritty details.
