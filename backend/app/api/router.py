from fastapi import APIRouter
from sqlalchemy import text
from app.db.session import async_session_factory

router = APIRouter(prefix="/api/v1")

@router.get("/health")
async def health():
    db_status = "unreachable"
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
            db_status = "connected"
    except Exception:
        db_status = "error"
    return {"status": "ok", "db": db_status}
