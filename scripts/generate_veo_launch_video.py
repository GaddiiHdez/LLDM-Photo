#!/usr/bin/env python3
"""
BereaSnap — Generador de Video de Lanzamiento con Google Veo 3.1
Modelo: veo-3.1-generate-preview (o veo-3.1-fast-generate-preview)
Formato: Vertical 9:16 (Optimizado para Reels / Shorts / TikTok / WhatsApp Status)
"""

import os
import sys
import time
import json
import base64
import argparse
import mimetypes
import urllib.request
import urllib.error

DEFAULT_PROMPT = (
    "Cinematic 9:16 vertical luxury tech commercial for mobile app BereaSnap. "
    "Opening shot: An ultra-sleek obsidian titanium smartphone floats weightlessly in pitch-black AMOLED space (#000000). "
    "Warm imperial golden rim lighting catches the chamfered glass edges. The screen illuminates as an intricate 3D golden 'B+S' "
    "optical monogram rotates smoothly, unfurling like a camera aperture iris with anamorphic cyan and amber lens flares. "
    "Camera smoothly dollies in: Seamless transition revealing the BereaSnap photo editing UI in dark AMOLED theme with Samsung One UI aesthetics. "
    "Smooth glass slider controls for Skin Tone Guard and Clarity adjust with fluid micro-animations. A professional church choir "
    "photograph on screen instantly reveals crisp white textile detail, high dynamic range, and radiant natural skin tones without clipping. "
    "Final shot: Slow pullback to a heroic 3/4 angle on a polished reflective black studio surface, subtle golden bokeh dust floating in the air. "
    "Master-level lighting, hyper-realistic 8k render, photorealistic product commercial style, ARRI Alexa 35mm optical look, 24fps."
)

BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

def get_api_key(cli_key: str | None) -> str:
    key = cli_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not key:
        print("\n❌ Error: No se encontró GEMINI_API_KEY.")
        print("Configúrala antes de ejecutar:")
        print("  Windows PowerShell: $env:GEMINI_API_KEY = 'tu-api-key'")
        print("  O pásala como argumento: python generate_veo_launch_video.py --api-key tu-api-key\n")
        print("Puedes obtener tu clave gratuita o de pago en: https://aistudio.google.com/app/apikey")
        sys.exit(1)
    return key.strip()

