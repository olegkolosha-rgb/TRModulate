from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import subprocess
import tempfile
import shutil
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
import uuid
from datetime import datetime, timezone
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

MODULATE_API_KEY = os.environ.get('MODULATE_API_KEY')
MODULATE_URL = os.environ.get('MODULATE_URL', 'https://platform.modulate.ai/api/velma-2-stt-batch')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

VIDEO_EXTENSIONS = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.m4v', '.mpg', '.mpeg'}
AUDIO_EXTENSIONS = {'.mp3', '.wav', '.flac', '.m4a', '.ogg', '.aac', '.aiff', '.wma'}


# ---------- Models ----------
class TranscriptionRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    params: Dict[str, Any] = {}
    duration_ms: int = 0
    segment_count: int = 0
    result: Dict[str, Any] = {}


# ---------- FFmpeg helpers ----------
def check_ffmpeg() -> bool:
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        return True
    except (subprocess.SubprocessError, FileNotFoundError):
        return False


def _ffmpeg_to_mp3(input_path: str, bitrate: str, strip_video: bool) -> str:
    fd, out_path = tempfile.mkstemp(suffix=".mp3", prefix="modulate_")
    os.close(fd)
    cmd = ["ffmpeg", "-i", input_path]
    if strip_video:
        cmd += ["-vn"]
    cmd += ["-acodec", "libmp3lame", "-b:a", bitrate, "-ac", "1", "-ar", "16000", "-y", out_path]
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        return out_path
    except subprocess.CalledProcessError as e:
        if os.path.exists(out_path):
            os.remove(out_path)
        raise RuntimeError(f"Ошибка обработки аудио (ffmpeg): {e.stderr.decode()[:300]}")


def file_size_mb(path: str) -> float:
    return os.path.getsize(path) / (1024 * 1024)


# ---------- Modulate call with 413 retry ----------
def send_to_modulate(audio_path: str, params: Dict[str, str]) -> Dict[str, Any]:
    bitrates = ["64k", "32k"]
    current = audio_path
    temp_compressed: Optional[str] = None
    last_error = None

    for attempt in range(len(bitrates) + 1):
        try:
            with open(current, "rb") as f:
                files = {"upload_file": (os.path.basename(current), f, "audio/mpeg")}
                resp = requests.post(
                    MODULATE_URL,
                    headers={"X-API-Key": MODULATE_API_KEY},
                    data=params,
                    files=files,
                    timeout=1800,
                )
            if resp.status_code == 413:
                if attempt < len(bitrates):
                    if temp_compressed and os.path.exists(temp_compressed):
                        os.remove(temp_compressed)
                    temp_compressed = _ffmpeg_to_mp3(current, bitrates[attempt], strip_video=False)
                    current = temp_compressed
                    continue
                raise RuntimeError("Файл слишком большой даже после сжатия. Сократите длительность записи.")
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.HTTPError as e:
            code = e.response.status_code if e.response is not None else 502
            detail = e.response.text[:300] if e.response is not None else str(e)
            if code == 401 or code == 403:
                raise RuntimeError("Modulate API отклонил запрос: неверный или отсутствующий API-ключ.")
            raise RuntimeError(f"Ошибка Modulate API ({code}): {detail}")
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"Не удалось связаться с Modulate API: {e}")
    raise RuntimeError("Не удалось выполнить транскрибацию.")


def prepare_and_send(raw_path: str, ext: str, params: Dict[str, str]) -> Dict[str, Any]:
    """Blocking pipeline: extract/compress audio then call Modulate. Runs in a thread."""
    temp_files = []
    audio_to_send = raw_path
    try:
        if ext in VIDEO_EXTENSIONS:
            audio_to_send = _ffmpeg_to_mp3(raw_path, "64k", strip_video=True)
            temp_files.append(audio_to_send)
        elif ext in AUDIO_EXTENSIONS:
            if not (ext == ".mp3" and file_size_mb(raw_path) < 100):
                audio_to_send = _ffmpeg_to_mp3(raw_path, "64k", strip_video=False)
                temp_files.append(audio_to_send)
        return send_to_modulate(audio_to_send, params)
    finally:
        for f in temp_files:
            if f and os.path.exists(f):
                try:
                    os.remove(f)
                except OSError:
                    pass


