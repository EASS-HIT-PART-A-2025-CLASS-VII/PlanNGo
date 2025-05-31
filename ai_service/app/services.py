# AI פונקציות שירות הקשורות ל 

import json
from openai import OpenAI, OpenAIError
from app.schemas import DayPlan, ActivityItem
from typing import List, Optional, Tuple
import os
import requests
from dotenv import load_dotenv
from fastapi import HTTPException
from collections import defaultdict
import re

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# AI יצירת טיול
def custom_trip_plan(
    destination: str,
    num_days: int,
    num_travelers: int,
    trip_type: Optional[str] = None
) -> Tuple[List[dict], float]:
    MAX_DAYS_PER_REQUEST = 10
    visited_places = set()
    all_days = []

    for i in range(0, num_days, MAX_DAYS_PER_REQUEST):
        sub_start_day = i + 1
        sub_end_day = min(i + MAX_DAYS_PER_REQUEST, num_days)
        sub_days = sub_end_day - sub_start_day + 1

        prompt = (
            f"You are a professional travel planner. Create a detailed and realistic travel itinerary for **Day {sub_start_day} to Day {sub_end_day}** "
            f"({sub_days} days in total) for {num_travelers} travelers visiting {destination}. "
        )

        if trip_type:
            prompt += f"The trip should match the style: '{trip_type}'. "

        if visited_places:
            visited_text = ", ".join(sorted(visited_places))
            prompt += (
                f"Avoid repeating the following places already visited in earlier days: {visited_text}. "
                f"This itinerary is a continuation of a longer trip. Please ensure the new days follow naturally. "
                f"maintain a logical geographical flow – group nearby locations together and avoid unnecessary backtracking. "
            )
        
        prompt += (
        f"Each day should include at least 5 to 7 activities, covering the full day from morning (~08:00) to evening (~21:00). "
        "Include a natural mix of experiences: sightseeing, meals, relaxation, nature, culture, local highlights, and transportation if needed. "
        "Make sure to space out the activities realistically by considering how long it would take to travel between locations. "
        "Avoid back-to-back activities that are far apart unless they are near each other or within walking distance. "
        "Each activity must have the following fields:\n"
        "- time (in HH:MM format)\n"
        "- title (short activity name)\n"
        "- description (1–2 sentences explaining the activity)\n"
        "- location_name (specific and realistic place)\n\n"
        "Structure the result as a JSON array of days:\n"
        "[\n"
        "  {\n"
        "    \"day\": 1,\n"
        "    \"activities\": [\n"
        "      {\n"
        "        \"time\": \"08:30\",\n"
        "        \"title\": \"Visit the Museum\",\n"
        "        \"description\": \"Explore the ancient exhibits of the local culture.\",\n"
        "        \"location_name\": \"National Museum\"\n"
        "      }, ...\n"
        "    ]\n"
        "  },\n"
        "  ...\n"
        "]\n\n"
        )

        try:
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=4000,
                timeout=200,
            )
        except OpenAIError as e:
            raise HTTPException(status_code=500, detail=str(e))

        full_text = response.choices[0].message.content.strip()

        try:
            print(full_text)
            chunk_days = json.loads(full_text)
            for index, day in enumerate(chunk_days):
                day["day"] = i + index + 1
                for activity in day.get("activities", []):
                    loc = activity.get("location_name", "").strip()
                    if loc:
                        visited_places.add(loc)

            all_days.extend(chunk_days)
        except (json.JSONDecodeError, ValueError) as e:
            raise HTTPException(
                status_code=500,
                detail=f"AI response error on days {sub_start_day}-{sub_end_day}: {str(e)}"
            )

    # חישוב תקציב לפי הטיול המלא
    day_plans = [
        DayPlan(
            day=day["day"],
            activities=[
                ActivityItem(
                    time=act["time"],
                    title=act["title"],
                    description=act["description"],
                    location_name=act["location_name"]
                ) for act in day.get("activities", [])
            ]
        )
        for day in all_days
    ]
    total_budget = calculate_budget_by_ai(destination, num_days, num_travelers, day_plans)

    return all_days, total_budget

# חישוב תקציב טיול
def calculate_budget_by_ai(destination: str, num_days: int, num_travelers: int, trip_plan: List[DayPlan]) -> float:
    trip_description = ""
    for day in trip_plan:
        activities_str = ", ".join([activity.title for activity in day.activities])
        trip_description += f"Day {day.day}: {activities_str}\n"

    prompt = (
        f"Estimate the total trip budget in USD based on the following details:\n"
        f"- Destination: {destination}\n"
        f"- Number of days: {num_days}\n"
        f"- Number of travelers: {num_travelers}\n"
        f"- Itinerary:\n{trip_description}\n\n"
        "Please provide ONLY the estimated total cost in USD as a **single number**, without any explanation, text or symbol."
    )

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=100,
        timeout=30,
    )

    budget_text = response.choices[0].message.content.strip()

    match = re.search(r"\d+(?:[\.,]\d+)?", budget_text)
    if match:
        try:
            return float(match.group(0).replace(",", ""))
        except ValueError:
            pass

    return 0.0

# טיול לפי מזהה
def get_trip_by_id_from_backend(trip_id: int):
    backend_url = f"http://backend:8000/api/trips/{trip_id}"
    response = requests.get(backend_url)

    if response.status_code == 200:
        return response.json()  # מחזיר את פרטי הטיול כמילון
    else:
        raise Exception("Failed to fetch trip from backend.")

# AI קבלת כל הפעילויות של טיול לפי פורמט להעביר ל 
def get_trip_plan_from_backend(trip_id: int):
    backend_url = f"http://backend:8000/api/trips/{trip_id}/activities"
    response = requests.get(backend_url)

    if response.status_code != 200:
        raise Exception("Failed to fetch trip activities from backend.")

    activities_data = response.json()

    days_dict = defaultdict(list)
    for act in activities_data:
        day = act["day_number"]

        # נבנה כל פעילות כאובייקט מסוג ActivityItem
        activity_item = ActivityItem(
            time=act["time"],
            title=act["title"],
            description=act["description"],
            location_name=act["location_name"]
        )

        days_dict[day].append(activity_item)

    trip_plan = [
        DayPlan(day=day, activities=activities)
        for day, activities in sorted(days_dict.items())
    ]

    return trip_plan
