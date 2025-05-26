# פונקציות שירות הקשורות לפעילויות: קבלה, יצירה עדכון ומחיקה 

from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.activity_model import Activity
from app.models.trip_model import Trip
from app.models.user_model import User
from app.schemas.activity_schema import ActivityCreate, ActivityUpdate
from datetime import datetime

# קבלת כל הפעילויות ביום מסוים בטיול
def get_activities_by_trip_and_day(db: Session, trip_id: int, day_number: int):
    return db.query(Activity).filter(
        Activity.trip_id == trip_id,
        Activity.day_number == day_number
    ).order_by(Activity.time).all()

# פעילות לפי מזהה 
def get_activity_by_id(activity_id: int, db: Session) -> Activity:
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return activity

# יצירת פעילות חדשה בטיול (רגיל או מומלץ לפי הרשאות)
def create_activity(db: Session, activity: ActivityCreate, trip_id: int, current_user: User):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # הרשאות
    if trip.is_recommended:
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Only admin can add activities to recommended trips")
    else:
        if trip.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to add activity to this trip")

     # ולידציות על שדות חובה
    if activity.day_number is None:
        raise HTTPException(status_code=400, detail="Day number is required")
    
    if not activity.title or not activity.title.strip():
        raise HTTPException(status_code=400, detail="Activity title is required")

    if not activity.location_name or not activity.location_name.strip():
        raise HTTPException(status_code=400, detail="Activity location is required")
    
    db_activity = Activity(
        trip_id=trip_id,
        day_number=activity.day_number,
        title=activity.title,
        description=activity.description,
        location_name=activity.location_name,
        time=activity.time,
    )
    
    db.add(db_activity)
    db.commit()
    db.refresh(db_activity)
    return db_activity

# עדכון פעילות
def update_activity(db: Session, activity_id: int, updated_data: ActivityUpdate, current_user: User):
    db_activity = get_activity_by_id(activity_id, db)
    trip = db.query(Trip).filter(Trip.id == db_activity.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # הרשאות
    if trip.is_recommended:
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Only admin can update activities in recommended trips")
    else:
        if trip.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this activity")

     # ולידציות על שדות חובה
    if db_activity.day_number is None:
        raise HTTPException(status_code=400, detail="Day number is required")
    
    if not db_activity.title or not db_activity.title.strip():
        raise HTTPException(status_code=400, detail="Activity title is required")

    if not db_activity.location_name or not db_activity.location_name.strip():
        raise HTTPException(status_code=400, detail="Activity location is required")
    
    updated_fields = updated_data.dict(exclude_unset=True)

    for key, value in updated_fields.items():
        setattr(db_activity, key, value)

    db.commit()
    db.refresh(db_activity)
    return db_activity

# מחיקת פעילות
def delete_activity(db: Session, activity_id: int, current_user: User):
    db_activity = get_activity_by_id(activity_id, db)
    trip = db.query(Trip).filter(Trip.id == db_activity.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # הרשאות
    if trip.is_recommended:
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Only admin can delete activities from recommended trips")
    else:
        if trip.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this activity")

    db.delete(db_activity)
    db.commit()
    return db_activity
