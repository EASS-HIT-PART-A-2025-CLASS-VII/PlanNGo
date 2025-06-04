# DB יוצר טבלת דירוגים ב 

from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.database import Base
from sqlalchemy import DateTime
from datetime import datetime, timezone

class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True) # מזהה ייחודי לדירוג
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE")) # מזהה הטיול שאליו שייך הדירוג
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE")) # מזהה המשתמש שיצר את הדירוג
    rating = Column(Integer, nullable=False) # דירוג (בין 1 ל-5)
    created_at = Column(DateTime, default=datetime.now(timezone.utc)) # תאריך יצירת הדירוג

    trips = relationship("Trip", back_populates="ratings") # קשר הפוך עם הטיול שאליו שייך הדירוג
    users = relationship("User", back_populates="ratings") # קשר עם המשתמש שיצר את הדירוג

    # הגבלת ייחודיות של דירוגים - לא ניתן למשתמש לדרג את אותו טיול יותר מפעם אחת
    __table_args__ = (UniqueConstraint("trip_id", "user_id", name="unique_trip_user_rating"),) 
