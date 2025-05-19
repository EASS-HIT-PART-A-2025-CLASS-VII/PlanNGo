# שקשורים לשליחת מייל API נתיבי

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services import email_service
from app.schemas.trip_schema import SendSummaryRequest, AiTripSummaryRequest

router = APIRouter(prefix="/emails", tags=["Emails"])

# שליחת סיכום טיול
@router.get("/send-trip-summary/{trip_id}")
def send_trip_summary(trip_id: int, db: Session = Depends(get_db)):
    email_service.send_trip_summary_by_trip_id(trip_id, db)
    return {"message": f"Trip summary sent successfully!"}

# שליחת סיכום טיול מומלץ
@router.post("/send-recommended-summary/{trip_id}")
def send_recommended_trip_summary(trip_id: int, request: SendSummaryRequest, db: Session = Depends(get_db)):
    email_service.send_recommended_trip_summary(trip_id=trip_id, recipient_email=request.email, db=db)
    return {"message": f"Trip summary sent to {request.email}!"}

# AI שליחת סיכום טיול 
@router.post("/send-ai-summary")
def send_ai_trip_summary(request: AiTripSummaryRequest):
    email_service.send_ai_trip_summary_by_data(request)
    return {"message": f"AI trip summary sent to {request.email}!"}
