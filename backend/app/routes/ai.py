# AI שקשורים ל API נתיבי

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from fastapi import HTTPException
from app.services import ai_service
from app.schemas.ai_schema import TripRequestAI

router = APIRouter(prefix="/ai", tags=["AI Services"])

@router.post("/custom-trip")
async def create_custom_trip_via_ai(trip_request: TripRequestAI):
    ai_response = ai_service.create_custom_trip_ai(trip_request.dict())
    
    if "error" in ai_response:
        raise HTTPException(status_code=400, detail=ai_response["error"])
    
    return JSONResponse(content=ai_response)

@router.post("/calculate-budget/{trip_id}")
async def calculate_budget_via_ai(trip_id: int, num_travelers: int):
    result = ai_service.calculate_budget_ai(trip_id, num_travelers)
    return result

@router.get("/trip-types")
def trip_types():
    return ai_service.get_trip_types()
