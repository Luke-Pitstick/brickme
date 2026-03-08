#!/usr/bin/env python3
"""Run the FastAPI dev server with the correct Python path."""
import os
import sys
from pathlib import Path
import uvicorn

# Add backend root so "src" is importable
backend_root = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_root))
os.environ["PYTHONPATH"] = str(backend_root)



uvicorn.run(
    "src.api.main:app",
    host="0.0.0.0",
    port=8000,
    reload=False,
)
