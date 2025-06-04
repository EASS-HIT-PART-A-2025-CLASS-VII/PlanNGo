import pytest
from fastapi import HTTPException
from datetime import time
from pydantic import ValidationError
from app.models.activity_model import Activity
from app.schemas.activity_schema import ActivityCreate, ActivityUpdate
from app.schemas.trip_schema import TripCreate
from app.services import activity_service, trip_service
from unit_tests.conftest import get_test_user, get_admin_user

# משתמשים גלובליים לבדיקה
user = get_test_user()
admin = get_admin_user()


# --- get_activities_by_trip ---

# שליפת כל הפעילויות של טיול מסוים
def test_get_activities_by_trip(db):
    trip = trip_service.create_trip(TripCreate(title="T1", destination="X"), db, user)
    act = Activity(trip_id=trip.id, title="A", day_number=1, location_name="Loc")
    db.add(act)
    db.commit()
    results = activity_service.get_activities_by_trip(db, trip.id)
    assert len(results) == 1


# --- get_activities_by_trip_and_day ---

# שליפת פעילויות לפי מזהה טיול ומספר יום
def test_get_activities_by_trip_and_day_sorted(db):
    trip = trip_service.create_trip(TripCreate(title="T2", destination="X"), db, user)
    act1 = Activity(trip_id=trip.id, title="Late", day_number=1, location_name="X", time=time(14, 0))
    act2 = Activity(trip_id=trip.id, title="Early", day_number=1, location_name="X", time=time(9, 0))
    db.add_all([act1, act2])
    db.commit()
    activities = activity_service.get_activities_by_trip_and_day(db, trip.id, 1)
    assert activities[0].title == "Early"
    assert activities[1].title == "Late"


# --- get_activity_by_id ---

# שליפת פעילות לפי מזהה תקף
def test_get_activity_by_id_success(db):
    trip = trip_service.create_trip(TripCreate(title="Trip", destination="Place"), db, user)
    act = Activity(trip_id=trip.id, title="Act", day_number=1, location_name="Here")
    db.add(act)
    db.commit()
    result = activity_service.get_activity_by_id(act.id, db)
    assert result.id == act.id

# ניסיון לשלוף פעילות שלא קיימת
def test_get_activity_by_id_not_found(db):
    with pytest.raises(HTTPException) as e:
        activity_service.get_activity_by_id(9999, db)
    assert e.value.status_code == 404


# --- create_activity ---

# יצירת פעילות ע"י בעל הטיול
def test_create_activity_success_user(db):
    trip = trip_service.create_trip(TripCreate(title="T", destination="D"), db, user)
    data = ActivityCreate(title="Hike", day_number=1, location_name="Mountain")
    result = activity_service.create_activity(db, data, trip.id, user)
    assert result.title == "Hike"

# יצירת פעילות בטיול מומלץ ע"י אדמין
def test_create_activity_admin_on_recommended_trip(db):
    trip = trip_service.create_trip(TripCreate(title="Rec", destination="X"), db, admin)
    trip.is_recommended = True
    db.commit()
    data = ActivityCreate(title="Walk", day_number=1, location_name="Park")
    result = activity_service.create_activity(db, data, trip.id, admin)
    assert result.location_name == "Park"

# משתמש רגיל מנסה להוסיף לפעילות של טיול לא שלו
def test_create_activity_unauthorized_user_on_other_trip(db):
    trip = trip_service.create_trip(TripCreate(title="Foreign", destination="X"), db, admin)
    data = ActivityCreate(title="A", day_number=1, location_name="L")
    with pytest.raises(HTTPException) as e:
        activity_service.create_activity(db, data, trip.id, user)
    assert e.value.status_code == 403

# משתמש רגיל מנסה להוסיף לטיול מומלץ
def test_create_activity_user_on_recommended_forbidden(db):
    trip = trip_service.create_trip(TripCreate(title="R", destination="Y"), db, admin)
    trip.is_recommended = True
    db.commit()
    data = ActivityCreate(title="X", day_number=1, location_name="L")
    with pytest.raises(HTTPException) as e:
        activity_service.create_activity(db, data, trip.id, user)
    assert e.value.status_code == 403

# יצירת פעילות ללא כותרת
def test_create_activity_missing_title(db):
    trip = trip_service.create_trip(TripCreate(title="Trip", destination="T"), db, user)
    data = ActivityCreate(title="", day_number=1, location_name="L")
    with pytest.raises(HTTPException) as e:
        activity_service.create_activity(db, data, trip.id, user)
    assert e.value.status_code == 400

# יצירת פעילות ללא location
def test_create_activity_missing_location(db):
    trip = trip_service.create_trip(TripCreate(title="T", destination="T"), db, user)
    data = ActivityCreate(title="X", day_number=1, location_name="")
    with pytest.raises(HTTPException) as e:
        activity_service.create_activity(db, data, trip.id, user)
    assert e.value.status_code == 400

