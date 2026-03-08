from fastapi import FastAPI, BackgroundTasks, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os
import json
import uuid
from dotenv import load_dotenv
from typing import Optional
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


class SaveBuildRequest(BaseModel):
    user_id: str
    image_url: str
    model_url: str
    name: Optional[str] = None


@app.get("/health")
async def health():
    """Health check for load balancers and monitoring."""
    return {"status": "ok"}


def get_meshy_client() -> MeshyClient:
    return MeshyClient()


url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

# Initialize Supabase client if credentials are available
supabase: Client = None
if url and key and not url.startswith("your_"):
    try:
        supabase = create_client(url, key)
        print(f"✓ Supabase client initialized")
    except Exception as e:
        print(f"⚠ Warning: Could not initialize Supabase: {e}")
        print(f"  Update your .env file with valid Supabase credentials")
else:
    print(f"⚠ Warning: Supabase credentials not configured")
    print(f"  Update your .env file with valid Supabase credentials")

REDIS_KEY_PREFIX = "meshy:task:"


@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """Upload an image to Supabase Storage and return its public CDN URL."""
    if not url or not key:
        # For development/testing: return a mock URL when Supabase is not configured
        print("⚠ Warning: Supabase not configured, returning mock URL for development")
        ext = file.filename.split(".")[-1] if file.filename else "png"
        mock_filename = f"mock-{uuid.uuid4()}.{ext}"
        mock_url = f"http://localhost:8000/mock-images/{mock_filename}"
        return {"cdn_url": mock_url}

    import requests as http_requests

    ext = file.filename.split(".")[-1] if file.filename else "png"
    file_name = f"{uuid.uuid4()}.{ext}"
    content = await file.read()
    content_type = file.content_type or "image/png"
    bucket = "images"

    # Upload directly via Supabase REST API
    upload_url = f"{url}/storage/v1/object/{bucket}/{file_name}"
    resp = http_requests.post(
        upload_url,
        headers={
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Content-Type": content_type,
        },
        data=content,
    )

    print(f"[upload-image] Supabase response: {resp.status_code} {resp.text}")
    if not resp.ok:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    public_url = f"{url}/storage/v1/object/public/{bucket}/{file_name}"
    return {"cdn_url": public_url}


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


# ── Builds CRUD ──────────────────────────────────────────────────────────────

@app.on_event("startup")
async def create_builds_table():
    """Create builds table if it doesn't exist."""
    if not url or not key or url.startswith("your_"):
        print("[startup] Skipping builds table creation - Supabase not configured")
        return
    
    import requests as http_requests
    sql = """
    CREATE TABLE IF NOT EXISTS public.builds (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL,
        name TEXT,
        image_url TEXT NOT NULL,
        model_url TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
    );
    ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;
    """
    resp = http_requests.post(
        f"{url}/rest/v1/rpc/exec_sql",
        headers={"Authorization": f"Bearer {key}", "apikey": key, "Content-Type": "application/json"},
        json={"query": sql},
    )
    # If exec_sql doesn't exist, table must be created manually
    if resp.ok:
        print("[startup] builds table ensured")
    else:
        print(f"[startup] Could not auto-create builds table (may already exist or need manual creation): {resp.text}")


@app.post("/builds")
async def save_build(body: SaveBuildRequest):
    """Save a completed build for a user."""
    import requests as http_requests

    row = {
        "user_id": body.user_id,
        "name": body.name or "Untitled Build",
        "image_url": body.image_url,
        "model_url": body.model_url,
    }

    resp = http_requests.post(
        f"{url}/rest/v1/builds",
        headers={
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        json=row,
    )

    if not resp.ok:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    return resp.json()


@app.get("/builds/{user_id}")
async def get_builds(user_id: str):
    """Get all builds for a user."""
    import requests as http_requests

    resp = http_requests.get(
        f"{url}/rest/v1/builds?user_id=eq.{user_id}&order=created_at.desc",
        headers={
            "Authorization": f"Bearer {key}",
            "apikey": key,
        },
    )

    if not resp.ok:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    return resp.json()


@app.delete("/builds/{build_id}")
async def delete_build(build_id: str):
    """Delete a build by ID."""
    import requests as http_requests

    resp = http_requests.delete(
        f"{url}/rest/v1/builds?id=eq.{build_id}",
        headers={
            "Authorization": f"Bearer {key}",
            "apikey": key,
        },
    )

    if not resp.ok:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    return {"message": "Build deleted"}
