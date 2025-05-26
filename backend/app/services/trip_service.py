# פונקציות שירות הקשורות לטיולים: קבלה, יצירה עדכון ומחיקה 

from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from fastapi import HTTPException
from app.schemas.trip_schema import TripCreate
from app.schemas.trip_schema import AiTripCloneRequest
from app.models.user_model import User
from datetime import date, timedelta, datetime
from typing import List
from app.models.trip_model import Trip
from app.models.activity_model import Activity

DEFAULT_TRIP_IMAGE = "http://localhost:8000/static/default-trip.png"

# קבלת כל הטיולים של המשתמש המחובר
def get_trips(db: Session, user_id: int, sort_by: str, page: int, limit: int):
    query = db.query(Trip).filter(Trip.user_id == user_id)

    if sort_by == "recent":
        query = query.order_by(Trip.created_at.desc())
    elif sort_by == "random":
        query = query.order_by(func.random())
    elif sort_by == "start_soonest":
        query = query.order_by(Trip.start_date.asc())

    total = query.count()
    trips = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "trips": trips
    }

# חיפוש טיולים
def handle_search_trips(
    title: str,
    description: str,
    destination: str,
    creator_name: str,
    db: Session,
    page: int = 1,
    limit: int = 8,
    sort_by: str = "recent"
):
    query = db.query(Trip).join(User).filter(Trip.is_recommended == False)
    filters = []

    if title:
        filters.append(Trip.title.ilike(f"%{title.strip()}%"))
    if description:
        filters.append(Trip.description.ilike(f"%{description.strip()}%"))
    if destination:
        filters.append(Trip.destination.ilike(f"%{destination.strip()}%"))
    if creator_name:
        filters.append(User.username.ilike(f"%{creator_name.strip()}%"))

    if filters:
        query = query.filter(or_(*filters))
    else:
        return {"total": 0, "page": page, "limit": limit, "trips": []}

    # מיון
    if sort_by == "recent":
        query = query.order_by(Trip.created_at.desc())
    elif sort_by == "random":
        query = query.order_by(func.random())
    elif sort_by == "start_soonest":
        query = query.order_by(Trip.start_date.asc())

    total = query.count()
    trips = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "trips": trips
    }

# יצירת טיול
def create_trip(trip_data: TripCreate, db: Session, current_user: User):
    data = trip_data.dict()

    title = data.get("title", "").strip()
    destination = data.get("destination", "").strip()
    start = data.get("start_date")
    end = data.get("end_date")
    duration = data.get("duration_days")

    # ולידציה: חובה למלא כותרת ויעד
    if not title:
        raise HTTPException(status_code=400, detail="Trip title is required.")
    if not destination:
        raise HTTPException(status_code=400, detail="Trip destination is required.")

    # ולידציה: אם יש תאריכים – לחשב משך ולוודא שתחילה לפני סוף
    if start and end:
        if start > end:
            raise HTTPException(status_code=400, detail="start_date must be before or equal to end_date.")
        data["duration_days"] = (end - start).days + 1

    # אם אין תאריכים, אבל יש משך – להשתמש בו
    elif not start and not end and duration:
        data["duration_days"] = duration

    # אם אין כלום – משך יהיה None
    else:
        data["duration_days"] = None

    # הגדרת שדות נוספים
    data["user_id"] = current_user.id
    data["is_recommended"] = False

    # תמונה ברירת מחדל אם לא סופקה
    if not data.get("image_url"):
        data["image_url"] = DEFAULT_TRIP_IMAGE

    # יצירת הטיול
    trip = Trip(**data)
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip

# טיול לפי מזהה
def get_trip_by_id(trip_id: int, db: Session):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip

# עריכת טיול
def update_trip(trip_id: int, trip_data: dict, db: Session, current_user: User):
    trip = get_trip_by_id(trip_id, db)

    # הרשאה: רק מי שיצר את הטיול 
    if trip.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this trip.")

    # רק אדמין יכול לשנות is_recommend הגנה על שדה 
    if "is_recommended" in trip_data:
        if trip_data["is_recommended"] != trip.is_recommended and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Only admins can change 'is_recommended'.")

    # ולידציה: אם יש כותרת/יעד – לוודא שאינם ריקים
    if "title" in trip_data and not str(trip_data["title"]).strip():
        raise HTTPException(status_code=400, detail="Trip title is required.")
    if "destination" in trip_data and not str(trip_data["destination"]).strip():
        raise HTTPException(status_code=400, detail="Trip destination is required.")
    # עדכון רק של השדות שנשלחו
    for key, value in trip_data.items():
        setattr(trip, key, value)

    # חישוב אורך רק אם יש תאריכים
    if trip.start_date and trip.end_date:
        if trip.start_date > trip.end_date:
            raise HTTPException(status_code=400, detail="start_date must be before end_date.")
        trip.duration_days = (trip.end_date - trip.start_date).days + 1

    db.commit()
    db.refresh(trip)
    return trip

