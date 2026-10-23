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

PRESETS = {
    "ui-mockup": {
        "image": "public/promo/shot_2_ui_action_real.jpg",
        "prompt": (
            "Cinematic commercial macro shot of a sleek titanium smartphone floating in dark AMOLED space. "
            "On the AMOLED display, the BereaSnap photo editor app is running in Samsung One UI dark theme, "
            "editing the actual monumental church photograph from the starting frame. "
            "Glowing golden glass sliders for 'Skin Tone Guard', 'Claridad', and 'Reducción de Ruido' adjust smoothly, "
            "causing the church photograph on screen to dynamically enhance: highlights become radiant, the golden sanctuary "
            "elements shimmer with anamorphic warm lens flares, and every detail gains crystalline sharpness. "
            "Camera smoothly pulls back at 24fps, luxury tech commercial aesthetic, ARRI Alexa 35mm optical look."
        )
    },
    "real-hp": {
        "image": "public/promo/hermosa_provincia_santa_cena_real.jpg",
        "prompt": (
            "Cinematic camera movement slowly pushing in and panning across the monumental sanctuary of Hermosa Provincia during Santa Cena. "
            "Golden beams of celestial light emanate from the grand sunburst chandelier and the golden commemorative frame adorned with wheat and grapes. "
            "The vast congregation in pure white garments is illuminated with warm, reverent lighting and subtle floating golden bokeh particles. "
            "Breathtaking church photography brought to life with pristine high dynamic range, ARRI Alexa cinematic look, 24fps."
        )
    },
    "real-cintermex": {
        "image": "public/promo/cintermex_monterrey_real.jpg",
        "prompt": (
            "Cinematic camera slowly rising and tracking across the grand Cintermex auditorium celebrating 100 years. "
            "Thousands of faithful raise their hands as warm golden rays illuminate the monumental arch inscribed with 'SANTIDAD A JESUCRISTO 1926 - 2026' "
            "and the gleaming golden flame sculpture. Soft anamorphic lens flares reflect off the golden typography and the Centenario seal. "
            "Majestic, inspiring, documentary cinema grade, 24fps."
        )
    },
    "shot-1-reveal": {
        "image": "public/promo/shot_1_reveal.jpg",
        "prompt": (
            "Cinematic 9:16 vertical commercial opening. A sleek titanium smartphone floats in pure pitch-black AMOLED space (#000000). "
            "Dramatic golden rim lighting sweeps along the curved glass edges. On screen, the luxury golden 'B+S' BereaSnap monogram rotates "
            "and unfurls like an optical camera diaphragm with anamorphic lens flares and glowing warm light beams. 8k render, luxury tech ad."
        )
    }
}

BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

def get_api_key(cli_key: str | None) -> str:
    key = cli_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not key:
        print("\n❌ Error: No se encontró GEMINI_API_KEY.")
        print("Configúrala antes de ejecutar:")
        print("  Windows PowerShell: $env:GEMINI_API_KEY = 'tu-api-key'")
        print("  O pásala como argumento: python generate_veo_launch_video.py --api-key tu-api-key\n")
        print("Puedes obtener tu clave en: https://aistudio.google.com/app/apikey")
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
        print(f"🖼️ Adjuntando fotograma de referencia: {image_path}")
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
    parser.add_argument("--preset", choices=list(PRESETS.keys()), default="ui-mockup",
                        help="Preset preconfigurado ('ui-mockup' con foto real en pantalla, 'real-hp', 'real-cintermex', 'shot-1-reveal')")
    parser.add_argument("--api-key", help="Clave API de Gemini / Google AI Studio", default=None)
    parser.add_argument("--prompt", help="Prompt cinemático personalizado (opcional)", default=None)
    parser.add_argument("--first-frame", help="Ruta de imagen inicial personalizada (opcional)", default=None)
    parser.add_argument("--aspect-ratio", help="Relación de aspecto (9:16 o 16:9)", default="9:16")
    parser.add_argument("--duration", type=int, help="Duración en segundos (5 a 8)", default=5)
    parser.add_argument("--resolution", help="Resolución (720p o 1080p)", default="720p")
    parser.add_argument("--model", help="Modelo de Veo a utilizar", default="veo-3.1-generate-preview")
    parser.add_argument("--output", help="Ruta de destino del archivo .mp4", default=None)

    args = parser.parse_args()

    api_key = get_api_key(args.api_key)

    preset_config = PRESETS.get(args.preset, PRESETS["ui-mockup"])
    
    # Resolver imagen
    if args.first_frame:
        image_path = args.first_frame
    else:
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        image_path = os.path.join(root_dir, preset_config["image"])

    # Resolver prompt
    prompt = args.prompt or preset_config["prompt"]

    # Resolver ruta de salida
    if args.output:
        output_path = args.output
    else:
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        output_path = os.path.join(root_dir, "public", "promo", f"bereasnap_veo31_{args.preset}_{args.aspect_ratio.replace(':', 'x')}.mp4")

    success = run_rest_veo(
        api_key=api_key,
        prompt=prompt,
        image_path=image_path,
        aspect_ratio=args.aspect_ratio,
        duration=args.duration,
        resolution=args.resolution,
        model=args.model,
        output_path=output_path
    )

    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
