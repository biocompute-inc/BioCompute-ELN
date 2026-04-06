from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.service import current_active_user
from core.db import get_async_session
from models.canvas_block import CanvasBlock
from models.experiment import Experiment
from models.user import User

router = APIRouter(prefix="/experiments", tags=["experiments"])


def parse_uuid_or_400(raw: str, label: str) -> uuid.UUID:
    try:
        return uuid.UUID(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid {label}.") from exc


class CanvasBlockPayload(BaseModel):
    id: str | None = None
    type: str = Field(min_length=1, max_length=50)
    x: float
    y: float
    w: float = Field(gt=0)
    h: float | None = None
    data: dict[str, Any] = Field(default_factory=dict)
    locked: bool | None = None
    collapsed: bool | None = None
    hidden: bool | None = None
    theme: str | None = None


class ExperimentCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    status: str = Field(default="active", min_length=1, max_length=50)
    tag: str | None = Field(default=None, max_length=100)
    blocks: list[CanvasBlockPayload] = Field(default_factory=list)


class ExperimentUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    status: str | None = Field(default=None, min_length=1, max_length=50)
    tag: str | None = Field(default=None, max_length=100)


class ExperimentListItem(BaseModel):
    id: str
    title: str
    status: str
    tag: str | None = None
    block_count: int
    updated_at: datetime


class ExperimentCanvasResponse(BaseModel):
    id: str
    title: str
    status: str
    tag: str | None = None
    updated_at: datetime
    blocks: list[CanvasBlockPayload]


class CanvasSaveRequest(BaseModel):
    blocks: list[CanvasBlockPayload] = Field(default_factory=list)


def block_to_model(experiment_id: uuid.UUID, payload: CanvasBlockPayload) -> CanvasBlock:
    meta = {
        "client_id": payload.id,
        "h": payload.h,
        "locked": payload.locked,
        "collapsed": payload.collapsed,
        "hidden": payload.hidden,
        "theme": payload.theme,
    }
    compact_meta = {k: v for k, v in meta.items() if v is not None}
    data_content = dict(payload.data)
    if compact_meta:
        data_content["__meta"] = compact_meta

    return CanvasBlock(
        experiment_id=experiment_id,
        type=payload.type,
        x_pos=payload.x,
        y_pos=payload.y,
        width=payload.w,
        data_content=data_content,
    )


def block_from_model(block: CanvasBlock) -> CanvasBlockPayload:
    data_content = dict(block.data_content or {})
    meta = data_content.pop("__meta", {}) if isinstance(data_content, dict) else {}
    if not isinstance(meta, dict):
        meta = {}

    return CanvasBlockPayload(
        id=str(meta.get("client_id") or block.id),
        type=block.type,
        x=block.x_pos,
        y=block.y_pos,
        w=block.width,
        h=meta.get("h"),
        data=data_content if isinstance(data_content, dict) else {},
        locked=meta.get("locked"),
        collapsed=meta.get("collapsed"),
        hidden=meta.get("hidden"),
        theme=meta.get("theme"),
    )


async def get_owned_experiment_or_404(
    session: AsyncSession,
    experiment_id: uuid.UUID,
    owner_id: uuid.UUID,
) -> Experiment:
    result = await session.execute(
        select(Experiment).where(Experiment.id == experiment_id, Experiment.owner_id == owner_id)
    )
    experiment = result.scalar_one_or_none()
    if experiment is None:
        raise HTTPException(status_code=404, detail="Experiment not found.")
    return experiment


@router.get("", response_model=list[ExperimentListItem])
async def list_experiments(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[ExperimentListItem]:
    result = await session.execute(
        select(
            Experiment.id,
            Experiment.title,
            Experiment.status,
            Experiment.tag,
            Experiment.updated_at,
            func.count(CanvasBlock.id).label("block_count"),
        )
        .outerjoin(CanvasBlock, CanvasBlock.experiment_id == Experiment.id)
        .where(Experiment.owner_id == user.id)
        .group_by(
            Experiment.id,
            Experiment.title,
            Experiment.status,
            Experiment.tag,
            Experiment.updated_at,
        )
        .order_by(Experiment.updated_at.desc())
    )

    rows = result.all()
    return [
        ExperimentListItem(
            id=str(row.id),
            title=row.title,
            status=row.status,
            tag=row.tag,
            block_count=int(row.block_count or 0),
            updated_at=row.updated_at,
        )
        for row in rows
    ]


@router.post("", response_model=ExperimentCanvasResponse)
async def create_experiment(
    payload: ExperimentCreateRequest,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> ExperimentCanvasResponse:
    experiment = Experiment(
        title=payload.title.strip(),
        status=payload.status.strip() or "active",
        tag=(payload.tag or "").strip() or None,
        owner_id=user.id,
    )
    session.add(experiment)
    await session.flush()

    for block_payload in payload.blocks:
        session.add(block_to_model(experiment.id, block_payload))

    await session.commit()
    await session.refresh(experiment)

    return ExperimentCanvasResponse(
        id=str(experiment.id),
        title=experiment.title,
        status=experiment.status,
        tag=experiment.tag,
        updated_at=experiment.updated_at,
        blocks=payload.blocks,
    )


@router.put("/{experiment_id}", response_model=ExperimentListItem)
async def update_experiment(
    experiment_id: str,
    payload: ExperimentUpdateRequest,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> ExperimentListItem:
    parsed_id = parse_uuid_or_400(experiment_id, "experiment id")
    experiment = await get_owned_experiment_or_404(session, parsed_id, user.id)

    if payload.title is not None:
        experiment.title = payload.title.strip() or experiment.title
    if payload.status is not None:
        experiment.status = payload.status.strip() or experiment.status
    if payload.tag is not None:
        experiment.tag = payload.tag.strip() or None

    experiment.updated_at = datetime.now(timezone.utc)
    await session.commit()

    count_result = await session.execute(
        select(func.count(CanvasBlock.id)).where(CanvasBlock.experiment_id == experiment.id)
    )
    block_count = int(count_result.scalar_one() or 0)

    return ExperimentListItem(
        id=str(experiment.id),
        title=experiment.title,
        status=experiment.status,
        tag=experiment.tag,
        block_count=block_count,
        updated_at=experiment.updated_at,
    )


@router.get("/{experiment_id}/canvas", response_model=ExperimentCanvasResponse)
async def get_experiment_canvas(
    experiment_id: str,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> ExperimentCanvasResponse:
    parsed_id = parse_uuid_or_400(experiment_id, "experiment id")
    experiment = await get_owned_experiment_or_404(session, parsed_id, user.id)

    blocks_result = await session.execute(
        select(CanvasBlock)
        .where(CanvasBlock.experiment_id == experiment.id)
        .order_by(CanvasBlock.created_at.asc())
    )
    blocks = blocks_result.scalars().all()

    return ExperimentCanvasResponse(
        id=str(experiment.id),
        title=experiment.title,
        status=experiment.status,
        tag=experiment.tag,
        updated_at=experiment.updated_at,
        blocks=[block_from_model(block) for block in blocks],
    )


@router.put("/{experiment_id}/canvas")
async def save_experiment_canvas(
    experiment_id: str,
    payload: CanvasSaveRequest,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> dict[str, Any]:
    parsed_id = parse_uuid_or_400(experiment_id, "experiment id")
    experiment = await get_owned_experiment_or_404(session, parsed_id, user.id)

    await session.execute(delete(CanvasBlock).where(CanvasBlock.experiment_id == experiment.id))
    for block_payload in payload.blocks:
        session.add(block_to_model(experiment.id, block_payload))

    experiment.updated_at = datetime.now(timezone.utc)
    await session.commit()

    return {
        "status": "saved",
        "experiment_id": str(experiment.id),
        "block_count": len(payload.blocks),
        "updated_at": experiment.updated_at.isoformat(),
    }