# מחיקת טיול
def delete_trip(trip_id: int, db: Session, current_user: User):
    trip = get_trip_by_id(trip_id, db)
    
    # הרשאה: רק היוצר
    if trip.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this trip.")
    
    db.delete(trip)
    db.commit()
    return

# העברת טיול מומלץ לטיולים שלי
def clone_recommended_trip(trip_id: int, db: Session, current_user: User):
    original = get_trip_by_id(trip_id, db)

    if not original.is_recommended:
        raise HTTPException(status_code=400, detail="Only recommended trips can be cloned.")

    # אתחול ברירת מחדל
    start_date = None
    end_date = None
    duration_days = None

    if original.duration_days is not None:
        duration_days = original.duration_days

    cloned_trip = Trip(
        title=original.title,
        destination=original.destination,
        description=original.description,
        start_date=start_date,
        end_date=end_date,
        duration_days=duration_days,
        image_url=original.image_url,
        is_recommended=False,
        user_id=current_user.id
    )

    db.add(cloned_trip)
    db.commit()
    db.refresh(cloned_trip)

    # שכפול פעילויות
    original_activities = db.query(Activity).filter(Activity.trip_id == original.id).all()
    for act in original_activities:
        cloned_activity = Activity(
            trip_id=cloned_trip.id,
            time=act.time,
            title=act.title,
            day_number=act.day_number,
            description=act.description,
            location_name=act.location_name
        )
        db.add(cloned_activity)

    db.commit()
    return cloned_trip

# חיפוש טיולים
    query = db.query(Trip).join(User).filter(Trip.is_recommended == False)

    filters = []

    if title:
        filters.append(Trip.title.ilike(f"%{title.strip()}%"))
    if description:
        filters.append(Trip.description.ilike(f"%{description.strip()}%"))
    if destination:
        filters.append(Trip.destination.ilike(f"%{destination.strip()}%"))
    if creator_name:
        filters.append(User.username.ilike(f"%{creator_name.strip()}%"))

    if filters:
        query = query.filter(or_(*filters))
    else:
        return []

    return query.all()

# בדיקה אילו טיולים מתוכננים לעוד יומיים בדיוק 
def get_upcoming_trips(db: Session):
    today = date.today()
    upcoming_dates = [today + timedelta(days=i) for i in range(3)]  # היום, מחר, מחרתיים

    trips = db.query(Trip).filter(
        Trip.start_date.in_(upcoming_dates),
        Trip.is_recommended == False,
        Trip.user_id != None
    ).all()

    return trips

#  בניית קובץ טקסט סיכום טיול
def build_trip_summary_text(trip: Trip) -> str:
    summary = []
    summary.append(f"Trip Summary – {trip.title} 🌍")
    summary.append(f"Dates: {trip.start_date} to {trip.end_date}")
    summary.append(f"Destination: {trip.destination}")
    summary.append("")  # שורת רווח

    # קיבוץ הפעילויות לפי יום
    day_activities = {}
    for activity in trip.activities:
        day = activity.day_number
        if day not in day_activities:
            day_activities[day] = []
        day_activities[day].append(activity)

    for day in sorted(day_activities.keys()):
        summary.append(f"Day {day}:")
        # מיון פעילויות לפי שעה
        activities_sorted = sorted(day_activities[day], key=lambda a: a.time or datetime.min.time())
        for act in activities_sorted:
            time_str = act.time.strftime("%H:%M") if act.time else "Time not set"
            summary.append(f"- {act.title} at {time_str}")
        summary.append("")  # רווח בין ימים

    summary.append("Enjoy every step of your journey!\nThe PlanNGo Team")
    return "\n".join(summary)

# AI שליפת טיול 
def import_ai_trip(data: AiTripCloneRequest, db: Session, current_user: User):
    if not data.destination or not data.destination.strip():
        raise HTTPException(status_code=400, detail="Destination is required")

    if not isinstance(data.trip_plan, list) or not data.trip_plan:
        raise HTTPException(status_code=400, detail="Trip plan must include at least one day")

    if data.duration_days is None or data.duration_days <= 0:
        raise HTTPException(status_code=400, detail="Invalid duration days value")

    # יצירת הטיול
    new_trip = Trip(
        user_id=current_user.id,
        title=f"AI Trip to {data.destination}",
        destination=data.destination,
        description=f"{data.trip_type} trip with {data.travelers} travelers",
        duration_days=data.duration_days,
        start_date=None,
        end_date=None,
        image_url=DEFAULT_TRIP_IMAGE,
        is_recommended=False,
        created_at=datetime.utcnow()
    )
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)

    for day in data.trip_plan:
        day_number = day.get("day")
        for act in day.get("activities", []):
            db.add(Activity(
                trip_id=new_trip.id,
                day_number=day_number,
                time=act.get("time"),
                title=act.get("title"),
                description=act.get("description"),
                location_name=act.get("location_name"),
            ))

    db.commit()
    return new_trip
