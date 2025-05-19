# בדיקה ושליטה על אילו שדות נכנסים ויוצאים בהוספת ועריכת טיול

from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from .activity_schema import ActivityOut

# מה שהמשתמש שולח בהוספת טיול
class TripCreate(BaseModel):
    title: str                           # שם הטיול
    destination: str                     # יעד
    description: Optional[str] = None    # תיאור (רשות)
    duration_days: Optional[int] = None  # חובה רק אם זה מומלץ
    start_date: Optional[date] = None    # חובה רק אם זה רגיל
    end_date: Optional[date] = None      # חובה רק אם זה רגיל
    image_url: Optional[str] = None      # כתובת לתמונה

# מה שנחזיר בתגובה
class TripOut(BaseModel):
    id: int                             # מזהה הטיול
    user_id: Optional[int] = None       # המשתמש שיצר את הטיול (אם רלוונטי)
    title: str
    destination: str
    description: Optional[str] = None
    is_recommended: bool
    duration_days: Optional[int] = None  
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    image_url: Optional[str] = None
    average_rating: Optional[float] = None
    created_at: datetime
   
   # SQLAlchemy לעבוד עם אובייקטים של  pydantic מאפשרת ל 
    class Config:
        from_attributes = True
        
# לעריכת טיול 
class TripUpdate(BaseModel):
    title: Optional[str] = None
    destination: Optional[str] = None
    description: Optional[str] = None
    is_recommended: Optional[bool] = None
    duration_days: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    image_url: Optional[str] = None

    # SQLAlchemy לעבוד עם אובייקטים של  pydantic מאפשרת ל 
    class Config:
        from_attributes = True

# מה שהמשתמש שולח בבקשה לשליחת מייל עם סיכום טיול מומלץ
class SendSummaryRequest(BaseModel):
    email: EmailStr

# שיתוף טיול 
class SharedTripOut(BaseModel):
    id: int  
    title: str
    destination: str
    description: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    duration_days: Optional[int]
    image_url: Optional[str]
    activities: List[ActivityOut] = []

    class Config:
        from_attributes = True

class AiTripSummaryRequest(BaseModel):
    email: EmailStr
    destination: str
    days: int
    travelers: int
    trip_type: str
    estimated_budget: float
    trip_plan: List[Dict[str, Any]] 

class TripPaginatedResponse(BaseModel):
    total: int
    page: int
    limit: int
    trips: List[TripOut]
