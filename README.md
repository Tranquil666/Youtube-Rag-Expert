# VidSynth AI

VidSynth AI is a YouTube content synthesizer that turns any public video into structured knowledge. It can summarize long-form content into bullet-point notes, extract the most important topics, or let you chat with the video through a Retrieval-Augmented Generation (RAG) workflow powered by Gemini models.

## Features
- **Transcript ingestion**
  Fetches captions for a YouTube video using `youtube-transcript-api`, handling multiple language codes.
- **On-demand translation**
  Converts non-English transcripts to English with the Gemini `gemini-2.5-flash-lite` chat model.
- **Summaries and notes**
  Produces human-friendly highlights and study notes tailored to the video content.
- **Topic extraction**
  Distills the top five topics discussed in the source video.
- **Conversational RAG chatbot**
  Splits transcripts into chunks, stores them in an in-memory Chroma vector store, and answers questions about the video context.
- **Multiple runtime options**
  Includes a `Streamlit` interface (`app.py`) and a production-ready `Flask` backend (`flask_app.py`) with static assets (`index.html`, `style.css`, `script.js`).

## Project Structure
```text
project-root/
├── app.py                  # Streamlit front-end
├── flask_app.py            # Flask API + static site
├── supporting_functions.py # Transcript, translation, RAG utilities
├── index.html              # Front-end served by Flask
├── style.css
├── script.js
├── requirements.txt
├── runtime.txt             # Python version for deployment
├── Procfile                # Process definition for Render/Heroku-like platforms
├── render.yaml             # Render.com deployment blueprint
├── simple_test.py          # Local sanity test for vector store creation
└── ...
```

## Prerequisites
- Python `3.11.x` (see `runtime.txt`)
- A Google Generative AI API key with access to Gemini models
- `pip` for dependency management

## Setup
1. **Clone and enter the project**
   ```bash
   git clone <your-fork-url>
   cd project-3-youtube-rag
   ```

2. **Create a virtual environment (recommended)**
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   Create a `.env` file in the project root with your API key:
   ```dotenv
   GOOGLE_API_KEY=your-google-generative-ai-key
   ```
   > **Important:** Do not commit the `.env` file. The included `.env` is for local reference only—replace the placeholder key with your own credentials.

## Running the Application

### Option 1: Streamlit interface
1. Start the Streamlit app:
   ```bash
   streamlit run app.py
   ```
2. Open the provided local URL in your browser.
3. Paste a YouTube link, choose the language code, and select either **Chat with Video** or **Notes For You**.

### Option 2: Flask API + static front-end
1. Ensure the `.env` file is present.
2. Launch the Flask server:
   ```bash
   python flask_app.py
   ```
3. Navigate to `http://localhost:5000` for the full web experience, or interact with the REST endpoints directly (e.g., `POST /api/transcript`, `POST /api/chat`).

## Testing
Run the lightweight vector store sanity check with:
```bash
python simple_test.py
```
This script validates that chunking, embedding creation, and similarity search succeed with the current dependencies.

## Deployment (Render.com example)
- `render.yaml` defines a starter Render service that installs requirements and starts `flask_app.py`.
- `Procfile` contains the same start command for Heroku-style platforms.
- Add `GOOGLE_API_KEY` as a Render environment variable (marked `sync: false` to populate it manually in the dashboard).

## Troubleshooting
- **Invalid YouTube URL**: Ensure the link is public and contains a valid video ID. The helper `extract_video_id()` in `supporting_functions.py` expects standard YouTube URL formats.
- **Transcript fetch failures**: Some videos disable transcripts or restrict them by region/language. Try another language code or video.
- **Gemini API errors**: Verify your API key, project quota, and network connectivity.
- **Chat responses missing**: Confirm the vector store was created. In Streamlit, the chatbot becomes available after the transcript is processed and chunks are indexed.

## License
Specify your preferred license here before publishing (e.g., MIT, Apache 2.0). Remember to add a dedicated `LICENSE` file if needed.
