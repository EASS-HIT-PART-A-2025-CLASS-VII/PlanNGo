# שקשורים לטיולים - קבלה, יצירה, עדכון, מחיקה API נתיבי

from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from typing import List
from app.db.database import get_db
from app.schemas.trip_schema import AiTripCloneRequest
from app.schemas.trip_schema import TripCreate, TripOut, TripUpdate, SharedTripOut, TripPaginatedResponse
from app.services import trip_service
from app.models.user_model import User
from app.models.trip_model import Trip
from app.services.token_service import get_current_user

router = APIRouter(prefix="/trips",tags=["Trips"])

# קבלת כל הטיולים של המשתמש המחובר
@router.get("/", response_model=TripPaginatedResponse)
def get_all_my_trips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1),
    sort_by: str = Query("recent", enum=["recent", "random", "start_soonest"])
):
    return trip_service.get_trips(db, current_user.id, sort_by, page, limit)

# חיפוש טיולים
@router.get("/search")
def search_trips(
    title: str = "",
    description: str = "",
    destination: str = "",
    creator_name: str = "",
    page: int = 1,
    limit: int = 10,
    sort_by: str = "recent",
    db: Session = Depends(get_db)
):
    return trip_service.handle_search_trips(
        title, description, destination, creator_name, db, page, limit, sort_by
    )
    
# טיול לפי מזהה
@router.get("/{trip_id}", response_model=TripOut)
def get_trip_by_id(trip_id: int, db: Session = Depends(get_db)):
    return trip_service.get_trip_by_id(trip_id, db)

# יצירת טיול חדש
@router.post("/", response_model=TripOut, status_code=status.HTTP_201_CREATED)
def create_trip(trip: TripCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return trip_service.create_trip(trip, db, current_user)

# עדכון טיול
@router.put("/{trip_id}", response_model=TripOut)
def update_trip(trip_id: int, updated_data: TripUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return trip_service.update_trip(trip_id, updated_data.dict(exclude_unset=True), db, current_user)

# מחיקת טיול
@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return trip_service.delete_trip(trip_id, db, current_user)

# העברת טיול מומלץ לטיולים שלי
@router.post("/{trip_id}/clone", response_model=TripOut)
def clone_recommend_trip(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return trip_service.clone_recommended_trip(trip_id, db, current_user)

# קבלת קישור לשיתוף
@router.get("/{trip_id}/shared-link")
def share_a_trip(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter_by(id=trip_id, user_id=user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found or unauthorized")
    return {"share_link": f"http://localhost:3000/shared/trips/{trip.share_uuid}"}

# צפייה בטיול ששותף
@router.get("/shared-trip/{share_uuid}", response_model=SharedTripOut)
def view_shared_trip(share_uuid: UUID, db: Session = Depends(get_db)):
    trip = db.query(Trip).options(joinedload(Trip.activities)).filter_by(share_uuid=share_uuid).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Shared trip not found")
    return trip

# לטיולים שלי AI העברת טיול 
@router.post("/clone-ai-trip", response_model=TripOut)
def clone_ai_trip_to_my_trips(request: AiTripCloneRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return trip_service.import_ai_trip(request, db, current_user)

