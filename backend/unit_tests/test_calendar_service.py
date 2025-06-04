import pytest
from unittest.mock import MagicMock, patch
from datetime import date
from fastapi import HTTPException
from app.models.trip_model import Trip
from app.models.user_model import User
from app.services.calendar_service import sync_trip_to_google_calendar, user_tokens
from unit_tests.conftest import get_test_user

# משתמש גלובלי לבדיקה
user = get_test_user()

# --- sync_trip_to_google_calendar ---
# בדיקה של סנכרון טיול תקין ליומן גוגל עם קרדנציאל
@patch("app.services.calendar_service.build")
def test_sync_trip_success(mock_build, db):
    mock_service = MagicMock()
    mock_build.return_value = mock_service
    trip = Trip(
        title="Test Trip",
        destination="Paris",
        start_date=date(2025, 6, 1),
        end_date=date(2025, 6, 3),
        user_id=user.id,
        is_recommended=False
    )
    db.add(trip)
    db.commit()

    credentials = MagicMock()
    sync_trip_to_google_calendar(trip.id, user, db, credentials)

    assert mock_service.events().insert.call_count == 3
    assert mock_service.events().insert().execute.call_count == 3


# בדיקה על טיול שלא קיים
def test_sync_trip_not_found(db):
    with pytest.raises(HTTPException) as e:
        sync_trip_to_google_calendar(9999, user, db, credentials=MagicMock())
    assert e.value.status_code == 404


# בדיקה על טיול מומלץ – לא אמור להסתנכרן
def test_sync_recommended_trip_skipped(db):
    trip = Trip(
        title="Recommended Trip",
        destination="Rome",
        start_date=date(2025, 7, 1),
        end_date=date(2025, 7, 2),
        user_id=user.id,
        is_recommended=True
    )
    db.add(trip)
    db.commit()

    with pytest.raises(HTTPException) as e:
        sync_trip_to_google_calendar(trip.id, user, db, credentials=MagicMock())
    assert e.value.status_code == 404


# בדיקה על טיול ללא תאריכים
def test_sync_trip_missing_dates(db):
    trip = Trip(
        title="No Dates Trip",
        destination="Greece",
        start_date=None,
        end_date=None,
        user_id=user.id,
        is_recommended=False
    )
    db.add(trip)
    db.commit()

    with pytest.raises(HTTPException) as e:
        sync_trip_to_google_calendar(trip.id, user, db, credentials=MagicMock())
    assert e.value.status_code == 400


# בדיקה ללא קרדנציאל – וגם לא בזיכרון
def test_sync_trip_missing_credentials(db):
    trip = Trip(
        title="No Credentials Trip",
        destination="Japan",
        start_date=date(2025, 8, 1),
        end_date=date(2025, 8, 2),
        user_id=user.id,
        is_recommended=False
    )
    db.add(trip)
    db.commit()

    user_tokens.clear()

    with pytest.raises(HTTPException) as e:
        sync_trip_to_google_calendar(trip.id, user, db)
    assert e.value.status_code == 401


# בדיקה של שימוש בקרדנציאל זמני מזיכרון
@patch("app.services.calendar_service.build")
def test_sync_trip_uses_token_from_memory(mock_build, db):
    mock_service = MagicMock()
    mock_build.return_value = mock_service
    trip = Trip(
        title="Token Trip",
        destination="London",
        start_date=date(2025, 9, 1),
        end_date=date(2025, 9, 1),
        user_id=user.id,
        is_recommended=False
    )
    db.add(trip)
    db.commit()

    user_tokens["temp"] = MagicMock()

    sync_trip_to_google_calendar(trip.id, user, db)

    assert mock_service.events().insert.call_count == 1
    user_tokens.clear()
