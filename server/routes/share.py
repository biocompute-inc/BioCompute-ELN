from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.service import current_active_user
from core.db import get_async_session
from models.share_comment import ShareComment
from models.share_link import ShareLink
from models.user import User

router = APIRouter(prefix="/share", tags=["share"])

SENSITIVE_MARKERS = (
    "secret",
    "token",
    "password",
    "private",
    "internal",
    "hidden",
)


def is_sensitive_key(key: str) -> bool:
    lowered = key.strip().lower()
    if lowered.startswith("_"):
        return True
    return any(marker in lowered for marker in SENSITIVE_MARKERS)


def sanitize_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: sanitize_value(item)
            for key, item in value.items()
            if not is_sensitive_key(str(key))
        }
    if isinstance(value, list):
        return [sanitize_value(item) for item in value]
    return value


class PublishShareRequest(BaseModel):
    project_id: str = Field(min_length=1, max_length=255)
    title: str = Field(min_length=1, max_length=255)
    permission_level: Literal["read", "comment"] = "comment"
    blocks: list[dict[str, Any]] = Field(default_factory=list)


class PublishShareResponse(BaseModel):
    token: str
    share_url_path: str
    permission_level: Literal["read", "comment"]
    project_id: str


class ShareCommentCreate(BaseModel):
    author: str = Field(min_length=1, max_length=120)
    text: str = Field(min_length=1, max_length=4000)


class ShareCommentRead(BaseModel):
    id: str
    author: str
    text: str
    created_at: datetime
    resolved: bool


class ShareReadResponse(BaseModel):
    token: str
    project_id: str
    title: str
    permission_level: Literal["read", "comment"]
    created_at: datetime
    blocks: list[dict[str, Any]]
    comments: list[ShareCommentRead]


class ShareMineItem(BaseModel):
    token: str
    project_id: str
    title: str
    permission_level: Literal["read", "comment"]
    created_at: datetime
    unresolved_comments: int
    comments: list[ShareCommentRead]


@router.post("/publish", response_model=PublishShareResponse)
async def publish_share_link(
    payload: PublishShareRequest,
    request: Request,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> PublishShareResponse:
    share_link = ShareLink(
        project_id=payload.project_id,
        title=payload.title,
        permission_level=payload.permission_level,
        owner_id=user.id,
        payload={"blocks": payload.blocks},
    )
    session.add(share_link)
    await session.commit()
    await session.refresh(share_link)

    encoded = quote(share_link.token, safe="")
    return PublishShareResponse(
        token=share_link.token,
        share_url_path=f"/view/{encoded}",
        permission_level=share_link.permission_level,  # type: ignore[arg-type]
        project_id=share_link.project_id,
    )


@router.get("/mine", response_model=list[ShareMineItem])
async def list_my_share_links(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[ShareMineItem]:
    links_result = await session.execute(
        select(ShareLink).where(ShareLink.owner_id == user.id).order_by(ShareLink.created_at.desc())
    )
    links = links_result.scalars().all()

    if not links:
        return []

    link_ids = [link.id for link in links]
    comments_result = await session.execute(
        select(ShareComment).where(ShareComment.share_link_id.in_(link_ids)).order_by(ShareComment.created_at.asc())
    )
    comments = comments_result.scalars().all()

    grouped: dict[uuid.UUID, list[ShareComment]] = {}
    for comment in comments:
        grouped.setdefault(comment.share_link_id, []).append(comment)

    return [
        ShareMineItem(
            token=link.token,
            project_id=link.project_id,
            title=link.title,
            permission_level=link.permission_level,  # type: ignore[arg-type]
            created_at=link.created_at,
            unresolved_comments=len([c for c in grouped.get(link.id, []) if not c.resolved]),
            comments=[
                ShareCommentRead(
                    id=str(comment.id),
                    author=comment.author_name,
                    text=comment.content,
                    created_at=comment.created_at,
                    resolved=comment.resolved,
                )
                for comment in grouped.get(link.id, [])
            ],
        )
        for link in links
    ]


@router.get("/{token}", response_model=ShareReadResponse)
async def get_shared_project(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
) -> ShareReadResponse:
    share_link = getattr(request.state, "share_link", None)
    if not isinstance(share_link, ShareLink):
        raise HTTPException(status_code=404, detail="Invalid or expired link.")

    comments_result = await session.execute(
        select(ShareComment).where(ShareComment.share_link_id == share_link.id).order_by(ShareComment.created_at.asc())
    )
    comments = comments_result.scalars().all()

    raw_blocks = list((share_link.payload or {}).get("blocks", []))
    blocks = [sanitize_value(block) for block in raw_blocks] if share_link.permission_level == "read" else raw_blocks

    return ShareReadResponse(
        token=share_link.token,
        project_id=share_link.project_id,
        title=share_link.title,
        permission_level=share_link.permission_level,  # type: ignore[arg-type]
        created_at=share_link.created_at,
        blocks=blocks,
        comments=[
            ShareCommentRead(
                id=str(comment.id),
                author=comment.author_name,
                text=comment.content,
                created_at=comment.created_at,
                resolved=comment.resolved,
            )
            for comment in comments
        ],
    )


@router.post("/{token}/comments", response_model=ShareCommentRead)
async def add_shared_comment(
    payload: ShareCommentCreate,
    request: Request,
    session: AsyncSession = Depends(get_async_session),
) -> ShareCommentRead:
    share_link = getattr(request.state, "share_link", None)
    if not isinstance(share_link, ShareLink):
        raise HTTPException(status_code=404, detail="Invalid or expired link.")

    comment = ShareComment(
        share_link_id=share_link.id,
        author_name=payload.author.strip(),
        content=payload.text.strip(),
    )
    session.add(comment)
    await session.commit()
    await session.refresh(comment)

    return ShareCommentRead(
        id=str(comment.id),
        author=comment.author_name,
        text=comment.content,
        created_at=comment.created_at,
        resolved=comment.resolved,
    )


@router.post("/{token}/comments/{comment_id}/resolve")
async def resolve_shared_comment(
    comment_id: str,
    request: Request,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> dict[str, str]:
    share_link = getattr(request.state, "share_link", None)
    if not isinstance(share_link, ShareLink):
        raise HTTPException(status_code=404, detail="Invalid or expired link.")

    if share_link.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only the link owner can resolve comments.")

    try:
        parsed_comment_id = uuid.UUID(comment_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid comment ID.") from exc

    result = await session.execute(
        select(ShareComment).where(
            ShareComment.id == parsed_comment_id,
            ShareComment.share_link_id == share_link.id,
        )
    )
    comment = result.scalar_one_or_none()
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found.")

    comment.resolved = True
    await session.commit()
    return {"status": "resolved"}
