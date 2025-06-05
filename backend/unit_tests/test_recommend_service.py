import pytest
from fastapi import HTTPException
from app.models.trip_model import Trip
from app.models.rating_model import Rating
from app.models.comment_model import Comment
from app.models.favorite_model import FavoriteRecommendedTrip
from app.schemas.comment_schema import CommentCreate
from app.schemas.rating_schema import RateTripRequest
from app.schemas.trip_schema import AiTripCloneRequest
from app.services import recommend_service
from app.services.auth_service import User
from unit_tests.conftest import get_test_user, get_admin_user

# --- משתמשים גלובליים שנוספו מראש לפיקסטורת db ---
user = get_test_user()
admin = get_admin_user()

# --- get_recommended_trips ---
# מיון לפי recent
def test_get_recommended_trips_recent(db):
    db.add(Trip(title="Trip A", destination="Place", is_recommended=True))
    db.commit()
    result = recommend_service.get_recommended_trips(db, "recent", 1, 10)
    assert result["total"] == 1

# מיון לפי top_rated
def test_get_recommended_trips_top_rated(db):
    trip = Trip(title="Trip A", destination="Place", is_recommended=True)
    db.add(trip)
    db.commit()
    db.add(Rating(rating=5, user_id=user.id, trip_id=trip.id))
    db.commit()
    result = recommend_service.get_recommended_trips(db, "top_rated", 1, 10)
    assert result["total"] == 1

# מיון לפי favorites
def test_get_recommended_trips_favorites(db):
    trip = Trip(title="Trip B", destination="Place", is_recommended=True)
    db.add(trip)
    db.commit()
    db.add(FavoriteRecommendedTrip(user_id=user.id, trip_id=trip.id))
    db.commit()
    result = recommend_service.get_recommended_trips(db, "favorites", 1, 10)
    assert result["total"] == 1

# --- handle_search_recommended_trips ---
# חיפוש לפי כותרת
def test_search_recommended_by_title(db):
    db.add(Trip(title="Amazing", destination="Place", is_recommended=True))
    db.commit()
    result = recommend_service.handle_search_recommended_trips("Ama", "", "", db)
    assert result["total"] == 1

# חיפוש ריק
def test_search_recommended_no_filters(db):
    result = recommend_service.handle_search_recommended_trips("", "", "", db)
    assert result["total"] == 0

# --- rate_trip ---
# דירוג חדש
def test_rate_new_trip(db):
    trip = Trip(title="Rated", destination="X", is_recommended=True)
    db.add(trip)
    db.commit()
    response = recommend_service.rate_trip(trip.id, RateTripRequest(rating=4), user, db)
    assert response["message"]

# דירוג קיים מתעדכן
def test_rate_existing_trip_updates(db):
    trip = Trip(title="Rated", destination="Y", is_recommended=True)
    db.add(trip)
    db.commit()
    db.add(Rating(rating=3, user_id=user.id, trip_id=trip.id))
    db.commit()
    response = recommend_service.rate_trip(trip.id, RateTripRequest(rating=5), user, db)
    assert "Rating submitted successfully" in response["message"]

# ניסיון לדרג טיול לא מומלץ
def test_rate_trip_invalid(db):
    trip = Trip(title="X", destination="Y", is_recommended=False)
    db.add(trip)
    db.commit()
    with pytest.raises(Exception):
        recommend_service.rate_trip(trip.id, RateTripRequest(rating=5), user, db)

# --- תגובות ---
# הוספת תגובה תקינה
def test_add_comment_success(db):
    trip = Trip(title="Commented", destination="Z", is_recommended=True)
    db.add(trip)
    db.commit()
    response = recommend_service.add_comment_to_trip(trip.id, user, CommentCreate(content="Hi"), db)
    assert response.content == "Hi"

# שליפת תגובות
def test_get_comments_success(db):
    trip = Trip(title="Commented", destination="Z", is_recommended=True)
    db.add(trip)
    db.commit()
    db.add(Comment(content="Test", trip_id=trip.id, user_id=user.id))
    db.commit()
    results = recommend_service.get_comments_for_trip(trip.id, db)
    assert len(results) == 1

# מחיקה ע"י הבעלים
def test_delete_comment_success_by_owner(db):
    comment = Comment(content="Bye", user_id=user.id, trip_id=1)
    db.add(comment)
    db.commit()
    deleted = recommend_service.delete_comment(comment.id, user, db)
    assert deleted.content == "Bye"

# מחיקה ע"י מישהו שאינו הבעלים
def test_delete_comment_fail_not_owner(db):
    non_owner = User(id=999, username="notowner", email="x@y.com", password="secret")
    non_owner.is_admin = False
    db.add(non_owner)
    db.commit()

    trip = Trip(title="Trip Delete", destination="Nowhere", is_recommended=True)
    db.add(trip)
    db.commit()

    comment = Comment(content="Private", user_id=user.id, trip_id=trip.id)
    db.add(comment)
    db.commit()

    with pytest.raises(HTTPException) as exc_info:
        recommend_service.delete_comment(comment.id, non_owner, db)

    assert exc_info.value.status_code == 403
    assert "only delete your own comments" in exc_info.value.detail

# --- import_ai_trip_as_recommended ---
# יצירת טיול AI מומלץ תקינה
def test_import_ai_recommended_success(db):
    data = AiTripCloneRequest(
        destination="Tokyo",
        trip_type="Adventure",
        travelers=2,
        duration_days=3,
        trip_plan=[
            {"day": 1, "activities": [{"title": "Mount Fuji", "description": "Hike", "location_name": "Fuji"}]},
            {"day": 2, "activities": []},
            {"day": 3, "activities": []},
        ]
    )
    new_trip = recommend_service.import_ai_trip_as_recommended(data, db)
    assert new_trip.title.startswith("Recommended:")

# --- enrich_with_average_rating ---
# ממוצע תקין
def test_enrich_with_average_rating(db):
    trip = Trip(title="R", destination="D", is_recommended=True)
    db.add(trip)
    db.commit()
    db.add(Rating(rating=3, user_id=user.id, trip_id=trip.id))
    db.add(Rating(rating=5, user_id=admin.id, trip_id=trip.id))
    db.commit()
    enriched = recommend_service.enrich_with_average_rating([trip], db)
    assert enriched[0].average_rating == 4.0

# ממוצע כאשר אין דירוגים
def test_enrich_with_average_rating_empty(db):
    result = recommend_service.enrich_with_average_rating([], db)
    assert result == []
