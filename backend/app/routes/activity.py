# שקשורים לפעילויות - קבלה, יצירה, עדכון, מחיקה API נתיבי

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.schemas.activity_schema import ActivityCreate, ActivityOut, ActivityUpdate
from app.services import activity_service
from app.models.user_model import User
from app.services.token_service import get_current_user 

router = APIRouter(
    prefix="/trips",
    tags=["Activities"]
)

# שליפת כל הפעילויות בטיול
@router.get("/{trip_id}/activities", response_model=List[ActivityOut])
def get_activities(trip_id: int, db: Session = Depends(get_db)):
    return activity_service.get_activities_by_trip(db, trip_id)

# שליפת כל הפעילויות ביום מסוים בטיול
@router.get("/{trip_id}/activities/day/{day_number}", response_model=List[ActivityOut])
def get_activities_by_day(trip_id: int, day_number: int, db: Session = Depends(get_db)):
    return activity_service.get_activities_by_trip_and_day(db, trip_id, day_number)

# יצירת פעילות חדשה בטיול
@router.post("/{trip_id}/activities", response_model=ActivityOut)
def create_activity(
    trip_id: int,
    activity: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)):
    return activity_service.create_activity(db, activity, trip_id, current_user)

# עדכון פעילות לפי מזהה
@router.put("/activities/{activity_id}", response_model=ActivityOut)
def update_activity(
    activity_id: int,
    updated_data: ActivityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)):
    return activity_service.update_activity(db, activity_id, updated_data, current_user)

# מחיקת פעילות לפי מזהה
@router.delete("/activities/{activity_id}", response_model=ActivityOut)
def delete_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)):
    return activity_service.delete_activity(db, activity_id, current_user)
