# AI שקשורים ל API נתיבי

from fastapi import APIRouter, HTTPException
from app.schemas import TripRequest, TripResponse, BudgetRequest, BudgetResponse, TripType
from app import services
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/trip-ai", tags=["Trip AI Service"])

# AI - יצירת טיול מותאם אישית
@router.post("/custom-trip", response_model=TripResponse)
def create_custom_trip(trip_request: TripRequest):
    if not trip_request.destination or not trip_request.num_days:
        raise HTTPException(status_code=400, detail="Destination and number of days are required.")

    offset = trip_request.offset or 0

    generator = services.custom_trip_plan(
        destination=trip_request.destination,
        num_days=trip_request.num_days,
        num_travelers=trip_request.num_travelers,
        trip_type=trip_request.trip_type
    )

    current_index = 0
    for chunk_days, budget in generator:
        if current_index == offset:
            return JSONResponse(content={
                "trip_plan": chunk_days,
                "estimated_budget": budget
            })
        current_index += 10

    # אם אין יותר צ'אנקים (offset גדול מדי)
    raise HTTPException(status_code=404, detail="No more chunks available.")

# חישוב תקציב לטיול קיים
@router.post("/calculate-budget/{trip_id}", response_model=BudgetResponse)
async def calculate_trip_budget(trip_id: int, budget_request: BudgetRequest):
    trip = services.get_trip_by_id_from_backend(trip_id)

    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")

    destination = trip["destination"]
    trip_plan = services.get_trip_plan_from_backend(trip_id)
    
    num_days = trip["duration_days"]
    if num_days is None:
        raise HTTPException(status_code=400, detail="Cannot calculate budget: trip duration is missing.")

    estimated_budget = services.calculate_budget_by_ai(
        destination=destination,
        num_days=num_days,
        num_travelers=budget_request.num_travelers,
        trip_plan=trip_plan
    )

    return BudgetResponse(estimated_budget=estimated_budget)

# סוג טיול
@router.get("/trip-types", response_model=list[str])
def get_trip_types():
    return [style.value for style in TripType]