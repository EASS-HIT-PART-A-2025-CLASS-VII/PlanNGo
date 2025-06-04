from app.models.trip_model import Trip
from app.models.user_model import User
from app.models.activity_model import Activity
from app.schemas.trip_schema import TripCreate, AiTripCloneRequest
from app.services.trip_service import (
    create_trip, update_trip, delete_trip, get_trips, handle_search_trips,
    get_trip_by_id, clone_recommended_trip, import_ai_trip,
    get_upcoming_trips, build_trip_summary_text
)
from fastapi import HTTPException
import pytest
from datetime import date, timedelta
from unit_tests.conftest import get_test_user, get_admin_user

# משתמשים גלובליים לבדיקה
user = get_test_user()
admin = get_admin_user()

# --- get_trips ---
# בדיקה של שליפת טיולים לפי משתמש עם מיון ודפדוף
def test_get_trips_pagination_and_sorting(db):
    for i in range(5):
        create_trip(TripCreate(title=f"Trip {i}", destination="Place", start_date=date(2025, 6, 1 + i), end_date=date(2025, 6, 2 + i)), db, user)

    result = get_trips(db, user.id, sort_by="start_soonest", page=1, limit=2)
    assert result["total"] == 5
    assert len(result["trips"]) == 2
    assert result["trips"][0].start_date < result["trips"][1].start_date


# --- handle_search_trips ---
# בדיקה של חיפוש לפי כותרת
def test_search_trip_by_title(db):
    create_trip(TripCreate(title="My Rome Adventure", destination="Italy"), db, user)
    result = handle_search_trips("Rome", "", "", "", db)
    assert result["total"] >= 1
    assert any("Rome" in t.title for t in result["trips"])

# בדיקה של חיפוש ריק (ללא פילטרים)
def test_search_trip_no_filters(db):
    result = handle_search_trips("", "", "", "", db)
    assert result["total"] == 0


# --- create_trip ---
# בדיקה של יצירת טיול תקין
def test_create_trip_success(db):
    data = TripCreate(
        title="Trip to Rome",
        destination="Italy",
        description="Test trip",
        start_date=date(2025, 6, 1),
        end_date=date(2025, 6, 5)
    )
    trip = create_trip(data, db, user)
    assert trip.title == "Trip to Rome"
    assert trip.duration_days == 5
    assert trip.user_id == user.id

# בדיקה של יצירת טיול ללא כותרת
def test_create_trip_missing_title(db):
    data = TripCreate(
        title="",
        destination="Italy",
        start_date=date(2025, 6, 1),
        end_date=date(2025, 6, 3)
    )
    with pytest.raises(HTTPException) as exc_info:
        create_trip(data, db, user)
    assert exc_info.value.status_code == 400
    assert "Trip title is required" in str(exc_info.value.detail)

# בדיקה של יצירת טיול עם תאריכים לא תקינים (start > end)
def test_create_trip_invalid_dates(db):
    data = TripCreate(
        title="Wrong Dates",
        destination="Nowhere",
        start_date=date(2025, 6, 10),
        end_date=date(2025, 6, 5)
    )
    with pytest.raises(HTTPException) as e:
        create_trip(data, db, user)
    assert e.value.status_code == 400
    assert "start_date must be before or equal to end_date" in str(e.value.detail)


# --- get_trip_by_id ---
# בדיקה של שליפת טיול לפי מזהה תקף
def test_get_trip_by_id_success(db):
    trip = create_trip(TripCreate(title="Paris", destination="France"), db, user)
    fetched = get_trip_by_id(trip.id, db)
    assert fetched.id == trip.id

# בדיקה של טיול שלא קיים
def test_get_trip_by_id_not_found(db):
    with pytest.raises(HTTPException) as e:
        get_trip_by_id(9999, db)
    assert e.value.status_code == 404


