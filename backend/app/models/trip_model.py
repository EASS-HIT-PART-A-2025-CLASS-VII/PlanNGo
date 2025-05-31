# DB יוצר טבלת טיולים ב 

from sqlalchemy import Column, Integer, String, Date, ForeignKey, Boolean, Text, DateTime, func
from sqlalchemy.orm import relationship
from app.db.database import Base
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)  # מזהה ייחודי לכל טיול
    title = Column(String, nullable=False)              # שם הטיול
    destination = Column(String, nullable=False)        # יעד הטיול (עיר/מדינה)
    description = Column(Text, nullable=True)           # תיאור חופשי של הטיול (רשות)
    is_recommended = Column(Boolean, default=False)     # האם הטיול מומלץ (True) או אישי (False)
    duration_days = Column(Integer, nullable=True)      # משך טיפוסי בימים – חובה למומלץ, לא חובה לרגיל
    start_date = Column(Date, nullable=True)            # תאריך התחלה – חובה לרגיל, לא חובה למומלץ
    end_date = Column(Date, nullable=True)              # תאריך סיום – חובה לרגיל, לא חובה למומלץ
    image_url = Column(String, nullable=True)           # כתובת לתמונה שמייצגת את הטיול
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # מזהה המשתמש שיצר את הטיול (רק בטיולים אישיים)
    share_uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False) # מזהה לשיתוף
    created_at = Column(DateTime(timezone=True), server_default=func.now()) # תאריך יצירת הטיול

    users = relationship("User", back_populates="trips") # קשר הפוך למשתמש שיצר את הטיול
    activities = relationship("Activity", back_populates="trips", cascade="all, delete") # קשר הפוך עם פעילויות בטיול
    ratings = relationship("Rating", back_populates="trips", cascade="all, delete") # קשר הפוך עם דירוגים בטיול
    comments = relationship("Comment", back_populates="trips", cascade="all, delete") # קשר הפוך עם תגובות בטיול
    favorite_trips = relationship("FavoriteTrip", back_populates="trips", cascade="all, delete") # קשר הפוך עם טיולים מועדפים
    favorite_recommended_trips = relationship("FavoriteRecommendedTrip", back_populates="trips", cascade="all, delete") # קשר הפוך עם טיולים מומלצים מועדפים
