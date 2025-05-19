# בדיקה ושליטה על אילו שדות נכנסים ויוצאים בהוספה ועריכת פעילות

from pydantic import BaseModel
from typing import Optional
from datetime import time as dtime

# מה שהמשתמש שולח בהוספת פעילות
class ActivityCreate(BaseModel):
    day_number: int                       # מספר היום בטיול
    time: Optional[dtime] = None           # שעה מדויקת (אופציונלית)
    title: str                            # שם הפעילות
    description: Optional[str] = None  # תיאור הפעילות
    location_name: str       

# מה שנחזיר בתגובה
class ActivityOut(ActivityCreate):
    id: int

   # SQLAlchemy לעבוד עם אובייקטים של  pydantic מאפשרת ל 
    class Config:
        from_attributes = True

# מה שהמשתמש שולח בעדכון פעילות
class ActivityUpdate(BaseModel):
    day_number: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    location_name: Optional[str] = None
    time: Optional[dtime] = None