def run_rest_veo(api_key: str, prompt: str, image_path: str | None, aspect_ratio: str, duration: int, resolution: str, model: str, output_path: str):
    headers = {
        "x-goog-api-key": api_key,
        "Content-Type": "application/json",
        "User-Agent": "BereaSnap-Veo-Generator/1.0"
    }

    instance = {"prompt": prompt}

    if image_path and os.path.exists(image_path):
        print(f"🖼️ Adjuntando fotograma de referencia inicial: {image_path}")
        mime_type, _ = mimetypes.guess_type(image_path)
        mime_type = mime_type or "image/jpeg"
        with open(image_path, "rb") as f:
            encoded_bytes = base64.b64encode(f.read()).decode("utf-8")
        instance["image"] = {
            "inlineData": {
                "mimeType": mime_type,
                "data": encoded_bytes
            }
        }

    body = {
        "instances": [instance],
        "parameters": {
            "aspectRatio": aspect_ratio,
            "durationSeconds": duration,
            "numberOfVideos": 1,
            "resolution": resolution
        }
    }

    url = f"{BASE_URL}/models/{model}:predictLongRunning"
    print(f"\n🚀 Iniciando solicitud a Veo 3.1 ({model})...")
    print(f"📐 Formato: {aspect_ratio} | Duración: {duration}s | Resolución: {resolution}")
    
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode("utf-8", errors="ignore")
        print(f"\n❌ Error HTTP {e.code}: {e.reason}")
        print(f"Detalle de la API: {error_msg}")
        return False
    except Exception as e:
        print(f"\n❌ Error de conexión: {e}")
        return False

    op_name = data.get("name")
    if not op_name:
        print(f"❌ Respuesta inesperada: {data}")
        return False

    print(f"⏳ Operación creada exitosamente: {op_name}")
    print("⏳ Renderizando video en la infraestructura de Google DeepMind (esto suele tardar entre 45 y 90 segundos)...")

    start_time = time.time()
    poll_count = 0

    while True:
        time.sleep(10)
        elapsed = int(time.time() - start_time)
        poll_count += 1
        print(f"  [{elapsed:02d}s] Verificando estado de generación (intento {poll_count})...")

        poll_url = f"{BASE_URL}/{op_name}"
        poll_req = urllib.request.Request(poll_url, headers=headers, method="GET")

        try:
            with urllib.request.urlopen(poll_req) as poll_resp:
                poll_data = json.loads(poll_resp.read().decode("utf-8"))
        except Exception as e:
            print(f"  ⚠️ Error temporal al consultar estado ({e}), reintentando...")
            continue

        if poll_data.get("done"):
            if "error" in poll_data:
                print(f"\n❌ Error en la generación de Veo: {poll_data['error']}")
                return False

            print("\n✨ ¡Renderizado completado con éxito!")
            response_payload = poll_data.get("response", {})
            generate_response = response_payload.get("generateVideoResponse", {})
            samples = generate_response.get("generatedSamples", [])

            if not samples:
                # Intento alternativo según versión del payload
                samples = response_payload.get("generatedVideos", [])

            if not samples:
                print(f"⚠️ No se encontraron muestras de video en la respuesta: {poll_data}")
                return False

            sample = samples[0]
            video_info = sample.get("video", {})
            video_uri = video_info.get("uri")

            os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

            if video_uri:
                print(f"📥 Descargando video desde: {video_uri}")
                dl_req = urllib.request.Request(video_uri, headers={"x-goog-api-key": api_key})
                with urllib.request.urlopen(dl_req) as dl_resp, open(output_path, "wb") as out_f:
                    out_f.write(dl_resp.read())
            elif "bytesBase64Encoded" in video_info:
                print("📥 Guardando video recibido en base64...")
                with open(output_path, "wb") as out_f:
                    out_f.write(base64.b64decode(video_info["bytesBase64Encoded"]))
            else:
                print(f"⚠️ Formato de video no reconocido: {video_info}")
                return False

            file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
            print(f"\n🎉 Video guardado exitosamente en:")
            print(f"   📁 {output_path} ({file_size_mb:.2f} MB)")
            return True

def main():
    parser = argparse.ArgumentParser(description="Generar video publicitario de lanzamiento con Veo 3.1 para BereaSnap.")
    parser.add_argument("--api-key", help="Clave API de Gemini / Google AI Studio", default=None)
    parser.add_argument("--prompt", help="Prompt cinemático", default=DEFAULT_PROMPT)
    parser.add_argument("--first-frame", help="Ruta de imagen inicial para Image-to-Video", default=None)
    parser.add_argument("--aspect-ratio", help="Relación de aspecto (9:16 o 16:9)", default="9:16")
    parser.add_argument("--duration", type=int, help="Duración en segundos (5 a 8)", default=5)
    parser.add_argument("--resolution", help="Resolución (720p o 1080p)", default="720p")
    parser.add_argument("--model", help="Modelo de Veo a utilizar", default="veo-3.1-generate-preview")
    parser.add_argument("--output", help="Ruta de destino del archivo .mp4", default="public/promo/bereasnap_launch_veo31_9x16.mp4")

    args = parser.parse_args()

    api_key = get_api_key(args.api_key)

    # Si no se pasó first-frame explícito pero existe shot_1_reveal.jpg, ofrecer usarlo
    first_frame = args.first_frame
    default_shot1 = os.path.join(os.path.dirname(__file__), "..", "public", "promo", "shot_1_reveal.jpg")
    if not first_frame and os.path.exists(default_shot1):
        first_frame = default_shot1

    success = run_rest_veo(
        api_key=api_key,
        prompt=args.prompt,
        image_path=first_frame,
        aspect_ratio=args.aspect_ratio,
        duration=args.duration,
        resolution=args.resolution,
        model=args.model,
        output_path=args.output
    )

    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
