# פונקציות שירות הקשורות לשליחת מיילים 

import smtplib
import os
from fastapi import HTTPException
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from dotenv import load_dotenv
from app.services.trip_service import get_upcoming_trips
from app.services.trip_service import build_trip_summary_text
from app.models.user_model import User
from app.models.trip_model import Trip
from sqlalchemy.orm import Session
from datetime import date
import tempfile
from app.schemas.ai_schema import AiTripSummaryRequest
from apscheduler.schedulers.background import BackgroundScheduler
from app.db.database import SessionLocal

load_dotenv()

EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))

# פונקציה לשליחת מיילים
def send_email(subject: str, to_email: str, body_html: str, attachment=None):
    try:
        msg = MIMEMultipart()
        msg["From"] = EMAIL_ADDRESS
        msg["To"] = to_email
        msg["Subject"] = subject

        msg.attach(MIMEText(body_html, "html"))

        if attachment:
            msg.attach(attachment)

        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.send_message(msg)

        print(f"Email sent successfully to {to_email}!")

    except Exception as e:
        print("Error sending email to", to_email, ":", str(e))
        raise

# מייל איפוס סיסמה
def send_reset_email(to_email: str, reset_token: str):
    reset_link = f"http://localhost:3000/reset-password/{reset_token}"

    body = f"""
    <h3>Hi from PlanNGo 👋</h3>
    <p>Click the link below to reset your password:</p>
    <a href="{reset_link}">{reset_link}</a>
    <p>This link will expire in 15 minutes.</p>
    """

    send_email(
        subject="PlanNGo - Reset Your Password",
        to_email=to_email,
        body_html=body
    )

# מייל תזכורת טיול מתקרב
def send_upcoming_trip_reminders(db: Session):
    upcoming_trips = get_upcoming_trips(db)
    today = date.today()

    for trip in upcoming_trips:
        user: User = trip.users
        if not user or not user.email:
            continue

        days_until = (trip.start_date - today).days

        if days_until == 0:
            timing_text = "Today"
        elif days_until == 1:
            timing_text = "Tomorrow"
        else:
            timing_text = "In 2 days"

        subject = f"Your trip starts {timing_text}! ✈️"
        
        body = f"""
        <h3>Hi {user.username},</h3>

        <p>This is a reminder that your trip is starting <b>{timing_text}</b>.</p>

        <p>
        <b>📍 Destination:</b> {trip.destination}<br>
        <b>📅 Dates:</b> {trip.start_date} to {trip.end_date}<br>
        <b>📝 Title:</b> {trip.title}
        </p>

        <p>
        We wish you a wonderful experience!<br>
        The PlanNGo Team 🌍
        </p>
        """

        send_email(subject=subject, to_email=user.email, body_html=body)

# תזמון שליחת מייל תזכורת כל יום בשעה 8:00
def start_reminder_scheduler():
    scheduler = BackgroundScheduler()

    def job():
        db = SessionLocal()
        try:
            send_upcoming_trip_reminders(db)
        finally:
            db.close()

    scheduler.add_job(job, 'cron', hour=8, minute=0, timezone='Asia/Jerusalem')  # כל יום בשעה 08:00
    scheduler.start()

# מייל סיכום טיול אישי
def send_trip_summary_by_trip_id(trip_id: int, db):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    user: User = trip.users
    if not user or not user.email:
        raise HTTPException(status_code=400, detail="Trip has no associated user with email")

    summary_text = build_trip_summary_text(trip)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".txt") as temp_file:
        temp_file.write(summary_text.encode("utf-8"))
        temp_file_path = temp_file.name
        file_name = f"{trip.title}_summary.txt"

    with open(temp_file_path, "rb") as f:
        attachment = MIMEApplication(f.read(), _subtype="txt")
        attachment.add_header('Content-Disposition', 'attachment', filename=file_name)

        subject = f"Your Trip Summary: {trip.title}"
        body = f"""
        <h3>Hello {user.username},</h3>
        <p>Attached is your personalized trip summary to <b>{trip.destination}</b>.</p>
        <p>We hope you had a memorable journey!</p>
        <p>Thanks for using PlanNGo 🌍</p>
        """

        send_email(subject=subject, to_email=user.email, body_html=body, attachment=attachment)

# מייל סיכום טיול מומלץ
def send_recommended_trip_summary(trip_id: int, recipient_email: str, db: Session):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.is_recommended == True).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Recommended trip not found")

    summary_text = build_trip_summary_text(trip)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".txt") as temp_file:
        temp_file.write(summary_text.encode("utf-8"))
        temp_file_path = temp_file.name
        file_name = f"{trip.title}_summary.txt"

    with open(temp_file_path, "rb") as f:
        attachment = MIMEApplication(f.read(), _subtype="txt")
        attachment.add_header('Content-Disposition', 'attachment', filename=file_name)

        subject = f"Recommended Trip Summary: {trip.title}"
        body = f"""
        <h3>Hello Traveler,</h3>
        <p>Attached is the full summary of our recommended trip to <b>{trip.destination}</b>.</p>
        <p>We hope it inspires your next adventure!</p>
        <p>With love,<br>PlanNGo Team 🌍</p>
        """

        send_email(subject=subject, to_email=recipient_email, body_html=body, attachment=attachment)

# AI מייל סיכום טיול שנוצר ב
def send_ai_trip_summary_by_data(request: AiTripSummaryRequest):
    summary_lines = [
        f"Destination: {request.destination}",
        f"Duration: {request.days} days",
        f"Number of Travelers: {request.travelers}",
        f"Trip Type: {request.trip_type}",
        f"Estimated Budget: ${request.estimated_budget}",
        "",
        "Daily Activities:"
    ]

    for day in request.trip_plan:
        summary_lines.append(f"\nDay {day['day']}:")
        for activity in day["activities"]:
            summary_lines.append(
                f"- {activity['time']} - {activity['title']} at {activity['location_name']}: {activity['description']}"
            )

    summary_text = "\n".join(summary_lines)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".txt") as temp_file:
        temp_file.write(summary_text.encode("utf-8"))
        temp_file_path = temp_file.name
        file_name = f"AI_Trip_to_{request.destination}_Summary.txt"

    with open(temp_file_path, "rb") as f:
        attachment = MIMEApplication(f.read(), _subtype="txt")
        attachment.add_header('Content-Disposition', 'attachment', filename=file_name)

        subject = f"Your AI Trip Plan to {request.destination}"
        body = f"""
        <h3>Hello Traveler,</h3>
        <p>Attached is the summary of your AI-generated trip to <b>{request.destination}</b>.</p>
        <p>We hope it helps you plan an amazing trip.</p>
        <p>Best wishes,<br>PlanNGo Team 🌍</p>
        """

        send_email(subject=subject, to_email=request.email, body_html=body, attachment=attachment)
