import requests
from dotenv import load_dotenv
import os
import base64

from .redisconnect import RedisClient
import json
from supabase import create_client, Client

class MeshyClient:
    def __init__(self):
        load_dotenv()
        self.api_key = os.getenv("MESHY_API_KEY")
        self.base_url = "https://api.meshy.ai/openapi/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}"
        }
        self.redis_client = RedisClient()
        self.supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
        
        
    def convert_image_to_mesh(self, image_path: str) -> str:
        with open(image_path, "rb") as image_file:
            image_data = image_file.read()
            
        image_data = base64.b64encode(image_data).decode("utf-8")
        image_uri = f"data:image/png;base64,{image_data}"
        
        payload = {
            # Using data URI example
            # image_url: f'data:image/png;base64,{YOUR_BASE64_ENCODED_IMAGE_DATA}',
            "image_url": image_uri,
            "enable_pbr": True,
            "should_remesh": True,
            "should_texture": True,
            "save_pre_remeshed_model": True
        }

        response = requests.post(
            f"{self.base_url}/image-to-3d",
            headers=self.headers,
            json=payload,
        )
        response.raise_for_status()
        return response.json()
        
    def retexture_mesh(self, task_id: str, image_path: str) -> str:
        with open(image_path, "rb") as image_file:
            image_data = image_file.read()
            
        image_data = base64.b64encode(image_data).decode("utf-8")
        image_uri = f"data:image/png;base64,{image_data}"
        
        payload = {
            "input_task_id": task_id,
            "text_style_prompt": "No reflections, no shiny surfaces, no glossy surfaces, no metallic surfaces",
            "image_style_url": image_uri,
            "enable_original_uv": True,
            "enable_pbr": True
        }

        response = requests.post(
            f"{self.base_url}/retexture",
            headers=self.headers,
            json=payload,
        )
        response.raise_for_status()
        return response.json()
    
    def stream_image_to_3d_progress(self, task_id: str) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "text/event-stream"
        }

        response = requests.get(
            f'{self.base_url}/image-to-3d/{task_id}/stream',
            headers=headers,
            stream=True
        )

        for line in response.iter_lines():
            if line:
                if line.startswith(b'data:'):
                    data = json.loads(line.decode('utf-8')[5:])
                    print(data)

                    if data['status'] in ['SUCCEEDED', 'FAILED', 'CANCELED']:
                        return data['status']

        response.close()
        
    def stream_retexture_progress(self, task_id: str) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "text/event-stream"
        }

        response = requests.get(
            f'{self.base_url}/retexture/{task_id}/stream',
            headers=headers,
            stream=True
        )

        for line in response.iter_lines():
            if line:
                if line.startswith(b'data:'):
                    data = json.loads(line.decode('utf-8')[5:])
                    print(data)

                    if data['status'] in ['SUCCEEDED', 'FAILED', 'CANCELED']:
                        return data['status']

        response.close()
    
    def retrieve_model_json(self, task_id: str) -> dict:
        response = requests.get(
            f"{self.base_url}/image-to-3d/{task_id}",
            headers=self.headers,
        )
        response.raise_for_status()
        return response.json()
    
    def retrieve_texture_json(self, task_id: str) -> dict:
        response = requests.get(
            f"{self.base_url}/retexture/{task_id}",
            headers=self.headers,
        )
        response.raise_for_status()
        return response.json()
    
    def download_untextured_model(self, model_url: str, id: str):
        response = requests.get(model_url)
        response.raise_for_status()
        with open(f"../../output/untextured_model_{id}.glb", "wb") as model_file:
            model_file.write(response.content)
    
    def download_textured_model(self, textured_model_url: str, id: str) -> str | None:
        response = requests.get(textured_model_url)
        response.raise_for_status()
        output_dir = os.path.join(os.path.dirname(__file__), "..", "..", "output")
        os.makedirs(output_dir, exist_ok=True)
        model_path = os.path.join(output_dir, f"textured_model_{id}.glb")
        with open(model_path, "wb") as textured_model_file:
            textured_model_file.write(response.content)
        return model_path

    def upload_model_to_supabase(self, model_path: str, id: str) -> str:
       with open(model_path, "rb") as model_file:
            self.supabase.storage.from_("textured_glbs").upload(f"{id}.glb", model_file)
            return self.supabase.storage.from_("textured_glbs").get_public_url(f"{id}.glb")
            
    def list_tasks_image_to_3d(self, page_size: int = 10) -> list:
        response = requests.get(
            f"{self.base_url}/image-to-3d",
            headers=self.headers,
            params={"page_size": page_size}
        )
        response.raise_for_status()
        for task in response.json():
            print(task["id"])
            print(task["status"])
    
    def list_tasks_retexture(self, page_size: int = 10) -> list:
        response = requests.get(
            f"{self.base_url}/retexture",
            headers=self.headers,
            params={"page_size": page_size}
        )
        response.raise_for_status()
        for task in response.json():
            print(task["id"])
            print(task["status"])
    
    def _resolve_image_path(self, image_input: str) -> str:
        """If image_input is a URL, download to temp file and return path. Otherwise return as-is."""
        if image_input.startswith(("http://", "https://")):
            response = requests.get(image_input)
            response.raise_for_status()
            output_dir = os.path.join(os.path.dirname(__file__), "..", "..", "output")
            os.makedirs(output_dir, exist_ok=True)
            ext = ".png" if "png" in response.headers.get("content-type", "") else ".jpg"
            temp_path = os.path.join(output_dir, f"input_image_{os.urandom(8).hex()}{ext}")
            with open(temp_path, "wb") as f:
                f.write(response.content)
            return temp_path
        return image_input

    def process_image_to_3d(self, image_input: str) -> str | None:
        """image_input can be a local file path or a CDN/HTTP URL."""
        if not self.api_key:
            # For development/testing: return a mock 3D model URL when API key is not configured
            print("⚠ Warning: Meshy API key not configured, returning mock 3D model URL for development")
            import uuid
            mock_model_id = str(uuid.uuid4())
            # Return a sample GLB model URL that can be loaded by Three.js
            # Using a publicly available sample model for testing
            return "https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf"

        image_path = self._resolve_image_path(image_input)
        task_id_image_to_3d = self.convert_image_to_mesh(image_path)["result"]
        result = self.stream_image_to_3d_progress(task_id_image_to_3d)
        
        if result != "SUCCEEDED":
            print("Image to 3D conversion failed")
            return None
        print("Image to 3D conversion successful")
        
        task_id_retexture = self.retexture_mesh(task_id_image_to_3d, image_path)["result"]
        result = self.stream_retexture_progress(task_id_retexture)
        textured_model_url = self.retrieve_texture_json(task_id_retexture)["model_urls"]["glb"]
        
        if result != "SUCCEEDED":
            print("Retexturing failed")
            return None
        print("Retexturing successful")
        
        model_path = self.download_textured_model(textured_model_url, task_id_image_to_3d)
        
        if model_path:
            print("Final model downloaded successfully")
            cdn_url = self.upload_model_to_supabase(model_path, task_id_image_to_3d)
            return cdn_url
        else:
            print("Failed to download final model")
            return None
    


    
if __name__ == "__main__":
    meshy_client = MeshyClient()
    meshy_client.process_image_to_3d("../../public/images/coffeecup.png")
    
    
    
    
    