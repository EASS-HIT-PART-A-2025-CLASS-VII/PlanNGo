# AI שקשורים ל API נתיבי

from fastapi import APIRouter
from app.services import ai_service
from app.schemas.ai_schema import TripRequestAI

router = APIRouter(prefix="/ai", tags=["AI Services"])

@router.post("/custom-trip")
async def create_custom_trip_via_ai(trip_request: TripRequestAI):
    result = ai_service.create_custom_trip_ai(trip_request.model_dump())
    return result

@router.post("/calculate-budget/{trip_id}")
def calculate_budget_via_ai(trip_id: int, num_travelers: int):
    print("ai-route")
    result = ai_service.calculate_budget_ai(trip_id, num_travelers)
    return result

@router.get("/trip-types")
def trip_types():
    return ai_service.get_trip_types()
