import pytest
from fastapi import HTTPException
from app.models.trip_model import Trip
from app.models.activity_model import Activity
from app.schemas.trip_schema import TripCreate
from app.services import admin_service, trip_service
from unit_tests.conftest import get_test_user, get_admin_user
from datetime import date

# משתמשים גלובליים לבדיקה
user = get_test_user()
admin = get_admin_user()


# --- get_all_users ---
# שליפת כל המשתמשים שאינם אדמין
def test_get_all_users(db):
    users = admin_service.get_all_users(db)
    assert all(not u.is_admin for u in users)
    assert any(u.id == user.id for u in users)


# --- delete_user ---
# מחיקת משתמש קיים בהצלחה
def test_delete_user_success(db):
    deleted = admin_service.delete_user(db, user.id)
    assert deleted.id == user.id
    assert db.query(admin_service.User).filter_by(id=user.id).first() is None

# ניסיון למחוק משתמש שלא קיים
def test_delete_user_not_found(db):
    with pytest.raises(HTTPException) as e:
        admin_service.delete_user(db, 9999)
    assert e.value.status_code == 404


# --- recommend_trip ---
# אדמין מסמן טיול כמומלץ (כולל העתקת פעילויות)
def test_recommend_trip_success(db):
    trip = trip_service.create_trip(TripCreate(title="Rome", destination="Italy"), db, admin)
    db.add(Activity(trip_id=trip.id, title="Visit Colosseum", day_number=1))
    db.commit()

    recommended = admin_service.recommend_trip(trip.id, db, admin)
    assert recommended.title == "Rome"
    assert recommended.is_recommended
    assert recommended.id != trip.id
    activities = db.query(Activity).filter(Activity.trip_id == recommended.id).all()
    assert len(activities) == 1

# ניסיון המלצה ע"י משתמש רגיל
def test_recommend_trip_non_admin_forbidden(db):
    trip = trip_service.create_trip(TripCreate(title="Forbidden", destination="Nowhere"), db, user)
    with pytest.raises(HTTPException) as e:
        admin_service.recommend_trip(trip.id, db, user)
    assert e.value.status_code == 403

# ניסיון המלצה על טיול לא קיים
def test_recommend_trip_not_found(db):
    with pytest.raises(HTTPException) as e:
        admin_service.recommend_trip(9999, db, admin)
    assert e.value.status_code == 404


# --- admin_create_recommended_trip ---
# יצירת טיול מומלץ תקין
def test_admin_create_recommended_trip_success(db):
    data = TripCreate(title="Paris", destination="France", description="Lovely", duration_days=4)
    trip = admin_service.admin_create_recommended_trip(data, db)
    assert trip.is_recommended
    assert trip.user_id is None

# ניסיון יצירה עם title ריק
def test_admin_create_recommended_trip_missing_title(db):
    data = TripCreate(title="", destination="France", duration_days=3)
    with pytest.raises(HTTPException) as e:
        admin_service.admin_create_recommended_trip(data, db)
    assert e.value.status_code == 400

# ניסיון יצירה עם destination ריק
def test_admin_create_recommended_trip_missing_destination(db):
    data = TripCreate(title="Test", destination="", duration_days=3)
    with pytest.raises(HTTPException) as e:
        admin_service.admin_create_recommended_trip(data, db)
    assert e.value.status_code == 400

# ניסיון יצירה בלי duration_days
def test_admin_create_recommended_trip_missing_duration(db):
    data = TripCreate(title="Test", destination="Greece")
    with pytest.raises(HTTPException) as e:
        admin_service.admin_create_recommended_trip(data, db)
    assert e.value.status_code == 400


# --- admin_update_recommended_trip ---
# עדכון תקין של טיול מומלץ
def test_admin_update_recommended_trip_success(db):
    trip = admin_service.admin_create_recommended_trip(
        TripCreate(title="Old", destination="Spain", duration_days=2), db
    )
    updated = admin_service.admin_update_recommended_trip(
        trip.id, {"title": "New", "destination": "Portugal"}, db
    )
    assert updated.title == "New"
    assert updated.destination == "Portugal"

# ניסיון עדכון טיול שלא קיים
def test_admin_update_recommended_trip_not_found(db):
    with pytest.raises(HTTPException) as e:
        admin_service.admin_update_recommended_trip(9999, {"title": "X"}, db)
    assert e.value.status_code == 404

# ניסיון לעדכן טיול רגיל (לא מומלץ)
def test_admin_update_recommended_trip_not_recommended(db):
    trip = trip_service.create_trip(TripCreate(title="My Trip", destination="Test"), db, user)
    with pytest.raises(HTTPException) as e:
        admin_service.admin_update_recommended_trip(trip.id, {"title": "X"}, db)
    assert e.value.status_code == 400

# ניסיון עדכון עם title ריק
def test_admin_update_recommended_trip_invalid_title(db):
    trip = admin_service.admin_create_recommended_trip(
        TripCreate(title="Valid", destination="Israel", duration_days=2), db
    )
    with pytest.raises(HTTPException) as e:
        admin_service.admin_update_recommended_trip(trip.id, {"title": "  "}, db)
    assert e.value.status_code == 400


# --- admin_delete_recommended_trip ---
# מחיקת טיול מומלץ תקין
def test_admin_delete_recommended_trip_success(db):
    trip = admin_service.admin_create_recommended_trip(
        TripCreate(title="Delete Me", destination="Anywhere", duration_days=1), db
    )
    deleted = admin_service.admin_delete_recommended_trip(trip.id, db)
    assert deleted.id == trip.id
    assert db.query(Trip).filter_by(id=trip.id).first() is None

# ניסיון מחיקת טיול שלא קיים
def test_admin_delete_recommended_trip_not_found(db):
    with pytest.raises(HTTPException) as e:
        admin_service.admin_delete_recommended_trip(9999, db)
    assert e.value.status_code == 404

# ניסיון מחיקה של טיול שאינו מומלץ
def test_admin_delete_recommended_trip_not_recommended(db):
    trip = trip_service.create_trip(TripCreate(title="Normal", destination="Place"), db, user)
    with pytest.raises(HTTPException) as e:
        admin_service.admin_delete_recommended_trip(trip.id, db)
    assert e.value.status_code == 400


# --- admin_required ---
# אדמין מורשה לעבור
def test_admin_required_success():
    result = admin_service.admin_required(admin)
    assert result == admin

# משתמש רגיל לא מורשה
def test_admin_required_forbidden():
    with pytest.raises(HTTPException) as e:
        admin_service.admin_required(user)
    assert e.value.status_code == 403


# --- get_trips_by_user_id ---
# שליפת טיולים לפי מזהה משתמש
def test_get_trips_by_user_id(db):
    trip1 = trip_service.create_trip(TripCreate(title="A", destination="X"), db, user)
    trip2 = trip_service.create_trip(TripCreate(title="B", destination="Y"), db, user)
    results = admin_service.get_trips_by_user_id(user.id, db)
    assert trip1 in results and trip2 in results
