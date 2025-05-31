from pydantic import BaseModel
from typing import List, Optional
from enum import Enum

# סוגי טיול
class TripType(str, Enum):
    city_break = "City Break"
    beach = "Beach & Sun"
    nature = "Nature & Hiking"
    adventure = "Adventure"
    culture = "Culture & History"
    romantic = "Romantic Getaway"
    family = "Family Vacation"
    shopping = "Shopping Trip"
    wellness = "Wellness & Spa"
    food = "Culinary Trip"

class ActivityItem(BaseModel):
    time: str
    title: str
    description: str
    location_name: str

class DayPlan(BaseModel):
    day: int
    activities: List[ActivityItem]

class TripRequest(BaseModel):
    destination: str
    num_days: int
    num_travelers: int
    trip_type: TripType

class TripResponse(BaseModel):
    trip_plan: Optional[List[DayPlan]] = None
    estimated_budget: float

class BudgetRequest(BaseModel):
    num_travelers: int

class BudgetResponse(BaseModel):
    estimated_budget: float
