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


def generate_speech(text, language, voice="default"):

    tokenizer, model = load_model(language)

    inputs = tokenizer(text, return_tensors="pt")

    # Baseline speaker gender detection for the 10 languages
    # 'm' = Male, 'f' = Female
    lang_genders = {
        "eng": "m", "hin": "f", "spa": "f", "fra": "f", "deu": "f",
        "jpn": "f", "por": "f", "ita": "f", "ara": "m", "rus": "f"
    }
    base_gender = lang_genders.get(language, "f")

    # Determine speaking_rate and pitch factors based on target voice and base speaker gender
    speaking_rate = 1.0
    pitch_factor = 1.0
    robot_mod = False
    echo_effect = False

    if voice == "orion":
        if base_gender == "m":
            speaking_rate = 1.25
            pitch_factor = 1.25  # Orion - deep resonant male
        else:
            speaking_rate = 1.55
            pitch_factor = 1.55  # Orion - lowers female pitch to male range
    elif voice == "vega":
        if base_gender == "m":
            speaking_rate = 0.58
            pitch_factor = 0.58  # Vega - bright female
        else:
            speaking_rate = 1.0
            pitch_factor = 1.0   # Vega - standard female
    elif voice == "capella":
        if base_gender == "m":
            speaking_rate = 0.64
            pitch_factor = 0.64  # Capella - warm/smooth female (slightly lower pitch than Vega)
        else:
            speaking_rate = 1.12
            pitch_factor = 1.12  # Capella - warm resonant female
    elif voice == "puck":
        if base_gender == "m":
            speaking_rate = 0.43
            pitch_factor = 0.43  # Puck - cheerful child range
        else:
            speaking_rate = 0.75
            pitch_factor = 0.75  # Puck - shifts female to cheerful child range
    elif voice == "eclipse":
        if base_gender == "m":
            speaking_rate = 1.35
            pitch_factor = 1.35  # Eclipse - very deep smooth male
        else:
            speaking_rate = 1.65
            pitch_factor = 1.65  # Eclipse - deep calm male from female base

    model.speaking_rate = speaking_rate
    model.config.speaking_rate = speaking_rate

    with torch.no_grad():
        output = model(**inputs).waveform

        # Apply pitch shifting via interpolation
        if pitch_factor != 1.0:
            num_samples = output.shape[-1]
            new_size = int(num_samples * pitch_factor)
            output_4d = output.unsqueeze(0)  # shape [1, 1, num_samples]
            resampled = torch.nn.functional.interpolate(
                output_4d, size=new_size, mode='linear', align_corners=False
            )
            output = resampled.squeeze(0)  # shape [1, new_size]

        # Apply Robot Ring Modulation
        if robot_mod:
            t = torch.arange(output.shape[-1], dtype=torch.float32, device=output.device) / model.config.sampling_rate
            modulation = torch.sin(2 * 3.14159265 * 80.0 * t)  # 80 Hz carrier sine wave
            output = output * (0.6 + 0.4 * modulation)

        # Apply Echo / Reverb delay feedback
        if echo_effect:
            delay_samples = int(model.config.sampling_rate * 0.15)  # 150ms delay
            if output.shape[-1] > delay_samples:
                echo = torch.zeros_like(output)
                echo[..., delay_samples:] = output[..., :-delay_samples] * 0.4
                output = output + echo

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
        voice = data.get("voice", "default")

        if text == "":
            return jsonify({"error": "Please enter some text."}), 400

        generate_speech(text, language, voice)

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