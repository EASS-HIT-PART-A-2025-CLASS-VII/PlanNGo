# פונקציות שירות הקשורות לטיולים מומלצים: קבלה וסימון כמומלץ 

from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_, nulls_last
from fastapi import HTTPException, status
from app.models.trip_model import Trip
from app.models.user_model import User
from app.models.rating_model import Rating
from app.models.favorite_model import FavoriteRecommendedTrip
from app.services.trip_service import get_trip_by_id
from app.schemas.rating_schema import RateTripRequest
from app.models.comment_model import Comment
from app.schemas.comment_schema import CommentCreate, CommentResponse

# קבלת כל הטיולים המומלצים
def get_recommended_trips(db: Session, sort_by: str, page: int, limit: int):
    query = db.query(Trip).filter(Trip.is_recommended == True)

    if sort_by == "recent":
        query = query.order_by(Trip.created_at.desc())
    elif sort_by == "top_rated":
        avg_rating = func.avg(Rating.rating)
        query = (
            query.outerjoin(Rating)
            .group_by(Trip.id)
            .order_by(nulls_last(avg_rating.desc()))
        )
    elif sort_by == "favorites":
        query = query.outerjoin(FavoriteRecommendedTrip).group_by(Trip.id).order_by(func.count(FavoriteRecommendedTrip.id).desc())
    elif sort_by == "random":
        query = query.order_by(func.random())

    total = query.count()
    trips = query.offset((page - 1) * limit).limit(limit).all()
    enriched_trips = enrich_with_average_rating(trips, db)

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "trips": enriched_trips
    }

# חיפוש טיולים מומלצים
def handle_search_recommended_trips(
    title: str,
    description: str,
    destination: str,
    db: Session,
    page: int = 1,
    limit: int = 10,
    sort_by: str = "recent"
):
    query = db.query(Trip).filter(Trip.is_recommended == True)

    filters = []
    if title:
        filters.append(Trip.title.ilike(f"%{title.strip()}%"))
    if description:
        filters.append(Trip.description.ilike(f"%{description.strip()}%"))
    if destination:
        filters.append(Trip.destination.ilike(f"%{destination.strip()}%"))

    if filters:
        query = query.filter(or_(*filters))
    else:
        return {"total": 0, "page": page, "limit": limit, "trips": []}

    if sort_by == "top_rated":
        all_trips = query.all()
        rated_trips = enrich_with_average_rating(all_trips, db)
        rated_trips.sort(key=lambda t: t.average_rating if t.average_rating is not None else -1, reverse=True)
        total = len(rated_trips)
        paginated = rated_trips[(page - 1) * limit : page * limit]
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "trips": paginated
        }

    if sort_by == "recent":
        query = query.order_by(Trip.created_at.desc())
    elif sort_by == "random":
        query = query.order_by(func.random())

    total = query.count()
    trips = query.offset((page - 1) * limit).limit(limit).all()
    enriched = enrich_with_average_rating(trips, db)

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "trips": enriched
    }

# דירוג טיול מומלץ
def rate_trip(trip_id: int, rating_data: RateTripRequest, current_user: User, db: Session):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.is_recommended == True).first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommended trip not found")

    # בדיקה אם המשתמש כבר דירג את הטיול הזה
    existing_rating = db.query(Rating).filter(
        Rating.trip_id == trip_id,
        Rating.user_id == current_user.id
    ).first()

    if existing_rating:
        # ✅ מעדכנים את הדירוג במקום לזרוק שגיאה
        existing_rating.rating = rating_data.rating
        db.commit()
        db.refresh(existing_rating)
        return {"message": "Rating updated successfully"}

    # ✅ דירוג חדש
    new_rating = Rating(
        rating=rating_data.rating,
        user_id=current_user.id,
        trip_id=trip_id
    )

    db.add(new_rating)
    db.commit()
    db.refresh(new_rating)

    return {"message": "Rating submitted successfully"}

# הוספת שדה דירוג ממוצע לכל טיול ברשימה
def enrich_with_average_rating(trips, db):
    for trip in trips:
        avg = (
            db.query(func.avg(Rating.rating))
            .filter(Rating.trip_id == trip.id)
            .scalar()
        )
        trip.average_rating = round(avg, 2) if avg is not None else None
    return trips

# הוספת תגובה לטיול מומלץ
def add_comment_to_trip(trip_id: int, user: User, comment_data: CommentCreate, db: Session):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.is_recommended == True).first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommended trip not found")

    new_comment = Comment(
        content=comment_data.content,
        user_id=user.id,
        trip_id=trip.id
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    return CommentResponse(
        id=new_comment.id,
        content=new_comment.content,
        created_at=new_comment.created_at,
        user_name=user.username, 
        trip_id=new_comment.trip_id
    )

# קבלת כל התגובות לטיול מומלץ
def get_comments_for_trip(trip_id: int, db: Session):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.is_recommended == True).first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommended trip not found")

    return [
        CommentResponse(
            id=comment.id,
            content=comment.content,
            created_at=comment.created_at,
            trip_id=comment.trip_id,
            user_name=comment.users.username if comment.users else "Unknown"
        )
        for comment in trip.comments
    ]

# מחיקת תגובה לטיול מומלץ
def delete_comment(comment_id: int, current_user: User, db: Session):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()

    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    # תנאי מחיקה: רק בעל התגובה או אדמין
    if comment.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own comments")

    db.delete(comment)
    db.commit()
    return comment
