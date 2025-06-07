# פונקציות שירות הקשורות לסנכרון ליומן 

import os
from datetime import timedelta
from app.models.trip_model import Trip
from sqlalchemy.orm import Session
from fastapi import HTTPException
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

# זיכרון זמני לשמירת טוקנים של משתמשים
user_tokens = {}

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

CLIENT_SECRETS_FILE = "app/client-secret.json"

SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly"
]

REDIRECT_URI = "http://localhost:8000/api/calendar/callback"

def get_google_flow():
    return Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )

# סנכרון טיול ליומן גוגל
def sync_trip_to_google_calendar(trip_id: int, user, db: Session, credentials: Credentials = None):
    # שליפת הטיול
    trip = db.query(Trip).filter_by(id=trip_id, is_recommended=False).first()

    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # בדיקה אם יש תאריכים
    if not trip.start_date or not trip.end_date:
        raise HTTPException(status_code=400, detail="Trip must have start and end dates to sync with calendar")

    # שליפת קרדנציאל מהזיכרון אם לא הועבר ידנית
    if not credentials:
        credentials = user_tokens.get("temp")

    if not credentials:
        raise HTTPException(status_code=401, detail="Missing calendar authorization – please reconnect via /calendar/authorize")

    service = build("calendar", "v3", credentials=credentials)

    current_date = trip.start_date
    while current_date <= trip.end_date:
        event = {
            "summary": f"{trip.title} - {trip.destination}",
            "description": f"Trip day in {trip.destination}",
            "start": {"date": current_date.isoformat()},
            "end": {"date": (current_date + timedelta(days=1)).isoformat()},
        }
        service.events().insert(calendarId="primary", body=event).execute()
        current_date += timedelta(days=1)
