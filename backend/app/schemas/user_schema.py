# בדיק ושליטה על אילו שדות נכנסים ויוצאים ברישום והתחברות משתמש

from pydantic import BaseModel, EmailStr, Field, model_validator, HttpUrl
from typing import Optional

# מה שהמשתמש שולח בהרשמה
class UserCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)
    profile_image_url: Optional[str] = None 

    # בדיקה שהסיסמאות תואמות
    @model_validator(mode="after")
    def check_password_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self

# מה שנחזיר בתגובה (ללא סיסמה)
class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    is_admin: bool
    profile_image_url: Optional[str] = None 

    # SQLAlchemy לעבוד עם אובייקטים של  pydantic מאפשרת ל 
    class Config:
        from_attributes = True

# מה שהמשתמש שולח בהתחברות
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# מה שנחזיר בתגובה (לאחר התחברות)
class TokenOut(BaseModel):
    access_token: str
    token_type: str

    # SQLAlchemy לעבוד עם אובייקטים של  pydantic מאפשרת ל 
    class Config:
        from_attributes = True

# מה שהמשתמש שולח כדי לאפס סיסמה
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

# מה שהמשתמש שולח כדי לאפס סיסמה (לאחר קבלת טוקן)
class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_new_password: str = Field(..., min_length=6)

    # בדיקה שהסיסמאות תואמות
    @model_validator(mode="after")
    def check_password_match(self):
        if self.new_password != self.confirm_new_password:
            raise ValueError("Passwords do not match")
        return self

# מה שהמשתמש שולח כדי לעדכן פרופיל
class UpdateProfileRequest(BaseModel):
    update_username: Optional[str] = Field(None, min_length=1, max_length=50)
    update_password: Optional[str] = Field(None, min_length=6)
    confirm_update_password: Optional[str] = Field(None, min_length=6)
    update_profile_image_url: Optional[HttpUrl] = None

    # בדיקה שהסיסמאות תואמות
    @model_validator(mode="after")
    def validate_passwords_match(self):
        if self.update_password or self.confirm_update_password:
            if self.update_password != self.confirm_update_password:
                raise ValueError("Passwords do not match")
        return self