import pytest
from fastapi import HTTPException
from unittest.mock import patch, Mock
from app.services import ai_service
from unit_tests.conftest import get_test_user, get_admin_user

# משתמשים גלובליים לבדיקה
user = get_test_user()
admin = get_admin_user()


# --- create_custom_trip_ai ---
# יצירת טיול מותאם אישית בהצלחה עם נתונים תקינים
@patch("app.services.ai_service.requests.post")
def test_create_custom_trip_ai_success(mock_post):
    mock_response = Mock(status_code=200)
    mock_response.json.return_value = {"trip": "customized"}
    mock_post.return_value = mock_response

    trip_data = {
        "destination": "Rome",
        "num_days": 5,
        "num_travelers": 2,
        "trip_type": "Romantic"
    }

    result = ai_service.create_custom_trip_ai(trip_data)
    assert result["trip"] == "customized"
    mock_post.assert_called_once()

# בדיקה של חסר שדה חובה (destination ריק)
def test_create_custom_trip_ai_missing_field():
    trip_data = {
        "destination": "",
        "num_days": 5,
        "num_travelers": 2,
        "trip_type": "Romantic"
    }

    with pytest.raises(HTTPException) as e:
        ai_service.create_custom_trip_ai(trip_data)
    assert e.value.status_code == 400
    assert "Destination is required" in str(e.value.detail)

# כישלון תקשורת עם שירות ה-AI (סטטוס שגוי)
@patch("app.services.ai_service.requests.post")
def test_create_custom_trip_ai_failure(mock_post):
    mock_post.return_value = Mock(status_code=500)

    trip_data = {
        "destination": "Paris",
        "num_days": 3,
        "num_travelers": 1,
        "trip_type": "Solo"
    }

    with pytest.raises(Exception) as e:
        ai_service.create_custom_trip_ai(trip_data)
    assert "Failed to create custom trip" in str(e.value)


# --- calculate_budget_ai ---
# חישוב תקציב מוצלח לפי מזהה טיול ומספר מטיילים
@patch("app.services.ai_service.requests.post")
def test_calculate_budget_ai_success(mock_post):
    mock_response = Mock(status_code=200)
    mock_response.json.return_value = {"estimated_budget": 1500}
    mock_post.return_value = mock_response

    result = ai_service.calculate_budget_ai(trip_id=123, num_travelers=2)
    assert result["estimated_budget"] == 1500
    mock_post.assert_called_once()

# כישלון בקבלת תקציב מה-AI (סטטוס שגוי)
@patch("app.services.ai_service.requests.post")
def test_calculate_budget_ai_failure(mock_post):
    mock_post.return_value = Mock(status_code=502)

    with pytest.raises(Exception) as e:
        ai_service.calculate_budget_ai(trip_id=321, num_travelers=1)
    assert "Failed to calculate budget" in str(e.value)


# --- get_trip_types ---
# שליפה תקינה של סוגי טיולים
@patch("app.services.ai_service.requests.get")
def test_get_trip_types_success(mock_get):
    mock_response = Mock(status_code=200)
    mock_response.json.return_value = ["Adventure", "Relaxation"]
    mock_get.return_value = mock_response

    result = ai_service.get_trip_types()
    assert "Adventure" in result
    assert "Relaxation" in result
    mock_get.assert_called_once()

# כישלון בשליפת סוגי טיולים מה-AI
@patch("app.services.ai_service.requests.get")
def test_get_trip_types_failure(mock_get):
    mock_get.return_value = Mock(status_code=500)

    with pytest.raises(Exception) as e:
        ai_service.get_trip_types()
    assert "Failed to fetch trip types" in str(e.value)
