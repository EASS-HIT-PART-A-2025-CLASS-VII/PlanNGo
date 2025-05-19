#  שקשורים למשתמשים - הרשמה, התחברות ומשתמש נוכחי API נתיבי

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.schemas.user_schema import UserCreate, UserOut, TokenOut
from app.services.auth_service import create_user
from app.schemas.user_schema import UserLogin
from app.services.auth_service import login_user 
from app.services.token_service import get_current_user
from app.services.token_service import create_access_token
from app.models.user_model import User
from app.db.database import get_db
from app.schemas.user_schema import ForgotPasswordRequest
from app.services import auth_service
from app.schemas.user_schema import ResetPasswordRequest
from app.schemas.user_schema import UpdateProfileRequest

router = APIRouter(prefix="/auth", tags=["Auth"])

# הרשמה API נתיב 
@router.post("/signup", response_model=UserOut)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    return create_user(user_data, db)

# התחברות API נתיב
@router.post("/login", response_model=TokenOut)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = login_user(login_data, db)
    token = create_access_token(data={"sub": user.email, "is_admin": user.is_admin})
    return {"access_token": token, "token_type": "bearer"}

# לשליפת פרטי משתמש מחובר API נתיב 
@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user

# לאיפוס סיסמה API נתיב 
@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest,db: Session = Depends(get_db)):
    return auth_service.handle_forgot_password(request.email, db)

# לאיפוס סיסמה (לאחר קבלת טוקן) API נתיב
@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest,db: Session = Depends(get_db)):
    return auth_service.reset_user_password(request, db)

# לעדכון פרופיל API נתיב
@router.put("/profile", response_model=UserOut)
def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    return auth_service.update_user_profile(current_user, request, db)
