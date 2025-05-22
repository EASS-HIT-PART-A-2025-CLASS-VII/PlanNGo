
# פונקציות שירות הקשורות לאדמין: ניהול משתמשים וניהול מומלצים 

from sqlalchemy.orm import Session
from fastapi import HTTPException, Depends, status
from app.models.trip_model import Trip
from app.models.user_model import User
from app.models.activity_model import Activity
from app.schemas.trip_schema import TripCreate
from app.services.token_service import get_current_user
from app.services.trip_service import get_trip_by_id
import bcrypt
from typing import List

# קבלת כל המשתמשים
def get_all_users(db: Session):
    return db.query(User).filter(User.is_admin == False).all()

# מחיקת משתמש
def delete_user(db: Session, user_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return user

# סימון טיול כמומלץ (admin בלבד)
def recommend_trip(trip_id: int, db: Session, current_user: User):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can recommend trips.")

    # שליפת הטיול המקורי
    original = get_trip_by_id(trip_id, db)

    # יצירת טיול חדש כמומלץ
    recommended = Trip(
        title=original.title,
        destination=original.destination,
        description=original.description,
        duration_days=original.duration_days,
        start_date=original.start_date,
        end_date=original.end_date,
        image_url=original.image_url,
        is_recommended=True,
        user_id=None  # טיול של המערכת, לא של משתמש
    )

    db.add(recommended)
    db.commit()
    db.refresh(recommended)

    # שכפול פעילויות מהטיול המקורי
    original_activities = db.query(Activity).filter(Activity.trip_id == original.id).all()
    for act in original_activities:
        cloned_activity = Activity(
            trip_id=recommended.id,
            time=act.time,
            title=act.title,
            day_number=act.day_number,
            description=act.description,
            location_name=act.location_name
        )
        db.add(cloned_activity)

    db.commit()  # שמירת כל הפעילויות המשוכפלות

    return recommended

# יצירת טיול מומלץ
def admin_create_recommended_trip(trip_data: TripCreate, db: Session):
    data = trip_data.dict()
    duration = data.get("duration_days")

    if duration is None:
        raise HTTPException(status_code=400, detail="Recommended trips require 'duration_days'.")

    # טיול מומלץ לא כולל תאריכים או יוזר
    data["start_date"] = None
    data["end_date"] = None
    data["user_id"] = None
    data["is_recommended"] = True

    trip = Trip(**data)
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip

# עדכון טיול מומלץ 
def admin_update_recommended_trip(trip_id: int, trip_data: dict, db: Session):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if not trip.is_recommended:
        raise HTTPException(status_code=400, detail="Only recommended trips can be updated via admin.")

    for key, value in trip_data.items():
        setattr(trip, key, value)

    db.commit()
    db.refresh(trip)
    return trip

# מחיקת טיול מומלץ
def admin_delete_recommended_trip(trip_id: int, db: Session):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if not trip.is_recommended:
        raise HTTPException(status_code=400, detail="Only recommended trips can be deleted via admin.")

    db.delete(trip)
    db.commit()
    return trip

# הרשאה: רק לאדמין
def admin_required(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

# קבלת טיולים של משתמש 
def get_trips_by_user_id(user_id: int, db: Session) -> List[Trip]:
    return db.query(Trip).filter(Trip.user_id == user_id).all()