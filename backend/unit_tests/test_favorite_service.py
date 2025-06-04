import pytest
from fastapi import HTTPException
from app.models.trip_model import Trip
from app.models.rating_model import Rating
from app.services import favorite_service
from unit_tests.conftest import get_test_user, get_admin_user

user = get_test_user()
admin = get_admin_user()

# --- enrich_trip_with_rating ---
# בדיקה עם דירוגים קיימים
def test_enrich_trip_with_rating_with_ratings(db):
    trip = Trip(title="Trip1", destination="Paris")
    db.add(trip)
    db.commit()
    db.add_all([
        Rating(rating=4, user_id=user.id, trip_id=trip.id),
        Rating(rating=5, user_id=admin.id, trip_id=trip.id),
    ])
    db.commit()
    enriched = favorite_service.enrich_trip_with_rating(trip, db)
    assert enriched.average_rating == 4.5

# בדיקה כשאין דירוגים
def test_enrich_trip_with_rating_without_ratings(db):
    trip = Trip(title="Trip2", destination="London")
    db.add(trip)
    db.commit()
    enriched = favorite_service.enrich_trip_with_rating(trip, db)
    assert enriched.average_rating is None

# --- toggle_favorite_trip ---
# הוספה למועדפים (טיול רגיל)
def test_toggle_favorite_trip_add(db):
    trip = Trip(title="Trip3", destination="Berlin")
    db.add(trip)
    db.commit()
    added = favorite_service.toggle_favorite_trip(user, trip.id, db)
    assert added.id == trip.id

# הסרה ממועדפים (טיול רגיל)
def test_toggle_favorite_trip_remove(db):
    trip = Trip(title="Trip4", destination="Madrid")
    db.add(trip)
    db.commit()
    favorite_service.toggle_favorite_trip(user, trip.id, db)
    removed = favorite_service.toggle_favorite_trip(user, trip.id, db)
    assert removed.id == trip.id

# טיול לא קיים
def test_toggle_favorite_trip_invalid_trip(db):
    with pytest.raises(Exception):
        favorite_service.toggle_favorite_trip(user, 9999, db)

# טיול מומלץ לא אמור להיכנס למועדפים רגילים
def test_toggle_favorite_trip_recommended_trip(db):
    trip = Trip(title="Trip5", destination="Rome", is_recommended=True)
    db.add(trip)
    db.commit()
    with pytest.raises(Exception):
        favorite_service.toggle_favorite_trip(user, trip.id, db)

# --- get_all_favorites ---
# שליפת כל הטיולים המועדפים למשתמש
def test_get_all_favorites(db):
    trip = Trip(title="Trip6", destination="Tokyo")
    db.add(trip)
    db.commit()
    favorite_service.toggle_favorite_trip(user, trip.id, db)
    result = favorite_service.get_all_favorites(user, db)
    assert len(result) == 1

# בדיקה כשאין מועדפים כלל
def test_get_all_favorites_empty(db):
    results = favorite_service.get_all_favorites(user, db)
    assert results == []

# --- is_trip_favorite ---
# טיול נמצא במועדפים
def test_is_trip_favorite_true(db):
    trip = Trip(title="Trip7", destination="NYC")
    db.add(trip)
    db.commit()
    favorite_service.toggle_favorite_trip(user, trip.id, db)
    assert favorite_service.is_trip_favorite(user, trip.id, db)

# טיול לא נמצא במועדפים
def test_is_trip_favorite_false(db):
    trip = Trip(title="Trip8", destination="Lisbon")
    db.add(trip)
    db.commit()
    assert not favorite_service.is_trip_favorite(user, trip.id, db)

# טיול לא קיים
def test_is_trip_favorite_invalid_trip(db):
    with pytest.raises(Exception):
        favorite_service.is_trip_favorite(user, 9999, db)

# טיול מומלץ מועבר לפונקציה לא נכונה
def test_is_trip_favorite_on_recommended_trip(db):
    trip = Trip(title="Trip9", destination="X", is_recommended=True)
    db.add(trip)
    db.commit()
    with pytest.raises(Exception):
        favorite_service.is_trip_favorite(user, trip.id, db)

# --- toggle_favorite_recommended_trip ---
# הוספה למועדפים מומלצים
def test_toggle_favorite_recommended_trip_add(db):
    trip = Trip(title="Trip10", destination="Sydney", is_recommended=True)
    db.add(trip)
    db.commit()
    added = favorite_service.toggle_favorite_recommended_trip(trip.id, user, db)
    assert added.id == trip.id

# הסרה ממועדפים מומלצים
def test_toggle_favorite_recommended_trip_remove(db):
    trip = Trip(title="Trip11", destination="Athens", is_recommended=True)
    db.add(trip)
    db.commit()
    favorite_service.toggle_favorite_recommended_trip(trip.id, user, db)
    removed = favorite_service.toggle_favorite_recommended_trip(trip.id, user, db)
    assert removed.id == trip.id

# טיול לא מומלץ לא אמור להיכנס למועדפים מומלצים
def test_toggle_favorite_recommended_trip_invalid_trip(db):
    trip = Trip(title="Trip12", destination="Paris", is_recommended=False)
    db.add(trip)
    db.commit()
    with pytest.raises(Exception):
        favorite_service.toggle_favorite_recommended_trip(trip.id, user, db)

# ניסיון להוסיף טיול מומלץ שלא קיים (אמור להיכשל)
def test_toggle_favorite_recommended_invalid_id(db):
    with pytest.raises(HTTPException):
        favorite_service.toggle_favorite_recommended_trip(999, user, db)

# --- get_all_recommended_favorites ---
# שליפת כל הטיולים המומלצים המועדפים
def test_get_all_recommended_favorites(db):
    trip = Trip(title="Trip13", destination="Seoul", is_recommended=True)
    db.add(trip)
    db.commit()
    favorite_service.toggle_favorite_recommended_trip(trip.id, user, db)
    result = favorite_service.get_all_recommended_favorites(user, db)
    assert len(result) == 1

# בדיקה כשאין טיולים מומלצים במועדפים
def test_get_all_recommended_favorites_empty(db):
    results = favorite_service.get_all_recommended_favorites(user, db)
    assert results == []

# --- is_recommended_trip_favorite ---
# טיול מומלץ נמצא במועדפים
def test_is_recommended_trip_favorite_true(db):
    trip = Trip(title="Trip14", destination="Dubai", is_recommended=True)
    db.add(trip)
    db.commit()
    favorite_service.toggle_favorite_recommended_trip(trip.id, user, db)
    assert favorite_service.is_recommended_trip_favorite(user, trip.id, db)

# טיול מומלץ לא נמצא במועדפים
def test_is_recommended_trip_favorite_false(db):
    trip = Trip(title="Trip15", destination="Tokyo", is_recommended=True)
    db.add(trip)
    db.commit()
    assert not favorite_service.is_recommended_trip_favorite(user, trip.id, db)

# טיול מומלץ לא קיים
def test_is_recommended_trip_favorite_invalid_trip(db):
    with pytest.raises(Exception):
        favorite_service.is_recommended_trip_favorite(user, 9999, db)

# טיול רגיל מועבר בטעות לפונקציה של מומלצים
def test_is_recommended_trip_favorite_on_regular_trip(db):
    trip = Trip(title="Trip16", destination="X", is_recommended=False)
    db.add(trip)
    db.commit()
    with pytest.raises(Exception):
        favorite_service.is_recommended_trip_favorite(user, trip.id, db)
