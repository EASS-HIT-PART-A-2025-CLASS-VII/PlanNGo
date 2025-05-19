# AI פונקציות שירות הקשורות ל 

import json
from openai import OpenAI
from app.schemas import DayPlan, ActivityItem
from typing import List, Optional, Tuple
import os
import requests
from dotenv import load_dotenv
from collections import defaultdict
import re

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# AI מייצר טיול ותקציב דרך 
def custom_trip_plan(destination: str, num_days: int, num_travelers: int, trip_type: Optional[str] = None) -> Tuple[List[dict], float]:
    prompt = (
        f"Create a detailed {num_days}-day travel itinerary for {num_travelers} travelers in {destination}. "
    )

    if trip_type:
        prompt += f"The trip should focus on the style of '{trip_type}'. "

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
        f"On the last day (Day {num_days}), assume it's a travel day and include packing, check-out, and heading to the airport.\n"
        "After the JSON array, write a single line: Budget: followed by the total estimated cost in USD as a number only (e.g., Budget: 1900)."
    )

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=1800,
        timeout=30,
    )

    full_text = response.choices[0].message.content.strip()

    if "Budget:" in full_text:
        json_part, budget_part = full_text.rsplit("Budget:", 1)
        budget_text = budget_part.strip()
    else:
        json_part = full_text
        budget_text = "0"

    try:
        trip_plan = json.loads(json_part)
    except json.JSONDecodeError:
        raise ValueError("Failed to parse AI response as JSON")

    try:
        estimated_budget = float(budget_text.replace("$", "").replace(",", "").strip())
    except ValueError:
        estimated_budget = 0.0

    return trip_plan, estimated_budget

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

