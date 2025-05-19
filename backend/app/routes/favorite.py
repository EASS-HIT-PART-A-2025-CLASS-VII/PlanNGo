# שקשורים למומלצים - קבלה וסימון כמומלץ API נתיבי

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.services import favorite_service
from app.schemas.trip_schema import TripOut
from app.services.token_service import get_current_user
from app.models.user_model import User
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/favorites", tags=["Favorites"])

# קבלת כל הטיולים המועדפים של המשתמש
@router.get("/trips", response_model=List[TripOut])
def get_all_favorite_trips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)):
    return favorite_service.get_all_favorites(current_user, db)

# הוספה או הסרה של טיול ממועדפים
@router.post("/trips/{trip_id}",response_model=TripOut, status_code=status.HTTP_200_OK)
def add_or_remove_favorite_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)):
    return favorite_service.toggle_favorite_trip(trip_id=trip_id, user=current_user, db=db)

# בדיקה האם טיול נמצא במועדפים
@router.get("/trips/{trip_id}/is-favorite")
def check_trip_favorite_status(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)):
    is_fav = favorite_service.is_trip_favorite(current_user, trip_id, db)
    return JSONResponse(content={"is_favorite": is_fav})

# קבלת כל הטיולים המומלצים המועדפים של המשתמש
@router.get("/recommended", response_model=List[TripOut])
def get_all_recommended_favorite_trips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)):
    return favorite_service.get_all_recommended_favorites(current_user, db)

# הוספה או הסרה של טיול מומלץ ממועדפים
@router.post("/recommended/{trip_id}",response_model=TripOut, status_code=status.HTTP_200_OK)
def add_or_remove_favorite_recommended_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)):
    return favorite_service.toggle_favorite_recommended_trip(trip_id=trip_id, user=current_user, db=db)

# בדיקה האם טיול מומלץ נמצא במועדפים
@router.get("/recommended/{trip_id}/is-favorite")
def check_recommended_trip_favorite_status(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)):
    is_fav = favorite_service.is_recommended_trip_favorite(current_user, trip_id, db)
    return JSONResponse(content={"is_favorite": is_fav})
