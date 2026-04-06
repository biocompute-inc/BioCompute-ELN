from __future__ import annotations

from urllib.parse import unquote

from fastapi.responses import JSONResponse
from sqlalchemy import select
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from core.db import async_session_maker
from models.share_link import ShareLink


class ShareLinkAccessMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path.rstrip("/")
        if not path.startswith("/share/"):
            return await call_next(request)

        parts = [part for part in path.split("/") if part]
        if len(parts) < 2:
            return await call_next(request)

        # Reserved routes handled by controllers with auth checks.
        if parts[1] in {"publish", "mine"}:
            return await call_next(request)

        token = unquote(parts[1]).strip()
        if not token:
            return JSONResponse({"detail": "Invalid or expired link."}, status_code=404)

        async with async_session_maker() as session:
            result = await session.execute(select(ShareLink).where(ShareLink.token == token))
            share_link = result.scalar_one_or_none()

        if share_link is None:
            return JSONResponse({"detail": "Invalid or expired link."}, status_code=404)

        request.state.share_link = share_link

        # Read-only links cannot receive comments.
        if len(parts) >= 3 and parts[2] == "comments" and request.method == "POST":
            if share_link.permission_level == "read":
                return JSONResponse({"detail": "This link is read-only."}, status_code=403)

        return await call_next(request)
