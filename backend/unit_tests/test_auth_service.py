import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from unittest.mock import patch
from jose import jwt
from app.schemas.user_schema import UserCreate, UserLogin, ResetPasswordRequest, UpdateProfileRequest
from app.services import auth_service
from app.services.token_service import SECRET_KEY, ALGORITHM
from unit_tests.conftest import get_test_user, get_admin_user

# משתמשים גלובליים לבדיקה
user = get_test_user()
admin = get_admin_user()


# --- create_user ---
# בדיקת יצירת משתמש תקינה
def test_create_user_success(db):
    user_data = UserCreate(username="newuser", email="new@example.com", password="123456", confirm_password="123456")
    created = auth_service.create_user(user_data, db)
    assert created.username == "newuser"
    assert created.email == "new@example.com"

# בדיקת שדה שם משתמש ריק (ולידציה)
def test_create_user_missing_username():
    with pytest.raises(ValidationError) as e:
        UserCreate(username="", email="test@example.com", password="123456", confirm_password="123456")
    assert "username" in str(e.value)

# בדיקת שדה אימייל ריק (ולידציה)
def test_create_user_missing_email():
    with pytest.raises(ValidationError) as e:
        UserCreate(username="test", email="", password="123456", confirm_password="123456")
    assert "email" in str(e.value)

# בדיקה כששם המשתמש כבר קיים במערכת
def test_create_user_duplicate_username(db):
    user_data = UserCreate(username=user.username, email="unique@example.com", password="123456", confirm_password="123456")
    with pytest.raises(HTTPException) as e:
        auth_service.create_user(user_data, db)
    assert e.value.status_code == 400
    assert "Username already taken" in e.value.detail

# בדיקה כשאימייל כבר רשום במערכת
def test_create_user_duplicate_email(db):
    user_data = UserCreate(username="anotheruser", email=user.email, password="123456", confirm_password="123456")
    with pytest.raises(HTTPException) as e:
        auth_service.create_user(user_data, db)
    assert e.value.status_code == 400
    assert "Email already registered" in e.value.detail


# --- login_user ---
# התחברות מוצלחת עם אימייל וסיסמה תקינים
def test_login_user_success(db):
    login_data = UserLogin(email=user.email, password="123456")
    logged = auth_service.login_user(login_data, db)
    assert logged.email == user.email

# ניסיון התחברות עם אימייל שלא קיים
def test_login_user_email_not_found(db):
    login_data = UserLogin(email="nonexistent@example.com", password="any")
    with pytest.raises(HTTPException) as e:
        auth_service.login_user(login_data, db)
    assert e.value.status_code == 401

# ניסיון התחברות עם סיסמה שגויה
def test_login_user_wrong_password(db):
    login_data = UserLogin(email=user.email, password="wrongpass")
    with pytest.raises(HTTPException) as e:
        auth_service.login_user(login_data, db)
    assert e.value.status_code == 401


# --- hash_password + verify_password ---
# בדיקת הצפנה ואימות סיסמה תקינים
def test_password_hash_and_verify():
    raw_password = "secure123"
    hashed = auth_service.hash_password(raw_password)
    assert auth_service.verify_password(raw_password, hashed)

# בדיקת כישלון אימות סיסמה כשלא תואם
def test_password_verify_fail():
    raw_password = "secure123"
    hashed = auth_service.hash_password("differentpass")
    assert not auth_service.verify_password(raw_password, hashed)


# --- create_reset_token ---
# בדיקת יצירת טוקן לאיפוס סיסמה
def test_create_reset_token_valid():
    token = auth_service.create_reset_token(user_id=user.id)
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == str(user.id)


# --- handle_forgot_password ---
# שליחת מייל איפוס כשמשתמש קיים
@patch("app.services.auth_service.send_reset_email")
def test_handle_forgot_password_existing_user(mock_send, db):
    response = auth_service.handle_forgot_password(user.email, db)
    assert "reset link" in response["message"]
    mock_send.assert_called_once()

# שליחת מייל איפוס כשאימייל לא קיים במערכת
@patch("app.services.auth_service.send_reset_email")
def test_handle_forgot_password_nonexistent_user(mock_send, db):
    response = auth_service.handle_forgot_password("fake@example.com", db)
    assert "reset link" in response["message"]
    mock_send.assert_not_called()


# --- reset_user_password ---
# איפוס סיסמה מוצלח עם טוקן תקין
def test_reset_user_password_success(db):
    token = auth_service.create_reset_token(user.id)
    req = ResetPasswordRequest(token=token, new_password="newpass123", confirm_new_password="newpass123")
    result = auth_service.reset_user_password(req, db)
    assert "successfully" in result["message"]

# ניסיון איפוס סיסמה עם טוקן לא תקין
def test_reset_user_password_invalid_token(db):
    req = ResetPasswordRequest(token="invalid.token.string", new_password="123456", confirm_new_password="123456")
    with pytest.raises(HTTPException) as e:
        auth_service.reset_user_password(req, db)
    assert e.value.status_code == 400

# ניסיון איפוס סיסמה למשתמש שלא קיים
def test_reset_user_password_user_not_found(db):
    token = auth_service.create_reset_token(9999)
    req = ResetPasswordRequest(token=token, new_password="abcdef", confirm_new_password="abcdef")
    with pytest.raises(HTTPException) as e:
        auth_service.reset_user_password(req, db)
    assert e.value.status_code == 404

# בדיקת ולידציה – סיסמאות לא תואמות
def test_reset_user_password_mismatch():
    with pytest.raises(ValidationError) as e:
        ResetPasswordRequest(token="token123", new_password="abcdef", confirm_new_password="ghijkl")
    assert "Passwords do not match" in str(e.value)


# --- update_user_profile ---
# עדכון תקין של פרטי פרופיל כולל שם וסיסמה
def test_update_user_profile_success(db):
    update_data = UpdateProfileRequest(
        update_username="newname",
        update_password="newpass123",
        confirm_update_password="newpass123",
        update_profile_image_url="http://img.com/new.png"
    )
    updated = auth_service.update_user_profile(user, update_data, db)
    assert updated.username == "newname"
    assert updated.profile_image_url == "http://img.com/new.png"

# עדכון שם משתמש ריק (אמור להיכשל)
def test_update_user_profile_empty_username(db):
    update_data = UpdateProfileRequest(update_username="   ")
    with pytest.raises(HTTPException) as e:
        auth_service.update_user_profile(user, update_data, db)
    assert e.value.status_code == 400

# ניסיון עדכון שם משתמש לשם שכבר קיים במערכת
def test_update_user_profile_duplicate_username(db):
    update_data = UpdateProfileRequest(update_username=admin.username)
    with pytest.raises(HTTPException) as e:
        auth_service.update_user_profile(user, update_data, db)
    assert e.value.status_code == 400
