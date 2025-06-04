# DB יוצר טבלת טיולים מועדפים וטבלת טיולים מומלצים מועדפים ב 

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, ForeignKey, DateTime
from app.db.database import Base
from sqlalchemy.orm import relationship

class FavoriteTrip(Base):
    __tablename__ = "favorite_trips"
    id = Column(Integer, primary_key=True, index=True) # מזהה של הטיול המועדף
    user_id = Column(Integer, ForeignKey("users.id")) # מזהה של המשתמש
    trip_id = Column(Integer, ForeignKey("trips.id")) # מזהה של הטיול
    created_at = Column(DateTime, default=datetime.now(timezone.utc)) # תאריך יצירת המועדף

    users = relationship("User", back_populates="favorite_trips")
    trips = relationship("Trip", back_populates="favorite_trips")

class FavoriteRecommendedTrip(Base):
    __tablename__ = "favorite_recommended_trips"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    trip_id = Column(Integer, ForeignKey("trips.id"))
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    
    users = relationship("User", back_populates="favorite_recommended_trips")
    trips = relationship("Trip", back_populates="favorite_recommended_trips")