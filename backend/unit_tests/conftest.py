import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.database import Base
from app.models.user_model import User
from app.services.auth_service import hash_password 


# --- הגדרת בסיס נתוני זמני ---
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- פיקסטורות כלליות לשימוש חוזר בטסטים ---
def get_test_user():
    return User(
        id=1,
        username="testuser",
        email="test@example.com",
        password=hash_password("123456"),  # הצפנה נכונה
        is_admin=False
    )

def get_admin_user():
    return User(
        id=2,
        username="admin",
        email="admin@example.com",
        password=hash_password("admin123"),  # הצפנה נכונה
        is_admin=True
    )

@pytest.fixture
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    user = get_test_user()
    admin = get_admin_user()

    db.add_all([user, admin])
    db.commit()

    try:
        yield db
    finally:
        db.close()
