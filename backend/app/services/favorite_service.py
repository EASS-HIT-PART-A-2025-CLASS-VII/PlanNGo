from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from app.models.favorite_model import FavoriteTrip, FavoriteRecommendedTrip
from app.models.trip_model import Trip
from app.models.user_model import User
from app.models.rating_model import Rating

# הוספת שדה דירוג ממוצע לטיול בודד
def enrich_trip_with_rating(trip, db):
    avg = db.query(func.avg(Rating.rating)).filter(Rating.trip_id == trip.id).scalar()
    trip.average_rating = round(avg, 2) if avg is not None else None
    return trip

# הוספה או הסרה של טיול ממועדפים
def toggle_favorite_trip(user: User, trip_id: int, db: Session):
    favorite = db.query(FavoriteTrip).filter_by(user_id=user.id, trip_id=trip_id).first()

    if favorite:
        trip = favorite.trips
        db.delete(favorite)
        db.commit()
        return enrich_trip_with_rating(trip, db)

    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip or trip.is_recommended:
        raise HTTPException(status_code=404, detail="Trip not found")

    new_favorite = FavoriteTrip(user_id=user.id, trip_id=trip_id, created_at=datetime.utcnow())
    db.add(new_favorite)
    db.commit()
    db.refresh(new_favorite)
    return enrich_trip_with_rating(new_favorite.trips, db)

# קבלת כל הטיולים המועדפים של המשתמש
def get_all_favorites(current_user: User, db: Session):
    favorites = db.query(FavoriteTrip).filter(FavoriteTrip.user_id == current_user.id).all()
    return [enrich_trip_with_rating(fav.trips, db) for fav in favorites]

# בדיקה האם טיול נמצא במועדפים
def is_trip_favorite(user: User, trip_id: int, db: Session) -> bool:
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip or trip.is_recommended:
        raise HTTPException(status_code=404, detail="Trip not found")

    favorite = db.query(FavoriteTrip).filter_by(user_id=user.id, trip_id=trip_id).first()
    return favorite is not None

# הוספה או הסרה של טיול מומלץ ממועדפים
def toggle_favorite_recommended_trip(trip_id: int, user: User, db: Session):
    existing_favorite = db.query(FavoriteRecommendedTrip).filter_by(user_id=user.id, trip_id=trip_id).first()

    if existing_favorite:
        trip = existing_favorite.trips
        db.delete(existing_favorite)
        db.commit()
        return enrich_trip_with_rating(trip, db)

    trip = db.query(Trip).filter_by(id=trip_id).first()
    if not trip or not trip.is_recommended:
        raise HTTPException(status_code=404, detail="Recommended trip not found")

    new_favorite = FavoriteRecommendedTrip(user_id=user.id, trip_id=trip_id)
    db.add(new_favorite)
    db.commit()
    db.refresh(new_favorite)
    return enrich_trip_with_rating(new_favorite.trips, db)

# קבלת כל הטיולים המומלצים המועדפים של המשתמש
def get_all_recommended_favorites(current_user: User, db: Session):
    favorites = db.query(FavoriteRecommendedTrip).filter(FavoriteRecommendedTrip.user_id == current_user.id).all()
    return [enrich_trip_with_rating(fav.trips, db) for fav in favorites]

# בדיקה האם טיול מומלץ נמצא במועדפים
def is_recommended_trip_favorite(user: User, trip_id: int, db: Session) -> bool:
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip or not trip.is_recommended:
        raise HTTPException(status_code=404, detail="Recommended trip not found")

    favorite = db.query(FavoriteRecommendedTrip).filter_by(user_id=user.id, trip_id=trip_id).first()
    return favorite is not None