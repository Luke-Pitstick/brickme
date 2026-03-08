from fastapi import FastAPI, BackgroundTasks, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import json
import uuid
from dotenv import load_dotenv
from pydantic import BaseModel, HttpUrl
from src.connections.meshy import MeshyClient
from supabase import create_client, Client

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StartImageTo3DRequest(BaseModel):
    cdn_url: HttpUrl


@app.get("/health")
async def health():
    """Health check for load balancers and monitoring."""
    return {"status": "ok"}


def get_meshy_client() -> MeshyClient:
    return MeshyClient()


url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

REDIS_KEY_PREFIX = "meshy:task:"


def _run_meshy_and_store_result(meshy: MeshyClient, task_id: str, cdn_url: str):
    """Background task: run Meshy pipeline and store result in Redis."""
    redis = meshy.redis_client
    try:
        cdn_result = meshy.process_image_to_3d(cdn_url)
        if cdn_result:
            redis.set(f"{REDIS_KEY_PREFIX}{task_id}", json.dumps({"status": "succeeded", "result": cdn_result}))
        else:
            redis.set(f"{REDIS_KEY_PREFIX}{task_id}", json.dumps({"status": "failed", "result": None, "error": "Meshy pipeline failed"}))
    except Exception as e:
        redis.set(f"{REDIS_KEY_PREFIX}{task_id}", json.dumps({"status": "failed", "result": None, "error": str(e)}))


@app.post("/start-image-to-3d", status_code=202)
async def start_image_to_3d(
    body: StartImageTo3DRequest,
    background_tasks: BackgroundTasks,
    meshy_client: MeshyClient = Depends(get_meshy_client),
):
    """Start image-to-3D job. Returns task_id immediately. Poll /status/{task_id} and /result/{task_id}."""
    task_id = str(uuid.uuid4())
    cdn_url = str(body.cdn_url)
    meshy_client.redis_client.set(
        f"{REDIS_KEY_PREFIX}{task_id}",
        json.dumps({"status": "processing", "result": None})
    )
    background_tasks.add_task(_run_meshy_and_store_result, meshy_client, task_id, cdn_url)
    return {"task_id": task_id, "message": "Job started", "cdn_url": cdn_url}


@app.get("/status/{task_id}")
async def get_status(task_id: str, meshy_client: MeshyClient = Depends(get_meshy_client)):
    """Poll this to check if the job is done. Returns status: processing | succeeded | failed."""
    redis = meshy_client.redis_client
    raw = redis.get(f"{REDIS_KEY_PREFIX}{task_id}")
    if not raw:
        raise HTTPException(status_code=404, detail={"task_id": task_id, "status": "not_found"})
    data = json.loads(raw)
    return {"task_id": task_id, "status": data["status"]}


@app.get("/result/{task_id}")
async def get_result(task_id: str, meshy_client: MeshyClient = Depends(get_meshy_client)):
    """When status is succeeded, call this to get the final model CDN URL."""
    redis = meshy_client.redis_client
    raw = redis.get(f"{REDIS_KEY_PREFIX}{task_id}")
    if not raw:
        raise HTTPException(status_code=404, detail={"task_id": task_id, "status": "not_found", "result": None})
    data = json.loads(raw)
    if data["status"] == "processing":
        return {"task_id": task_id, "status": "processing", "result": None}
    return {"task_id": task_id, "status": data["status"], "result": data.get("result"), "error": data.get("error")}
