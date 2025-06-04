# DB יוצר טבלת תגובות ב 

from sqlalchemy import Column, Integer, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True) # מזהה תגובה
    content = Column(Text, nullable=False)  # תוכן התגובה
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))  # תאריך יצירה
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False) # מזהה משתמש
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)  # מומלץ בלבד

    users = relationship("User", back_populates="comments")
    trips = relationship("Trip", back_populates="comments")
