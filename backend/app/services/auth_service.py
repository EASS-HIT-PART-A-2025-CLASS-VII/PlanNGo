# פונקציות שירות הקשורות למשתמשים: יצירה, התחברות והצפנת סיסמה

import bcrypt
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.schemas.user_schema import UserCreate
from app.schemas.user_schema import UserLogin
from fastapi import HTTPException, status
from datetime import datetime, timezone, timedelta
from jose import jwt, JWTError
from app.services.token_service import SECRET_KEY, ALGORITHM
from app.services.email_service import send_reset_email
from app.schemas.user_schema import ResetPasswordRequest
from app.schemas.user_schema import UpdateProfileRequest

DEFAULT_PROFILE_IMAGE = "http://localhost:8000/static/default-profile.jpg"

# פונקציה ליצירת משתמש חדש
def create_user(user_data: UserCreate, db: Session):
    # ולידציה: שם משתמש חובה
    if not user_data.username or not user_data.username.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is required"
        )

    # ולידציה: מייל חובה
    if not user_data.email or not user_data.email.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required"
        )

    # בדיקה אם כבר קיים משתמש עם אותו שם משתמש
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # בדיקה אם כבר קיים משתמש עם אותו אימייל
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # הצפנת הסיסמה של המשתמש
    hashed_password = hash_password(user_data.password)

    # יצירת משתמש חדש
    new_user = User(
        username=user_data.username.strip(),
        email=user_data.email.strip(),
        password=hashed_password,
        profile_image_url=user_data.profile_image_url or DEFAULT_PROFILE_IMAGE
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

# פונקציה להתחברות של משתמש קיים
def login_user(login_data: UserLogin, db: Session):
    user = db.query(User).filter(User.email == login_data.email).first()
    
    if not user or not verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    return user  # בעתיד נחליף את זה בטוקן

# פונקציות להצפנת סיסמאות
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# פונקציה שבודקת אם הסיסמה שהוזנה תואמת לסיסמה המוצפנת
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# פונקציה ליצירת טוקן איפוס סיסמה
def create_reset_token(user_id: int, expires_minutes: int = 15):
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode = {"sub": str(user_id), "exp": expire}
    reset_token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return reset_token

# שליחת מייל לאיפוס סיסמה
def handle_forgot_password(email: str, db: Session):
    user = db.query(User).filter(User.email == email).first()

    # לא חושפים אם המשתמש קיים או לא
    if not user:
        return {"message": "If this email exists, a reset link was sent"}

    reset_token = create_reset_token(user.id)

    # נשלח מייל לאיפוס סיסמה
    send_reset_email(user.email, reset_token)

    return {"message": "If this email exists, a reset link was sent"}

# פונקציה לאיפוס סיסמה
def reset_user_password(request: ResetPasswordRequest, db: Session):
    if request.new_password != request.confirm_new_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    try:
        payload = jwt.decode(request.token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password = hash_password(request.new_password)
    db.commit()

    return {"message": "Password has been reset successfully"}

# פונקציה לעדכון פרופיל משתמש
def update_user_profile(current_user: User, request: UpdateProfileRequest, db):
    current_user = db.merge(current_user)

    # אם נשלח עדכון לשם משתמש – נוודא תקינות ועדכניות
    if request.update_username is not None:
        if not request.update_username.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username is required"
            )

        existing_user = db.query(User).filter(User.username == request.update_username).first()
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=400, detail="Username already taken")

        current_user.username = request.update_username.strip()

    # עדכון סיסמה אם נשלחה
    if request.update_password:
        current_user.password = hash_password(request.update_password)

    # עדכון תמונת פרופיל אם נשלחה
    if request.update_profile_image_url:
        current_user.profile_image_url = str(request.update_profile_image_url)

    db.commit()
    db.refresh(current_user)
    return current_user