# יצירת פעילות ללא day_number
def test_create_activity_missing_day_number():
    with pytest.raises(ValidationError) as e:
        ActivityCreate(title="X", day_number=None, location_name="Here")
    assert "day_number" in str(e.value)


# --- update_activity ---

# עדכון פעילות בטיול רגיל ע"י הבעלים
def test_update_activity_user_success(db):
    trip = trip_service.create_trip(TripCreate(title="T", destination="D"), db, user)
    act = Activity(trip_id=trip.id, title="Old", day_number=1, location_name="X")
    db.add(act)
    db.commit()
    update = ActivityUpdate(title="New")
    result = activity_service.update_activity(db, act.id, update, user)
    assert result.title == "New"

# עדכון פעילות בטיול מומלץ ע"י אדמין
def test_update_activity_admin_on_recommended(db):
    trip = trip_service.create_trip(TripCreate(title="R", destination="D"), db, admin)
    trip.is_recommended = True
    db.commit()
    act = Activity(trip_id=trip.id, title="Old", day_number=1, location_name="X")
    db.add(act)
    db.commit()
    update = ActivityUpdate(title="New")
    result = activity_service.update_activity(db, act.id, update, admin)
    assert result.title == "New"

# משתמש רגיל מנסה לעדכן פעילות לא שלו
def test_update_activity_user_forbidden(db):
    trip = trip_service.create_trip(TripCreate(title="F", destination="D"), db, admin)
    act = Activity(trip_id=trip.id, title="T", day_number=1, location_name="L")
    db.add(act)
    db.commit()
    update = ActivityUpdate(title="Blocked")
    with pytest.raises(HTTPException) as e:
        activity_service.update_activity(db, act.id, update, user)
    assert e.value.status_code == 403

# משתמש רגיל מנסה לעדכן פעילות בטיול מומלץ (אמור להיכשל ב־403)
def test_update_activity_user_on_recommended_forbidden(db):
    # יצירת טיול מומלץ על ידי אדמין
    trip = trip_service.create_trip(TripCreate(title="Recommended", destination="Place"), db, admin)
    trip.is_recommended = True
    db.commit()

    # הוספת פעילות לטיול הזה
    act = Activity(trip_id=trip.id, title="Protected", day_number=1, location_name="Secret")
    db.add(act)
    db.commit()

    # משתמש רגיל מנסה לעדכן את הפעילות
    update = ActivityUpdate(title="Hacked Title")
    with pytest.raises(HTTPException) as e:
        activity_service.update_activity(db, act.id, update, user)
    assert e.value.status_code == 403
    assert "Only admin can update activities in recommended trips" in str(e.value.detail)


# --- delete_activity ---

# מחיקת פעילות בטיול רגיל ע"י המשתמש
def test_delete_activity_user_success(db):
    trip = trip_service.create_trip(TripCreate(title="T", destination="D"), db, user)
    act = Activity(trip_id=trip.id, title="To Delete", day_number=1, location_name="X")
    db.add(act)
    db.commit()
    deleted = activity_service.delete_activity(db, act.id, user)
    assert deleted.id == act.id
    assert db.query(Activity).filter_by(id=act.id).first() is None

# מחיקת פעילות בטיול מומלץ ע"י אדמין
def test_delete_activity_admin_on_recommended(db):
    trip = trip_service.create_trip(TripCreate(title="R", destination="D"), db, admin)
    trip.is_recommended = True
    db.commit()
    act = Activity(trip_id=trip.id, title="Delete Me", day_number=1, location_name="X")
    db.add(act)
    db.commit()
    result = activity_service.delete_activity(db, act.id, admin)
    assert result.id == act.id

# משתמש רגיל מנסה למחוק פעילות בטיול מומלץ
def test_delete_activity_user_on_recommended_forbidden(db):
    trip = trip_service.create_trip(TripCreate(title="F", destination="D"), db, admin)
    trip.is_recommended = True
    db.commit()
    act = Activity(trip_id=trip.id, title="Protected", day_number=1, location_name="X")
    db.add(act)
    db.commit()
    with pytest.raises(HTTPException) as e:
        activity_service.delete_activity(db, act.id, user)
    assert e.value.status_code == 403

# משתמש רגיל מנסה למחוק פעילות בטיול שלא שייך לו (אמור להיכשל ב־403)
def test_delete_activity_user_on_foreign_trip_forbidden(db):
    # טיול נוצר ע"י אדמין
    trip = trip_service.create_trip(TripCreate(title="Not Yours", destination="Elsewhere"), db, admin)

    # פעילות שייכת לטיול הזה
    act = Activity(trip_id=trip.id, title="Private", day_number=1, location_name="Hidden")
    db.add(act)
    db.commit()

    # משתמש רגיל מנסה למחוק את הפעילות
    with pytest.raises(HTTPException) as e:
        activity_service.delete_activity(db, act.id, user)
    assert e.value.status_code == 403
    assert "Not authorized to delete this activity" in str(e.value.detail)
