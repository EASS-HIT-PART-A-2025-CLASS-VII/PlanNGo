import pytest
from app.main import app
from app.db.database import create_all_tables, SessionLocal
from sqlalchemy.orm import Session
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# ניצור את כל הטבלאות בתחילת הבדיקות
create_all_tables()

@pytest_asyncio.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

@pytest.fixture(scope="function")
def db_session():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()