# DB יוצר טבלת משתמשים ב

from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True) # מזהה ייחודי לכל משתמש
    username = Column(String, unique=True, index=True, nullable=False) # שם המשתמש
    email = Column(String, unique=True, index=True, nullable=False) # כתובת האימייל של המשתמש
    password = Column(String, nullable=False) # סיסמת המשתמש (מוצפנת)
    is_admin = Column(Boolean, default=False) # האם המשתמש הוא מנהל (True) או משתמש רגיל (False)
    profile_image_url = Column(String, nullable=True) # תמונת פרופיל של המשתמש 

    trips = relationship("Trip", back_populates="users") # קשר הפוך לטיולים שיצר המשתמש
    ratings = relationship("Rating", back_populates="users") # קשר הפוך לדירוגים שיצר המשתמש
    comments = relationship("Comment", back_populates="users", cascade="all, delete") # קשר הפוך לתגובות שיצר המשתמש
    favorite_trips = relationship("FavoriteTrip", back_populates="users", cascade="all, delete") # קשר הפוך לטיולים מועדפים של המשתמש
    favorite_recommended_trips = relationship("FavoriteRecommendedTrip", back_populates="users", cascade="all, delete") # קשר הפוך לטיולים מומלצים מועדפים של המשתמש