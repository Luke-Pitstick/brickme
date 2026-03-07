import requests
from dotenv import load_dotenv
import os
import base64

class MeshyClient:
    def __init__(self):
        load_dotenv()
        self.api_key = os.getenv("MESHY_API_KEY")
        self.base_url = "https://api.meshy.ai/openapi/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}"
        }
        print(self.headers)

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
        
        
        
if __name__ == "__main__":
    meshy_client = MeshyClient()
    response = meshy_client.convert_image_to_mesh("../../public/ps5.png")
    print(response)