async def run_job(job_id: str, raw_path: str, ext: str, params: Dict[str, str], filename: str):
    try:
        result = await asyncio.to_thread(prepare_and_send, raw_path, ext, params)
        record = TranscriptionRecord(
            filename=filename,
            params=params,
            duration_ms=int(result.get("duration_ms", 0) or 0),
            segment_count=len(result.get("utterances", []) or []),
            result=result,
        )
        await db.transcriptions.insert_one(record.model_dump())
        await db.jobs.update_one(
            {"id": job_id},
            {"$set": {"status": "done", "record_id": record.id}},
        )
    except Exception as e:
        logger.exception("Transcription job failed")
        await db.jobs.update_one(
            {"id": job_id},
            {"$set": {"status": "error", "error": str(e)[:400]}},
        )
    finally:
        if raw_path and os.path.exists(raw_path):
            try:
                os.remove(raw_path)
            except OSError:
                pass


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Modulate Velma-2 STT API"}


@api_router.get("/config")
async def get_config():
    return {"api_key_configured": bool(MODULATE_API_KEY), "ffmpeg_available": check_ffmpeg()}


@api_router.post("/transcribe")
async def transcribe(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    speaker_diarization: bool = Form(True),
    emotion_signal: bool = Form(True),
    accent_signal: bool = Form(False),
    deepfake_signal: bool = Form(False),
    pii_phi_tagging: bool = Form(False),
):
    if not MODULATE_API_KEY:
        raise HTTPException(status_code=400, detail="MODULATE_API_KEY не настроен на сервере.")
    if not check_ffmpeg():
        raise HTTPException(status_code=500, detail="ffmpeg не установлен на сервере.")

    ext = os.path.splitext(file.filename or "")[1].lower()
    fd, raw_path = tempfile.mkstemp(suffix=ext or ".bin", prefix="modulate_upload_")
    with os.fdopen(fd, "wb") as out:
        shutil.copyfileobj(file.file, out)

    bool2str = lambda b: "true" if b else "false"
    params = {
        "speaker_diarization": bool2str(speaker_diarization),
        "emotion_signal": bool2str(emotion_signal),
        "accent_signal": bool2str(accent_signal),
        "deepfake_signal": bool2str(deepfake_signal),
        "pii_phi_tagging": bool2str(pii_phi_tagging),
    }

    job = {
        "id": str(uuid.uuid4()),
        "filename": file.filename or "audio",
        "status": "processing",
        "error": None,
        "record_id": None,
        "params": params,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.jobs.insert_one({**job})
    background_tasks.add_task(run_job, job["id"], raw_path, ext, params, job["filename"])
    return {"job_id": job["id"], "status": "processing"}


@api_router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Задача не найдена.")
    resp = {"status": job["status"], "error": job.get("error")}
    if job["status"] == "done" and job.get("record_id"):
        rec = await db.transcriptions.find_one({"id": job["record_id"]}, {"_id": 0})
        resp["record"] = rec
    return resp


@api_router.get("/history", response_model=List[Dict[str, Any]])
async def get_history():
    docs = await db.transcriptions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    # Lightweight list (omit full result for payload size)
    return [
        {
            "id": d["id"],
            "filename": d["filename"],
            "created_at": d["created_at"],
            "duration_ms": d.get("duration_ms", 0),
            "segment_count": d.get("segment_count", 0),
            "params": d.get("params", {}),
        }
        for d in docs
    ]


@api_router.get("/history/{record_id}")
async def get_history_item(record_id: str):
    doc = await db.transcriptions.find_one({"id": record_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Запись не найдена.")
    return doc


@api_router.delete("/history/{record_id}")
async def delete_history_item(record_id: str):
    res = await db.transcriptions.delete_one({"id": record_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Запись не найдена.")
    return {"deleted": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
