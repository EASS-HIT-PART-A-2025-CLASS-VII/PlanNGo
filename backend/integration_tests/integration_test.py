import pytest
from app.models.user_model import User
from app.db.database import SessionLocal

@pytest.mark.asyncio
async def test_full_flow(async_client):
    # הרשמה
    signup_data = {
        "username": "testuser",
        "email": "testuser@example.com",
        "password": "testpass",
        "confirm_password": "testpass"
    }
    resp = await async_client.post("/api/auth/signup", json=signup_data)
    assert resp.status_code == 200
    user = resp.json()
    assert user["email"] == signup_data["email"]

    # התחברות
    login_data = {
        "email": "testuser@example.com",
        "password": "testpass"
    }
    resp = await async_client.post("/api/auth/login", json=login_data)
    assert resp.status_code == 200
    tokens = resp.json()
    assert "access_token" in tokens
    async_client.headers.update({"Authorization": f"Bearer {tokens['access_token']}"})

    # יצירת טיול אישי
    trip_payload = {
        "title": "Test Trip",
        "destination": "Paris",
        "start_date": "2025-07-01",
        "end_date": "2025-07-07",
        "description": "Personal test trip"
    }
    resp = await async_client.post("/api/trips/", json=trip_payload)
    assert resp.status_code == 201
    trip = resp.json()
    trip_id = trip["id"]

    # הפיכת המשתמש לאדמין (לפני יצירת טיול מומלץ)
    db = SessionLocal()
    user_obj = db.query(User).filter(User.email == "testuser@example.com").first()
    user_obj.is_admin = True
    db.commit()
    db.close()
    
    # יצירת טיול מומלץ
    recommended_payload = {
        "title": "Recommended Trip",
        "destination": "Rome",
        "duration_days": 5,
        "description": "Test recommended trip"
    }
    resp = await async_client.post("/api/admin/recommended", json=recommended_payload)
    assert resp.status_code == 200
    recommended = resp.json()
    recommended_id = recommended["id"]

    # החזרת המשתמש להיות רגיל
    db = SessionLocal()
    user_obj = db.query(User).filter(User.email == "testuser@example.com").first()
    user_obj.is_admin = False
    db.commit()
    db.close()

    # הוספת פעילות ליום
    activity_payload = {
        "day_number": 1,
        "time": "09:00",
        "title": "Museum Tour",
        "description": "Visit the Louvre",
        "location_name": "Louvre"
    }
    resp = await async_client.post(f"/api/trips/{trip_id}/activities", json=activity_payload)
    assert resp.status_code == 200

    # צפייה בטיולים אישיים
    resp = await async_client.get("/api/trips/")
    assert resp.status_code == 200
    assert any(t["id"] == trip_id for t in resp.json().get("trips", []))

    # צפייה בטיולים מומלצים
    resp = await async_client.get("/api/recommended/")
    assert resp.status_code == 200
    assert any(t["id"] == recommended_id for t in resp.json().get("trips", []))

    # דירוג טיול מומלץ
    resp = await async_client.post(f"/api/recommended/{recommended_id}/rate", json={"rating": 5})
    assert resp.status_code == 200

    # שליחת סיכום למייל
    resp = await async_client.get(f"/api/emails/send-trip-summary/{trip_id}")
    assert resp.status_code == 200

    # יצירת טיול AI
    ai_payload = {
        "destination": "Amsterdam",
        "num_days": 3,
        "num_travelers": 2,
        "trip_type": "City Break",
    }
    resp = await async_client.post("/api/ai/custom-trip", json=ai_payload)
    assert resp.status_code in [200, 201]
    ai_trip = resp.json()
    assert "days" in ai_trip or "trip_plan" in ai_trip

    # צפייה בפעילויות
    resp = await async_client.get(f"/api/trips/{trip_id}/activities")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)