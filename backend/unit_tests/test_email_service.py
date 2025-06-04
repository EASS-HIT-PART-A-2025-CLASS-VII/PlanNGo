import pytest
from unittest.mock import patch, MagicMock, mock_open
from email.mime.application import MIMEApplication
from fastapi import HTTPException
from datetime import date, timedelta
from app.services import email_service
from app.schemas.ai_schema import AiTripSummaryRequest
from app.models.trip_model import Trip
from app.models.user_model import User
from app.models.activity_model import Activity
from unit_tests.conftest import get_test_user

# משתמש גלובלי לבדיקה
user = get_test_user()


# --- send_email ---
# בדיקה שהמייל נשלח בהצלחה
@patch("smtplib.SMTP")
def test_send_email_success(mock_smtp):
    mock_server = MagicMock()
    mock_smtp.return_value.__enter__.return_value = mock_server

    email_service.send_email(
        subject="Test Subject",
        to_email="recipient@example.com",
        body_html="<p>Hello</p>"
    )

    mock_server.send_message.assert_called_once()


# בדיקה שהמייל נשלח עם קובץ מצורף
@patch("smtplib.SMTP")
def test_send_email_with_attachment(mock_smtp):
    mock_server = MagicMock()
    mock_smtp.return_value.__enter__.return_value = mock_server

    attachment = MIMEApplication(b"data")
    attachment.add_header('Content-Disposition', 'attachment', filename="file.txt")

    email_service.send_email(
        subject="Subject",
        to_email="test@example.com",
        body_html="<p>Test</p>",
        attachment=attachment
    )

    mock_server.send_message.assert_called_once()


# בדיקה של כישלון ב־SMTP
@patch("smtplib.SMTP", side_effect=Exception("SMTP error"))
def test_send_email_failure(mock_smtp):
    with pytest.raises(Exception):
        email_service.send_email("Fail", "fail@example.com", "<p>fail</p>")


# --- send_reset_email ---
# בדיקה שנשלח מייל איפוס עם קישור נכון
@patch("app.services.email_service.send_email")
def test_send_reset_email(mock_send):
    email_service.send_reset_email("test@example.com", "token123")
    args, kwargs = mock_send.call_args
    assert "reset-password/token123" in kwargs["body_html"]
    assert kwargs["to_email"] == "test@example.com"


# --- send_upcoming_trip_reminders ---
# בדיקה של שליחת מייל לתזכורת על טיול שמתחיל היום
@patch("app.services.email_service.send_email")
def test_send_upcoming_trip_reminder_today(mock_send, db):
    today = date.today()
    trip = Trip(title="Today Trip", destination="Place", start_date=today, end_date=today + timedelta(days=1), user_id=user.id)
    db.add(trip)
    db.commit()

    email_service.send_upcoming_trip_reminders(db)
    assert mock_send.call_count == 1
    assert "Today" in mock_send.call_args[1]["subject"]

# בדיקה שלא נשלח מייל על טיול שמתחיל רחוק (יותר מ-3 ימים קדימה)
@patch("app.services.email_service.send_email")
def test_send_upcoming_trip_skips_far_future_trip(mock_send, db):
    future_start = date.today() + timedelta(days=5)
    trip = Trip(
        title="Far Future Trip",
        destination="Mars",
        start_date=future_start,
        end_date=future_start + timedelta(days=3),
        user_id=user.id
    )
    db.add(trip)
    db.commit()

    email_service.send_upcoming_trip_reminders(db)
    assert mock_send.call_count == 0
    

# --- send_trip_summary_by_trip_id ---
# בדיקה של שליחת מייל סיכום טיול תקין
@patch("app.services.email_service.send_email")
@patch("tempfile.NamedTemporaryFile")
def test_send_trip_summary_success(mock_temp, mock_send, db):
    trip = Trip(title="Trip", destination="Rome", start_date=date.today(), end_date=date.today(), user_id=user.id)
    db.add(trip)
    db.commit()

    mock_file = MagicMock()
    mock_file.__enter__.return_value.name = "/tmp/fake.txt"
    mock_temp.return_value = mock_file

    with patch("builtins.open", mock_open(read_data="summary text")):
        email_service.send_trip_summary_by_trip_id(trip.id, db)
        assert mock_send.call_count == 1


# בדיקה על טיול שלא קיים
def test_send_trip_summary_trip_not_found(db):
    with pytest.raises(HTTPException) as e:
        email_service.send_trip_summary_by_trip_id(9999, db)
    assert e.value.status_code == 404


# --- send_recommended_trip_summary ---
# בדיקה של שליחת מייל סיכום טיול מומלץ
@patch("app.services.email_service.send_email")
@patch("tempfile.NamedTemporaryFile")
def test_send_recommended_trip_summary_success(mock_temp, mock_send, db):
    trip = Trip(title="Recommended", destination="Greece", is_recommended=True, start_date=date.today(), end_date=date.today())
    db.add(trip)
    db.commit()

    mock_file = MagicMock()
    mock_file.__enter__.return_value.name = "/tmp/fake.txt"
    mock_temp.return_value = mock_file

    with patch("builtins.open", mock_open(read_data="summary text")):
        email_service.send_recommended_trip_summary(trip.id, "user@example.com", db)
        assert mock_send.call_count == 1


# בדיקה על טיול מומלץ שלא קיים
def test_send_recommended_trip_not_found(db):
    with pytest.raises(HTTPException) as e:
        email_service.send_recommended_trip_summary(9999, "someone@example.com", db)
    assert e.value.status_code == 404


# --- send_ai_trip_summary_by_data ---
# בדיקה של שליחת מייל מסיכום טיול AI
@patch("app.services.email_service.send_email")
@patch("tempfile.NamedTemporaryFile")
def test_send_ai_trip_summary_success(mock_temp, mock_send):
    request = AiTripSummaryRequest(
        destination="Japan",
        days=3,
        travelers=2,
        trip_type="Adventure",
        estimated_budget=3000,
        email="ai@example.com",
        trip_plan=[
            {"day": 1, "activities": [{"title": "Temple", "time": "10:00", "description": "Visit temple", "location_name": "Kyoto"}]},
            {"day": 2, "activities": []},
            {"day": 3, "activities": []},
        ]
    )

    mock_file = MagicMock()
    mock_file.__enter__.return_value.name = "/tmp/fake.txt"
    mock_temp.return_value = mock_file

    with patch("builtins.open", mock_open(read_data="ai summary")):
        email_service.send_ai_trip_summary_by_data(request)
        assert mock_send.call_count == 1
