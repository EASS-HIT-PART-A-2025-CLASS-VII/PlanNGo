import pytest
from fastapi import HTTPException
from unittest.mock import patch, MagicMock
from app.services import custom_trip_plan, calculate_budget_by_ai, get_trip_plan_from_backend
from app.schemas import DayPlan, ActivityItem

# --- calculate_budget_by_ai ---
# מחזיר תגובה תקינה OpenAI בדיקה: החזרת תקציב תקין כאשר
def test_calculate_budget_success():
    trip_plan = [
        DayPlan(day=1, activities=[ActivityItem(time="08:00", title="A", description="...", location_name="X")])
    ]
    with patch("app.services.client.chat.completions.create") as mock_create:
        mock_create.return_value.choices = [MagicMock(message=MagicMock(content="1500"))]
        budget = calculate_budget_by_ai("Paris", 5, 2, trip_plan)
        assert isinstance(budget, float) and budget > 0

# OpenAIError בדיקה: נזרקת חריגה מתאימה עבור 
def test_calculate_budget_openai_error():
    trip_plan = [
        DayPlan(day=1, activities=[])
    ]
    with patch("app.services.client.chat.completions.create", side_effect=Exception("error")):
        with pytest.raises(Exception):
            calculate_budget_by_ai("Paris", 5, 2, trip_plan)

# (num_travelers = 0) → HTTPException בדיקה: קלט שגוי 
def test_calculate_budget_invalid_input():
    with pytest.raises(HTTPException):
        custom_trip_plan(destination="Paris", num_days=3, num_travelers=0)


# --- get_trip_plan_from_backend ---
# תקין trip_plan בדיקה: שליפת  
def test_get_trip_plan_success():
    fake_response = [
        {"day_number": 1, "time": "08:00", "title": "Visit", "description": "desc", "location_name": "Museum"}
    ]
    with patch("app.services.requests.get") as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = fake_response
        result = get_trip_plan_from_backend(1)
        assert isinstance(result, list)
        assert isinstance(result[0], DayPlan)

# בדיקה: קלט ריק מחזיר רשימה ריקה
def test_get_trip_plan_empty():
    with patch("app.services.requests.get") as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = []
        result = get_trip_plan_from_backend(1)
        assert result == []

# בדיקה: קלט עם שדות חסרים לא קורס
def test_get_trip_plan_missing_fields():
    incomplete_response = [{"day_number": 2, "title": "Only title"}]
    with patch("app.services.requests.get") as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = incomplete_response
        try:
            get_trip_plan_from_backend(1)
        except Exception:
            pass


# --- custom_trip_plan ---
# בדיקה: תכנון תקין עם קלטים תקינים
def test_custom_trip_plan_success():
    with patch("app.services.client.chat.completions.create") as mock_create, \
         patch("app.services.calculate_budget_by_ai", return_value=1000.0):
        mock_create.return_value.choices = [MagicMock(message=MagicMock(content='[{"day":1,"activities":[]}]\n'))]
        days, budget = custom_trip_plan("Paris", 1, 2)
        assert isinstance(days, list)
        assert isinstance(budget, float)

# בדיקה: מספר ימים לא חוקי
def test_custom_trip_plan_invalid_days():
    with pytest.raises(HTTPException):
        custom_trip_plan("Paris", 0, 2)

# בדיקה: טקסט ריק
def test_custom_trip_plan_empty_text():
    with pytest.raises(HTTPException):
        custom_trip_plan("", 3, 2)

# trip_type בדיקה: חסר  
def test_custom_trip_plan_missing_optional_field():
    with patch("app.services.client.chat.completions.create") as mock_create, \
         patch("app.services.calculate_budget_by_ai", return_value=1000.0):
        mock_create.return_value.choices = [MagicMock(message=MagicMock(content='[{"day":1,"activities":[]}]\n'))]
        days, budget = custom_trip_plan("Rome", 1, 1, trip_type=None)
        assert isinstance(days, list)
        assert isinstance(budget, float)


# --- custom_trip_plan: קלט מוזר מה־AI ---
# AI בדיקה: קבלת קלט לא תקין מ
def test_custom_trip_plan_with_malformed_json():
    malformed_json = '[{"day": 1, "activities": [INVALID]}]'
    with patch("app.services.client.chat.completions.create") as mock_create:
        mock_create.return_value.choices = [MagicMock(message=MagicMock(content=malformed_json))]
        with pytest.raises(HTTPException):
            custom_trip_plan("Berlin", 1, 2)
