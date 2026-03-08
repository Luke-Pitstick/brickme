import requests
from dotenv import load_dotenv
import os
import base64
import json
import uuid
from pathlib import Path
from src.three_d.lego_pipeline import convert_meshy_model_to_lego

from .redisconnect import RedisClient

try:
    from supabase import create_client, Client
except Exception:
    create_client = None
    Client = None


class MeshyClient:
    def __init__(self):
        load_dotenv()
        self.api_key = os.getenv("MESHY_API_KEY")
        self.base_url = "https://api.meshy.ai/openapi/v1"
        self.headers = {"Authorization": f"Bearer {self.api_key}"}
        self.redis_client = RedisClient()

        self.supabase = None
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        if create_client and supabase_url and supabase_key:
            try:
                self.supabase = create_client(supabase_url, supabase_key)
            except Exception:
                self.supabase = None

    def _output_dir(self) -> Path:
        out = Path(__file__).resolve().parents[2] / "output"
        out.mkdir(parents=True, exist_ok=True)
        return out

    def convert_image_to_mesh(self, image_path: str) -> str:
        with open(image_path, "rb") as image_file:
            image_data = base64.b64encode(image_file.read()).decode("utf-8")
        image_uri = f"data:image/png;base64,{image_data}"

        payload = {
            "image_url": image_uri,
            "enable_pbr": True,
            "should_remesh": True,
            "should_texture": True,
            "save_pre_remeshed_model": True,
        }
        response = requests.post(f"{self.base_url}/image-to-3d", headers=self.headers, json=payload)
        response.raise_for_status()
        return response.json()

    def retexture_mesh(self, task_id: str, image_path: str) -> str:
        with open(image_path, "rb") as image_file:
            image_data = base64.b64encode(image_file.read()).decode("utf-8")
        image_uri = f"data:image/png;base64,{image_data}"

        payload = {
            "input_task_id": task_id,
            "text_style_prompt": "No reflections, no shiny surfaces, no glossy surfaces, no metallic surfaces",
            "image_style_url": image_uri,
            "enable_original_uv": True,
            "enable_pbr": True,
        }
        response = requests.post(f"{self.base_url}/retexture", headers=self.headers, json=payload)
        response.raise_for_status()
        return response.json()

    def stream_image_to_3d_progress(self, task_id: str) -> str:
        headers = {"Authorization": f"Bearer {self.api_key}", "Accept": "text/event-stream"}
        response = requests.get(f"{self.base_url}/image-to-3d/{task_id}/stream", headers=headers, stream=True)
        for line in response.iter_lines():
            if line and line.startswith(b"data:"):
                data = json.loads(line.decode("utf-8")[5:])
                if data["status"] in ["SUCCEEDED", "FAILED", "CANCELED"]:
                    response.close()
                    return data["status"]
        response.close()
        return "FAILED"

    def stream_retexture_progress(self, task_id: str) -> str:
        headers = {"Authorization": f"Bearer {self.api_key}", "Accept": "text/event-stream"}
        response = requests.get(f"{self.base_url}/retexture/{task_id}/stream", headers=headers, stream=True)
        for line in response.iter_lines():
            if line and line.startswith(b"data:"):
                data = json.loads(line.decode("utf-8")[5:])
                if data["status"] in ["SUCCEEDED", "FAILED", "CANCELED"]:
                    response.close()
                    return data["status"]
        response.close()
        return "FAILED"

    def retrieve_texture_json(self, task_id: str) -> dict:
        response = requests.get(f"{self.base_url}/retexture/{task_id}", headers=self.headers)
        response.raise_for_status()
        return response.json()

    def _resolve_image_path(self, image_input: str) -> str:
        if image_input.startswith(("http://", "https://")):
            response = requests.get(image_input)
            response.raise_for_status()
            ext = ".png" if "png" in response.headers.get("content-type", "") else ".jpg"
            temp_path = self._output_dir() / f"input_image_{os.urandom(8).hex()}{ext}"
            with open(temp_path, "wb") as f:
                f.write(response.content)
            return str(temp_path)
        return image_input

    def download_textured_model(self, textured_model_url: str, model_id: str) -> str:
        response = requests.get(textured_model_url)
        response.raise_for_status()
        model_path = self._output_dir() / f"textured_model_{model_id}.glb"
        with open(model_path, "wb") as f:
            f.write(response.content)
        return str(model_path)

    def upload_model_to_supabase(self, model_path: str, model_id: str) -> str:
        if self.supabase:
            with open(model_path, "rb") as model_file:
                self.supabase.storage.from_("textured_glbs").upload(f"{model_id}.glb", model_file)
            return self.supabase.storage.from_("textured_glbs").get_public_url(f"{model_id}.glb")

        filename = Path(model_path).name
        return f"http://localhost:8000/output/{filename}"

    def process_image_to_3d(self, image_input: str) -> str | None:
        if not self.api_key:
            return "https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf"

        image_path = self._resolve_image_path(image_input)

        task_id_image_to_3d = self.convert_image_to_mesh(image_path)["result"]
        result = self.stream_image_to_3d_progress(task_id_image_to_3d)
        if result != "SUCCEEDED":
            return None

        task_id_retexture = self.retexture_mesh(task_id_image_to_3d, image_path)["result"]
        result = self.stream_retexture_progress(task_id_retexture)
        if result != "SUCCEEDED":
            return None

        textured_model_url = self.retrieve_texture_json(task_id_retexture)["model_urls"]["glb"]
        model_path = self.download_textured_model(textured_model_url, task_id_image_to_3d)

        if not model_path:
            return None

        lego_model_path = str(self._output_dir() / f"lego_model_{task_id_image_to_3d}.glb")

        final_model_path = convert_meshy_model_to_lego(
            model_path,
            lego_model_path
        )

        return self.upload_model_to_supabase(final_model_path, task_id_image_to_3d)