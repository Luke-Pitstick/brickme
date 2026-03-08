from fastapi import FastAPI, BackgroundTasks, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from pydantic import BaseModel, HttpUrl
from typing import Optional
from pathlib import Path
import os
import json
import uuid
import shutil

from src.connections.meshy import MeshyClient

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parents[2]   # backend/
PUBLIC_DIR = BASE_DIR / "public"
UPLOADS_DIR = PUBLIC_DIR / "mock-images"
OUTPUT_DIR = BASE_DIR / "output"
DATA_DIR = BASE_DIR / "data"
BUILDS_FILE = DATA_DIR / "builds.json"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

if not BUILDS_FILE.exists():
    BUILDS_FILE.write_text("[]", encoding="utf-8")

app.mount("/mock-images", StaticFiles(directory=str(UPLOADS_DIR)), name="mock-images")
app.mount("/output", StaticFiles(directory=str(OUTPUT_DIR)), name="output")


class StartImageTo3DRequest(BaseModel):
    cdn_url: HttpUrl


class SaveBuildRequest(BaseModel):
    user_id: str
    image_url: str
    model_url: str
    name: Optional[str] = None


@app.get("/health")
async def health():
    return {"status": "ok"}


def get_meshy_client() -> MeshyClient:
    return MeshyClient()


def _read_builds():
    return json.loads(BUILDS_FILE.read_text(encoding="utf-8"))


def _write_builds(builds):
    BUILDS_FILE.write_text(json.dumps(builds, indent=2), encoding="utf-8")


@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix or ".png"
    filename = f"{uuid.uuid4()}{ext}"
    dest = UPLOADS_DIR / filename

    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    return {"cdn_url": f"http://localhost:8000/mock-images/{filename}"}


REDIS_KEY_PREFIX = "meshy:task:"


def _run_meshy_and_store_result(meshy: MeshyClient, task_id: str, cdn_url: str):
    redis = meshy.redis_client
    try:
        result_payload = meshy.process_image_to_3d(cdn_url)
        if result_payload:
            redis.set(
                f"{REDIS_KEY_PREFIX}{task_id}",
                json.dumps({"status": "succeeded", "result": result_payload})
            )
        else:
            redis.set(
                f"{REDIS_KEY_PREFIX}{task_id}",
                json.dumps({"status": "failed", "result": None, "error": "Meshy pipeline failed"})
            )
    except Exception as e:
        redis.set(
            f"{REDIS_KEY_PREFIX}{task_id}",
            json.dumps({"status": "failed", "result": None, "error": str(e)})
        )


@app.post("/start-image-to-3d", status_code=202)
async def start_image_to_3d(
    body: StartImageTo3DRequest,
    background_tasks: BackgroundTasks,
    meshy_client: MeshyClient = Depends(get_meshy_client),
):
    task_id = str(uuid.uuid4())
    meshy_client.redis_client.set(
        f"{REDIS_KEY_PREFIX}{task_id}",
        json.dumps({"status": "processing", "result": None})
    )
    background_tasks.add_task(_run_meshy_and_store_result, meshy_client, task_id, str(body.cdn_url))
    return {"task_id": task_id, "message": "Job started", "cdn_url": str(body.cdn_url)}


@app.get("/status/{task_id}")
async def get_status(task_id: str, meshy_client: MeshyClient = Depends(get_meshy_client)):
    raw = meshy_client.redis_client.get(f"{REDIS_KEY_PREFIX}{task_id}")
    if not raw:
        raise HTTPException(status_code=404, detail={"task_id": task_id, "status": "not_found"})
    data = json.loads(raw)
    return {"task_id": task_id, "status": data["status"]}


@app.get("/result/{task_id}")
async def get_result(task_id: str, meshy_client: MeshyClient = Depends(get_meshy_client)):
    raw = meshy_client.redis_client.get(f"{REDIS_KEY_PREFIX}{task_id}")
    if not raw:
        raise HTTPException(status_code=404, detail={"task_id": task_id, "status": "not_found", "result": None})
    data = json.loads(raw)
    if data["status"] == "processing":
        return {"task_id": task_id, "status": "processing", "result": None}
    return {
        "task_id": task_id,
        "status": data["status"],
        "result": data.get("result"),
        "error": data.get("error"),
    }


@app.post("/builds")
async def save_build(body: SaveBuildRequest):
    builds = _read_builds()
    row = {
        "id": str(uuid.uuid4()),
        "user_id": body.user_id,
        "name": body.name or "Untitled Build",
        "image_url": body.image_url,
        "model_url": body.model_url,
        "created_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
    }
    builds.append(row)
    _write_builds(builds)
    return row


@app.get("/builds/{user_id}")
async def get_builds(user_id: str):
    builds = _read_builds()
    filtered = [b for b in builds if b["user_id"] == user_id]
    filtered.sort(key=lambda b: b["created_at"], reverse=True)
    return filtered


@app.delete("/builds/{build_id}")
async def delete_build(build_id: str):
    builds = _read_builds()
    new_builds = [b for b in builds if b["id"] != build_id]
    _write_builds(new_builds)
    return {"message": "Build deleted"}

@app.post("/rerun-lego/{job_id}")
async def rerun_lego(job_id: str):
    job_dir = OUTPUT_DIR / "jobs" / job_id
    raw_glb_path = job_dir / "meshy_raw.glb"

    if not raw_glb_path.exists():
        raise HTTPException(status_code=404, detail="No saved Meshy model for that job")

    from src.three_d.lego_pipeline import build_lego_package

    result = build_lego_package(
        input_glb_path=str(raw_glb_path),
        job_dir=str(job_dir),
        public_base=f"http://localhost:8000/output/jobs/{job_id}"
    )
    return {"job_id": job_id, "result": result}