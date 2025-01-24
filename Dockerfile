FROM python:3.10-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    software-properties-common \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home

ENV PYTHONPATH=.

COPY requirements.txt /home/requirements.txt
COPY .streamlit /home/.streamlit
RUN pip3 install --no-cache-dir -r /home/requirements.txt
COPY bleep_that_sht /home/bleep_that_sht
COPY data /home/data

EXPOSE 8501

HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health || exit 1

ENTRYPOINT ["streamlit", "run", "/home/bleep_that_sht/app.py", "--server.port=8501", "--server.address=0.0.0.0"]