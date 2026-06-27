from flask import Flask, render_template, request, jsonify
from transformers import VitsModel, AutoTokenizer
import torch
import soundfile as sf
import os
import gc

app = Flask(__name__)

# Keep only ONE model in memory
current_language = None
current_model = None
current_tokenizer = None


def load_model(language):
    global current_language, current_model, current_tokenizer

    # Already loaded
    if current_language == language:
        return current_tokenizer, current_model

    # Free previous model
    current_model = None
    current_tokenizer = None

    gc.collect()

    model_name = f"facebook/mms-tts-{language}"

    print(f"\nLoading {model_name}...")

    current_tokenizer = AutoTokenizer.from_pretrained(model_name)
    current_model = VitsModel.from_pretrained(model_name)

    current_language = language

    print("Model loaded successfully!")

    return current_tokenizer, current_model


def generate_speech(text, language):

    tokenizer, model = load_model(language)

    inputs = tokenizer(text, return_tensors="pt")

    with torch.no_grad():
        output = model(**inputs).waveform

    os.makedirs("static", exist_ok=True)

    output_path = "static/generated.wav"

    sf.write(
        output_path,
        output.squeeze().cpu().numpy(),
        model.config.sampling_rate
    )

    return output_path


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/generate", methods=["POST"])
def generate():

    try:

        data = request.get_json()

        text = data.get("text", "").strip()
        language = data.get("language", "eng")

        if text == "":
            return jsonify({"error": "Please enter some text."}), 400

        generate_speech(text, language)

        return jsonify({
            "audio_url": "/static/generated.wav"
        })

    except Exception as e:

        print(e)

        return jsonify({
            "error": str(e)
        }), 500


if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 7860))
    )