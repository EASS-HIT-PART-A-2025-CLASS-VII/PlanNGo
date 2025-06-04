import pytest
from app.schemas import ActivityItem, DayPlan

# פיקסטורת יום לדוגמה עם שתי פעילויות
@pytest.fixture
def sample_day_plan():
    return [
        DayPlan(
            day=1,
            activities=[
                ActivityItem(
                    time="09:00",
                    title="Museum Visit",
                    description="Explore the national museum",
                    location_name="National Museum"
                ),
                ActivityItem(
                    time="13:00",
                    title="Lunch",
                    description="Eat sushi at a local restaurant",
                    location_name="Sushi Zanmai"
                )
            ]
        )
    ]
