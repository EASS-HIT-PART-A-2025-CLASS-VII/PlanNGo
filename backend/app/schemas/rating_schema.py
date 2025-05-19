# בדיקה ושליטה על אילו שדות נכנסים ויוצאים בדירוג טיול מומלץ

from pydantic import BaseModel, Field

class RateTripRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")  # דירוג בין 1 ל-5
