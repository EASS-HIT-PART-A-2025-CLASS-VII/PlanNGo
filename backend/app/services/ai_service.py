# AI פונקציות שירות הקשורות ל

import requests

TRIP_AI_SERVICE_URL = "http://ai-service:8000"

def create_custom_trip_ai(trip_data: dict):
    response = requests.post(f"{TRIP_AI_SERVICE_URL}/trip-ai/custom-trip", json=trip_data)
    if response.status_code != 200:
        raise Exception("Failed to create custom trip via AI service")
    return response.json()

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