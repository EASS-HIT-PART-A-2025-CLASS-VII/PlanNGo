#  שקשורים לסנכרון ליומן API נתיבי

from fastapi import APIRouter, Request, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from fastapi.responses import RedirectResponse
from app.services import calendar_service
from googleapiclient.discovery import build
from app.db.database import get_db
from app.services.token_service import get_current_user
from app.models.user_model import User
from app.services.calendar_service import user_tokens

router = APIRouter(prefix="/calendar", tags=["Calendar"])

# התחברות ליומן גוגל
@router.get("/authorize")
def authorize_calendar(trip_id: int = Query(...)):
    flow = calendar_service.get_google_flow()
    auth_url, _ = flow.authorization_url(
        prompt="consent",
        access_type="offline",
        state=str(trip_id) 
    )
    return RedirectResponse(auth_url)

# חזרה לדף אחרי ההתחברות
@router.get("/callback")
def callback_calendar_and_sync_trip(
    request: Request,
    db: Session = Depends(get_db),):
    flow = calendar_service.get_google_flow()
    flow.fetch_token(authorization_response=str(request.url))
    credentials = flow.credentials

    # שליפת מזהה טיול
    trip_id = request.query_params.get("state")
    if not trip_id:
        raise HTTPException(status_code=400, detail="Missing trip ID from state")

    # כרגע אין קשר למשתמש → שומרים טוקן זמני גלובלי
    user_tokens["temp"] = credentials

    # סנכרון ללא זיהוי משתמש (לצורך בדיקות בלבד!)
    calendar_service.sync_trip_to_google_calendar(
        trip_id=int(trip_id),
        user=None,
        db=db,
        credentials=credentials  # נשלח טוקן ישירות
    )

    return RedirectResponse("https://calendar.google.com/calendar/r")