# בדיקה ושליטה על אילו שדות נכנסים ויוצאים בתגובה לטיול מומלץ

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

# מה שהמשתמש שולח כדי להוסיף תגובה
class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)

# תגובה כפי שהיא מוחזרת ללקוח
class CommentResponse(BaseModel):
    id: int
    content: str
    created_at: datetime
    user_name: str
    trip_id: int

    model_config = ConfigDict(from_attributes=True)
