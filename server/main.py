from __future__ import annotations

import json
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.db import Base, engine
from core.share_middleware import ShareLinkAccessMiddleware
from routes.auth import router as auth_router
from routes.experiments import router as experiments_router
from routes.share import router as share_router

# Import models so SQLAlchemy metadata knows every table before create_all.
from models import (  # noqa: F401
    CanvasBlock,
    Collaborator,
    Experiment,
    ExperimentComment,
    ShareComment,
    ShareLink,
    Template,
    User,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


def parse_cors_origins(raw: str | None) -> list[str]:
    if not raw:
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]

    cleaned = raw.strip()
    if cleaned.startswith("["):
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            parsed = []
        if isinstance(parsed, list):
            return [str(origin).rstrip("/") for origin in parsed if str(origin).strip()]

    return [origin.strip().rstrip("/") for origin in cleaned.split(",") if origin.strip()]


app = FastAPI(title="BioCompute ELN API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins(os.getenv("CORS_ORIGINS")),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(ShareLinkAccessMiddleware)

app.include_router(auth_router)
app.include_router(experiments_router)
app.include_router(share_router)


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
