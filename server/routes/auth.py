from __future__ import annotations

from fastapi import APIRouter, Depends

from auth.schemas import UserCreate, UserRead, UserUpdate
from auth.service import auth_backend, current_active_user, fastapi_users
from models.user import User

router = APIRouter(prefix="/auth")

router.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/jwt",
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="",
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="",
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix="",
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)


@router.get("/me", response_model=UserRead, tags=["auth"])
async def me(user: User = Depends(current_active_user)) -> User:
    return user
