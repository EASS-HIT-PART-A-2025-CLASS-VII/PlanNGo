# AI פונקציות שירות הקשורות ל
from fastapi import HTTPException, status
import requests

TRIP_AI_SERVICE_URL = "http://ai-service:8000"

def create_custom_trip_ai(trip_data: dict) -> dict:
    required_fields = ["destination", "num_days", "num_travelers", "trip_type"]
    for field in required_fields:
        value = trip_data.get(field)
        if value is None or (isinstance(value, str) and not value.strip()):
            return {"error": f"{field.capitalize()} is required."}

    offset = trip_data.get("offset", 0) 

    try:
        response = requests.post(
            f"{TRIP_AI_SERVICE_URL}/trip-ai/custom-trip",
            json={
                "destination": trip_data["destination"],
                "num_days": trip_data["num_days"],
                "num_travelers": trip_data["num_travelers"],
                "trip_type": trip_data.get("trip_type"),
                "offset": offset
            },
            timeout=300
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def calculate_budget_ai(trip_id: int, num_travelers: int):
    response = requests.post(f"{TRIP_AI_SERVICE_URL}/trip-ai/calculate-budget/{trip_id}", json={"num_travelers": num_travelers})
    if response.status_code != 200:
        raise Exception("Failed to calculate budget via AI service")
    return response.json()

def get_trip_types():
    response = requests.get(f"{TRIP_AI_SERVICE_URL}/trip-ai/trip-types")
    if response.status_code != 200:
        raise Exception("Failed to fetch trip types")
    return response.json()