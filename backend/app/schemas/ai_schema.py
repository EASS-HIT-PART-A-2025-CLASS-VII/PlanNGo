from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any

class TripRequestAI(BaseModel):
    destination: str
    num_days: int
    num_travelers: int
    trip_type: str

class AiTripSummaryRequest(BaseModel):
    email: EmailStr
    destination: str
    days: int
    travelers: int
    trip_type: str
    estimated_budget: float
    trip_plan: List[Dict[str, Any]] 
    
class BudgetRequest(BaseModel):
    num_travelers: int
    
    
class BudgetResponse(BaseModel):
    estimated_budget: float