# --- update_trip ---
# בדיקה של עדכון טיול תקין
def test_update_trip_success(db):
    trip = create_trip(TripCreate(
        title="Old Title",
        destination="Spain",
        start_date=date(2025, 7, 1),
        end_date=date(2025, 7, 3)
    ), db, user)

    updated_data = {
        "title": "New Title",
        "destination": "Portugal"
    }

    updated_trip = update_trip(trip.id, updated_data, db, user)
    assert updated_trip.title == "New Title"
    assert updated_trip.destination == "Portugal"
    assert updated_trip.duration_days == 3

# בדיקה של ניסיון עדכון ע"י משתמש לא מורשה
def test_update_trip_unauthorized_user(db):
    another_user = User(id=3, username="hacker", email="hacker@example.com", password="hack123", is_admin=False)
    db.add(another_user)
    db.commit()
    trip = create_trip(TripCreate(title="Test Trip", destination="Nowhere"), db, user)

    with pytest.raises(HTTPException) as exc_info:
        update_trip(trip.id, {"title": "Hacked Title"}, db, another_user)

    assert exc_info.value.status_code == 403
    assert "Not authorized" in str(exc_info.value.detail)


# --- delete_trip ---
# בדיקה של מחיקת טיול תקין
def test_delete_trip_success(db):
    trip = create_trip(TripCreate(title="Paris", destination="France"), db, user)
    trip_id = trip.id
    delete_trip(trip_id, db, user)
    deleted = db.query(Trip).filter(Trip.id == trip_id).first()
    assert deleted is None


# --- clone_recommended_trip ---
# בדיקה של שכפול טיול מומלץ
def test_clone_recommended_trip_success(db):
    trip = create_trip(TripCreate(title="Recommended", destination="Spain"), db, admin)
    trip.is_recommended = True
    db.commit()
    cloned = clone_recommended_trip(trip.id, db, admin)
    assert cloned.title == trip.title
    assert cloned.id != trip.id

# בדיקה של שכפול טיול לא מומלץ ( אמור להיכשל)
def test_clone_regular_trip_fails(db):
    trip = create_trip(TripCreate(title="Normal", destination="France"), db, user)
    with pytest.raises(HTTPException) as e:
        clone_recommended_trip(trip.id, db, user)
    assert e.value.status_code == 400


# --- get_upcoming_trips ---
# בדיקה של שליפת טיולים שמתחילים בקרוב (היום, מחר, מחרתיים)
def test_get_upcoming_trips(db):
    today = date.today()
    create_trip(TripCreate(title="Soon", destination="Place", start_date=today + timedelta(days=1), end_date=today + timedelta(days=2)), db, user)
    results = get_upcoming_trips(db)
    assert any(trip.title == "Soon" for trip in results)

# בדיקה שטיול רחוק יותר לא יכלל
def test_get_upcoming_trips_excludes_future(db):
    create_trip(TripCreate(title="Future", destination="Place", start_date=date.today() + timedelta(days=10), end_date=date.today() + timedelta(days=12)), db, user)
    results = get_upcoming_trips(db)
    assert all(trip.title != "Future" for trip in results)


# --- build_trip_summary_text ---
# בדיקה של יצירת טקסט סיכום טיול
def test_trip_summary_text(db):
    trip = create_trip(TripCreate(title="Summary Trip", destination="Japan"), db, user)
    db.add(Activity(trip_id=trip.id, day_number=1, title="Shrine", time=None, description="Visit", location_name="Tokyo"))
    db.commit()
    text = build_trip_summary_text(trip)
    assert "Day 1:" in text
    assert "Shrine" in text


# --- import_ai_trip ---
# בדיקה של טעינת טיול מ-AI כולל פעילויות
def test_import_ai_trip_success(db):
    ai_data = AiTripCloneRequest(
        destination="Tokyo",
        trip_type="Adventure",
        travelers=2,
        duration_days=3,
        trip_plan=[
            {"day": 1, "activities": [{"title": "Mount Fuji", "time": None, "description": "Hike", "location_name": "Fuji"}]},
            {"day": 2, "activities": []},
            {"day": 3, "activities": []},
        ]
    )
    new_trip = import_ai_trip(ai_data, db, user)
    assert new_trip.title.startswith("AI Trip")
