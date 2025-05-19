# שקשורים למומלצים - קבלה וסימון כמומלץ API נתיבי

from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from typing import List
from app.db.database import get_db
from app.models.user_model import User
from app.schemas.trip_schema import TripOut, SharedTripOut, TripPaginatedResponse
from app.models.trip_model import Trip
from app.services.token_service import get_current_user
from app.services import recommend_service
from app.schemas.rating_schema import RateTripRequest
from app.schemas.comment_schema import CommentCreate, CommentResponse

router = APIRouter(prefix="/recommended",tags=["Recommended Trips"])

# צפייה רק בטיולים מומלצים
@router.get("/", response_model=TripPaginatedResponse)
def get_recommended_trips(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1),
    sort_by: str = Query("recent", enum=["recent", "top_rated", "favorites", "random"])
):
    return recommend_service.get_recommended_trips(db, sort_by, page, limit)

# חיפוש טיולים מומלצים
@router.get("/search")
def search_recommended_trips(
    title: str = "",
    description: str = "",
    destination: str = "",
    creator_name: str = "",
    page: int = 1,
    limit: int = 8,
    sort_by: str = "recent",
    db: Session = Depends(get_db)
):
    return recommend_service.handle_search_recommended_trips(
        title, description, destination, creator_name, db, page, limit, sort_by
    )

# דירוג טיול מומלץ
@router.post("/{trip_id}/rate")
def rate_recommended_trip(
    trip_id: int,
    rating_data: RateTripRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    return recommend_service.rate_trip(trip_id, rating_data, current_user, db)

# קבלת טיולים מומלצים עם הדירוגים הגבוהים ביותר
@router.get("/top-rated", response_model=List[TripOut])
def top_rated_trips(limit: int = 10, db: Session = Depends(get_db)):
    return recommend_service.get_top_rated_trips(db, limit)

# הוספת תגובה לטיול מומלץ
@router.post("/{trip_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment_for_recommend_trip(
    trip_id: int,
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)):
    return recommend_service.add_comment_to_trip(trip_id=trip_id, user=current_user, comment_data=comment_data, db=db)

# קבלת כל התגובות לטיול מומלץ
@router.get("/{trip_id}/comments", response_model=List[CommentResponse])
def get_comments_for_recommended_trip(
    trip_id: int,
    db: Session = Depends(get_db)):
    return recommend_service.get_comments_for_trip(trip_id=trip_id, db=db)

# מחיקת תגובה לטיול מומלץ
@router.delete("/comments/{comment_id}")
def delete_comment_of_recommend_trip(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    return recommend_service.delete_comment(comment_id=comment_id, current_user=current_user, db=db)

# קבלת קישור לשיתוף
@router.get("/{trip_id}/shared-link")
def share_a_recommended_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter_by(id=trip_id, is_recommended=True).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Recommended trip not found")
    return {"share_link": f"http://localhost:3000/shared/recommended/{trip.share_uuid}"}

# צפייה בטיול ששותף
@router.get("/shared-recommended-trip/{share_uuid}", response_model=SharedTripOut)
def view_shared_recommended_trip(share_uuid: UUID, db: Session = Depends(get_db)):
    trip = db.query(Trip).options(joinedload(Trip.activities)).filter_by(share_uuid=share_uuid, is_recommended=True).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Shared recommended trip not found")
    return trip

