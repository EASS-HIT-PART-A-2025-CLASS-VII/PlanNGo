# קובץ הפעלה ראשי של האתר
# FastAPI קובץ זה אחראי על הפעלת השרת ומגדיר את 

from fastapi import FastAPI
from app.db.database import Base, engine
from app.routes import auth
from app.routes import trip
from app.routes import activity
from app.routes import recommend
from app.routes import admin
from app.routes import favorite
from app.routes import email
from app.routes import calendar
from app.routes import ai
from app.services.email_service import start_reminder_scheduler
from app.models.user_model import User
from app.models.trip_model import Trip
from app.models.activity_model import Activity
from app.models.favorite_model import FavoriteTrip, FavoriteRecommendedTrip
from app.models.rating_model import Rating
from app.models.comment_model import Comment

app = FastAPI()

# DB יצירת הטבלאות ב 
Base.metadata.create_all(bind=engine)

# auth מחבר את הנתיבים שתחת 
app.include_router(auth.router, prefix="/api")

# admin מחבר את הנתיבים שתחת
app.include_router(admin.router, prefix="/api")

# recommend מחבר את הנתיבים שתחת 
app.include_router(recommend.router, prefix="/api")

# trip מחבר את הנתיבים שתחת 
app.include_router(trip.router, prefix="/api")

# activity מחבר את הנתיבים שתחת
app.include_router(activity.router, prefix="/api")

# favorite מחבר את הנתיבים שתחת
app.include_router(favorite.router, prefix="/api")

# email מחבר את הנתיבים שתחת
app.include_router(email.router, prefix="/api")

# calendar מחבר את הנתיבים שתחת
app.include_router(calendar.router, prefix="/api")

# AI מחבר את הנתיבים שתחת
app.include_router(ai.router, prefix="/api")

start_reminder_scheduler()

@app.get("/")
def root():
    return {"message": "PlanNGo API is live!"}
