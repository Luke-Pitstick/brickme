import requests
from dotenv import load_dotenv
import os
import base64
from pprint import pprint

class MeshyClient:
    def __init__(self):
        load_dotenv()
        self.api_key = os.getenv("MESHY_API_KEY")
        self.base_url = "https://api.meshy.ai/openapi/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}"
        }

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
        
    def retexture_mesh(self, model_url: str, text_style_prompt: str, image_style_url: str) -> str:
        payload = {
            "model_url": model_url,
            "text_style_prompt": text_style_prompt,
            "image_style_url": image_style_url,
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
    
    def download_textured_model(self, textured_model_url: str, id: str) :
        response = requests.get(textured_model_url)
        response.raise_for_status()
        with open(f"textured_model_{id}.glb", "wb") as textured_model_file:
            textured_model_file.write(response.content)
    
if __name__ == "__main__":
    meshy_client = MeshyClient()
    # task_id = meshy_client.convert_image_to_mesh("../../public/ps5.png")["result"]
    task_id = "019cca31-4921-7bc3-a19b-3f3400f99063"
    print(task_id)
    model_json = meshy_client.retrieve_model_json(task_id)
    pprint(model_json)
    model_url = model_json['model_urls']['glb']
    print(model_url)
    meshy_client.download_untextured_model(model_url, task_id)
    
    