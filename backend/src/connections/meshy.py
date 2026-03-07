import requests
from dotenv import load_dotenv
import os
import base64
from pprint import pprint
from redisconnect import RedisClient
import json

class MeshyClient:
    def __init__(self):
        load_dotenv()
        self.api_key = os.getenv("MESHY_API_KEY")
        self.base_url = "https://api.meshy.ai/openapi/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}"
        }
        self.redis_client = RedisClient()
        
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
    
    def download_textured_model(self, textured_model_url: str, id: str) :
        response = requests.get(textured_model_url)
        response.raise_for_status()
        with open(f"../../output/textured_model_{id}.glb", "wb") as textured_model_file:
            textured_model_file.write(response.content)
        
        return True
            
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
    
    def process_image_to_3d(self, image_path: str) -> str:
        task_id_image_to_3d = self.convert_image_to_mesh(image_path)["result"]
        result = self.stream_image_to_3d_progress(task_id_image_to_3d)
        
        if result == "SUCCEEDED":
            print("Image to 3D conversion successful")
        else:
            print("Image to 3D conversion failed")
            return False
        
        task_id_retexture = self.retexture_mesh(task_id_image_to_3d, image_path)["result"]
        result = self.stream_retexture_progress(task_id_retexture)
        textured_model_url = self.retrieve_texture_json(task_id_retexture)["model_urls"]["glb"]
        
        if result == "SUCCEEDED":
            print("Retexturing successful")
        else:
            print("Retexturing failed")
            return False
        
        final_model = self.download_textured_model(textured_model_url, task_id_image_to_3d)
        
        if final_model:
            print("Final model downloaded successfully")
            return True
        else:
            print("Failed to download final model")
            return False
    


    
if __name__ == "__main__":
    meshy_client = MeshyClient()
    meshy_client.process_image_to_3d("../../public/images/ps5controller.png")
    
    
    
    
    