from flask import Flask, render_template, request, jsonify
from transformers import VitsModel, AutoTokenizer
import torch
import soundfile as sf
import os

app = Flask(__name__)

def generate_speech(text, language):

    model_name = f"facebook/mms-tts-{language}"

    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = VitsModel.from_pretrained(model_name)

    inputs = tokenizer(text, return_tensors="pt")

    with torch.no_grad():
        output = model(**inputs).waveform

    output_path = "static/generated.wav"

    sf.write(
        output_path,
        output.squeeze().numpy(),
        model.config.sampling_rate
    )

    return output_path

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/generate", methods=["POST"])
def generate():

    data = request.json

    text = data["text"]
    language = data["language"]

    generate_speech(text, language)

    return jsonify({
        "audio_url": "/static/generated.wav"
    })





if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000))
    )