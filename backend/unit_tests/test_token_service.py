import pytest
from datetime import timedelta, datetime, timezone
from jose import jwt
from fastapi import HTTPException, status
from app.services.token_service import (
    create_access_token,
    get_current_user,
    require_admin_user
)
from app.models.user_model import User
from dotenv import load_dotenv
import os

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

# --- create_access_token ---
# טוקן נוצר תקין וכולל exp
def test_create_access_token_basic():
    data = {"sub": "test@example.com"}
    token = create_access_token(data)
    decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert decoded["sub"] == "test@example.com"
    assert "exp" in decoded

# טוקן עם תוקף מותאם אישית
def test_create_access_token_with_custom_expiry():
    data = {"sub": "test@example.com"}
    expires = timedelta(minutes=1)
    token = create_access_token(data, expires_delta=expires)
    decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    exp_time = datetime.fromtimestamp(decoded["exp"], tz=timezone.utc)
    now = datetime.now(timezone.utc)
    assert 50 <= (exp_time - now).total_seconds() <= 70


# --- get_current_user ---
# טוקן תקף מחזיר משתמש מה-DB
def test_get_current_user_valid(db):
    user = db.query(User).filter(User.email == "test@example.com").first()
    token = create_access_token({"sub": user.email})

    class Token:
        credentials = token

    current = get_current_user(Token(), db)
    assert current.email == user.email

# טוקן חוקי אך לא קיים DB-user
def test_get_current_user_user_not_found(db):
    token = create_access_token({"sub": "ghost@example.com"})

    class Token:
        credentials = token

    with pytest.raises(HTTPException) as e:
        get_current_user(Token(), db)
    assert e.value.status_code == 401

# טוקן לא חתום נכון
def test_get_current_user_invalid_token(db):
    class Token:
        credentials = "invalid.token.string"

    with pytest.raises(HTTPException) as e:
        get_current_user(Token(), db)
    assert e.value.status_code == 401

# טוקן חוקי אך ללא sub
def test_get_current_user_missing_sub(db):
    token = jwt.encode({"some": "data"}, SECRET_KEY, algorithm=ALGORITHM)

    class Token:
        credentials = token

    with pytest.raises(HTTPException) as e:
        get_current_user(Token(), db)
    assert e.value.status_code == 401


# --- require_admin_user ---
# משתמש אדמין עובר
def test_require_admin_user_success(db):
    admin = db.query(User).filter(User.email == "admin@example.com").first()
    assert require_admin_user(admin) == admin

# משתמש לא אדמין נזרקת שגיאת 403
def test_require_admin_user_forbidden(db):
    user = db.query(User).filter(User.email == "test@example.com").first()
    with pytest.raises(HTTPException) as e:
        require_admin_user(user)
    assert e.value.status_code == status.HTTP_403_FORBIDDEN
