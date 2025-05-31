# AI פונקציות שירות הקשורות ל
from fastapi import HTTPException, status
import requests
from app.schemas.ai_schema import BudgetResponse

TRIP_AI_SERVICE_URL = "http://ai-service:8000"

def create_custom_trip_ai(trip_data: dict):
    required_fields = ["destination", "num_days", "num_travelers", "trip_type"]
    for field in required_fields:
        value = trip_data.get(field)
        if value is None or (isinstance(value, str) and not value.strip()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{field.capitalize()} is required."
            )
        
    response = requests.post(f"{TRIP_AI_SERVICE_URL}/trip-ai/custom-trip", json=trip_data)
    if response.status_code != 200:
        raise Exception("Failed to create custom trip via AI service")
    return response.json()

def calculate_budget_ai(trip_id: int, num_travelers: int):
    print("start calc")
    response = requests.post(
        f"{TRIP_AI_SERVICE_URL}/trip-ai/calculate-budget/{trip_id}",
        params={"num_travelers": num_travelers},
    )
    print(f"response {response}")
    if response.status_code != 200:
        raise Exception("Failed to calculate budget via AI service")
    return response.json()

def get_trip_types():
    response = requests.get(f"{TRIP_AI_SERVICE_URL}/trip-ai/trip-types")
    if response.status_code != 200:
        raise Exception("Failed to fetch trip types")
    return response.json()