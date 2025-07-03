from flask import Blueprint, request, jsonify
import whisper
import os
import logging
import uuid
import threading
from flask import send_file
import subprocess
# Flask Blueprint
speech_to_text_bp = Blueprint('speech_to_text', __name__)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Global placeholder for the model
whisper_model = None

# Folder to store uploaded audio files
UPLOAD_FOLDER = 'uploads'
ABS_UPLOAD_FOLDER = os.path.abspath(UPLOAD_FOLDER)
os.makedirs(ABS_UPLOAD_FOLDER, exist_ok=True)

# Function to load the model in a background thread
def load_model_in_background():
    global whisper_model
    try:
        logging.info("Starting background Whisper model loading...")
        whisper_model = whisper.load_model("large")
        logging.info("Whisper 'large' model loaded successfully.")
    except Exception as e:
        logging.error(f"Failed to load Whisper model: {e}", exc_info=True)

# Start model loading in background
threading.Thread(target=load_model_in_background, daemon=True).start()

# Endpoint for speech-to-text
@speech_to_text_bp.route('/speech-to-text', methods=['POST'])
def speech_to_text():
    logging.info("Received request to /speech-to-text")

    # Check if model is ready
    if whisper_model is None:
        logging.warning("Whisper model is still loading.")
        return jsonify({"error": "Model is still loading. Please try again shortly."}), 503

    # Check for uploaded audio
    if 'audio' not in request.files:
        logging.warning("No 'audio' file part in the request.")
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files['audio']
    if audio_file.filename == '':
        logging.warning("Empty filename in the request.")
        return jsonify({"error": "No selected file"}), 400

    try:
        # Save uploaded audio file
        filename = f"{uuid.uuid4()}_{audio_file.filename}"
        filepath = os.path.join(ABS_UPLOAD_FOLDER, filename)
        audio_file.save(filepath)
        logging.info(f"Audio file saved to: {filepath}")

        # Transcribe using Whisper
        logging.info("Transcribing with Whisper...")
        result = whisper_model.transcribe(filepath)
        transcribed_text = result.get("text", "")
        detected_language = result.get("language", "unknown")

        logging.info(f"Transcription completed. Language: {detected_language}, Text: {transcribed_text}")

        # Clean up uploaded file
        try:
            os.remove(filepath)
        except OSError as cleanup_err:
            logging.warning(f"Could not delete temp file: {filepath}. Error: {cleanup_err}")

        return jsonify({
            "text": transcribed_text,
            "language": detected_language
        }), 200

    except Exception as e:
        logging.error(f"Error in transcription: {e}", exc_info=True)
        return jsonify({"error": f"Transcription failed: {str(e)}"}), 500
from flask import Blueprint, send_file, jsonify, request
from langdetect import detect
import subprocess
import uuid
import os
import logging

speech_to_text_bp = Blueprint('speech', __name__)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Use a folder in your working directory (auto-created)
TTS_OUTPUT_DIR = os.path.join(os.getcwd(), "tts_outputs")
os.makedirs(TTS_OUTPUT_DIR, exist_ok=True)

@speech_to_text_bp.route('/text-to-speech', methods=['POST'])
def text_to_speech():
    try:
        data = request.get_json(force=True)
        text = data.get("text", "").strip()

        logger.info(f"Received TTS request. Text: '{text}'")

        if not text:
            logger.warning("No text provided in the request.")
            return jsonify({"error": "No text provided"}), 400

        # Detect language
        try:
            detected_lang = detect(text)
            logger.info(f"Detected language: {detected_lang}")
        except Exception as lang_err:
            logger.error(f"Language detection failed: {lang_err}", exc_info=True)
            detected_lang = "en"

        lang_map = {
            "en": "en",
            "hi": "hi",
            "kn": "kn",
            "ta": "ta",
            "te": "te",
            "ml": "ml"
        }
        lang_code = lang_map.get(detected_lang, "en")

        filename = f"tts_output_{uuid.uuid4().hex}.wav"
        output_path = os.path.abspath(os.path.join(TTS_OUTPUT_DIR, filename))

        # Run espeak-ng
        command = ["espeak-ng", "-v", lang_code, "-w", output_path, text]
        logger.info(f"Running espeak-ng command: {' '.join(command)}")
        try:
            subprocess.run(command, check=True)
        except subprocess.CalledProcessError as e:
            logger.error(f"espeak-ng failed: {e}", exc_info=True)
            return jsonify({"error": "TTS generation failed"}), 500

        # Final check for existence
        if not os.path.exists(output_path):
            logger.error(f"TTS output file was not created: {output_path}")
            return jsonify({"error": "TTS file generation failed"}), 500

        logger.info(f"TTS generation successful. Returning file: {output_path}")
        return send_file(output_path, mimetype="audio/wav", as_attachment=False)

    except Exception as e:
        logger.error(f"Unexpected error in TTS endpoint: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

