# DB יוצר טבלת פעילויות ב 

from datetime import time
from sqlalchemy import Column, Integer, String, ForeignKey, Time
from sqlalchemy.orm import relationship
from app.db.database import Base

class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True) # מזהה ייחודי לפעילות 
    trip_id = Column(Integer, ForeignKey("trips.id"))  # מזהה הטיול שאליו שייכת הפעילות
    day_number = Column(Integer)                       # מספר היום בטיול שבו מתבצעת הפעילות
    title = Column(String)                             # שם הפעילות
    description = Column(String, nullable=True)        # תיאור הפעילות
    time = Column(Time, nullable=True)                 # זמן הפעילות (שעה מדויקת)
    location_name = Column(String)                     # שם המקום שבו מתבצעת הפעילות
    
    trips = relationship("Trip", back_populates="activities") # קשר הפוך עם הטיול שאליו שייכת הפעילות
