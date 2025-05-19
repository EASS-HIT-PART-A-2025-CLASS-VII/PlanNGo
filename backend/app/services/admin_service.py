
# פונקציות שירות הקשורות לאדמין: ניהול משתמשים וניהול מומלצים 

from sqlalchemy.orm import Session
from fastapi import HTTPException, Depends, status
from app.models.trip_model import Trip
from app.models.user_model import User
from app.schemas.trip_schema import TripCreate
from app.services.token_service import get_current_user
from app.schemas.user_schema import UpdateProfileRequest
import bcrypt

# קבלת כל המשתמשים
def get_all_users(db: Session):
    return db.query(User).all()

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
    
    trip = get_trip_by_id(trip_id, db)
    trip.is_recommended = True
    db.commit()
    db.refresh(trip)
    return trip

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

# עדכון פרופיל של אדמין
def update_admin_profile(current_user: User, request: UpdateProfileRequest, db: Session):
    current_user = db.merge(current_user)

    if request.update_username:
        existing_user = db.query(User).filter(User.username == request.update_username).first()
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=400, detail="Username already taken")
        current_user.username = request.update_username

    if request.update_password:
        hashed_password = bcrypt.hashpw(request.update_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        current_user.password = hashed_password

    if request.update_profile_image_url:
        current_user.profile_image_url = str(request.update_profile_image_url)

    db.commit()
    db.refresh(current_user)
    return current_user


