from pydantic import BaseModel
from typing import Optional

class TripRequestAI(BaseModel):
    destination: str
    num_days: int
    num_travelers: int
    trip_type: Optional[str] = None

