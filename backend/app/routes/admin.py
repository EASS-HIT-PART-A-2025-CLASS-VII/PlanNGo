#  שקשורים לאדמין - משתמשים וטיולים מומלצים API נתיבי

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user_model import User
from app.services import admin_service
from typing import List
from app.schemas.user_schema import UserOut
from app.schemas.trip_schema import TripCreate, TripOut
from app.services import admin_service
from app.services.admin_service import admin_required
from app.services.token_service import get_current_user

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)

# קבלת כל המשתמשים
@router.get("/users", response_model=List[UserOut])
def get_all_users(db: Session = Depends(get_db), current_user: User = Depends(admin_required)):
    return admin_service.get_all_users(db)

# מחיקת משתמש
@router.delete("/users/{user_id}", response_model=UserOut)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(admin_required)):
    return admin_service.delete_user(db, user_id)

# יצירת טיול מומלץ
@router.post("/recommended", response_model=TripOut)
def create_recommended_trip(
    trip_data: TripCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)):
    return admin_service.admin_create_recommended_trip(trip_data, db)

# עדכון טיול מומלץ
@router.put("/recommended/{trip_id}", response_model=TripOut)
def update_recommended_trip(
    trip_id: int,
    trip_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)):
    return admin_service.admin_update_recommended_trip(trip_id, trip_data, db)

# מחיקת טיול מומלץ
@router.delete("/recommended/{trip_id}", response_model=TripOut)
def delete_recommended_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)):
    return admin_service.admin_delete_recommended_trip(trip_id, db)

# סימון טיול כמומלץ
@router.post("/recommended/convert/{trip_id}", response_model=TripOut)
def mark_trip_as_recommended(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(admin_required)):
    return admin_service.recommend_trip(trip_id, db, current_user)

# קבלת טיולים של משתמש
@router.get("/users/{user_id}/trips", response_model=List[TripOut])
def admin_get_user_trips(user_id: int, db: Session = Depends(get_db)):
    return admin_service.get_trips_by_user_id(user_id, db)