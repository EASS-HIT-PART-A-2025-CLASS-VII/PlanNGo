# AI פונקציות שירות הקשורות ל 

import json
from openai import OpenAI, OpenAIError
from app.schemas import DayPlan, ActivityItem
from typing import List, Optional, Tuple, Generator
import os
import requests
from dotenv import load_dotenv
from fastapi import HTTPException
from collections import defaultdict
import re

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def custom_trip_plan(
    destination: str,
    num_days: int,
    num_travelers: int,
    trip_type: Optional[str] = None
) -> Generator[Tuple[List[dict], float], None, None]:
    MAX_DAYS_PER_REQUEST = 10

    visited_places = set()

    for i in range(0, num_days, MAX_DAYS_PER_REQUEST):
        sub_start_day = i + 1
        sub_end_day = min(i + MAX_DAYS_PER_REQUEST, num_days)
        sub_days = sub_end_day - sub_start_day + 1

        prompt = (
            f"You are a professional travel planner. Create a detailed and realistic {sub_days}-day travel itinerary "
            f"for {num_travelers} travelers visiting {destination}. "
        )

        if trip_type:
            prompt += f"The trip should match the style: '{trip_type}'. "

        if visited_places:
            visited_text = ", ".join(sorted(visited_places))
            prompt += f"Avoid repeating the following places already visited in earlier days: {visited_text}. "

        prompt += (
            "Each day must include 5 to 7 activities, scheduled from around 08:00 to 21:00, covering a full day. "
            "Ensure a natural flow with a mix of sightseeing, culture, nature, relaxation, local cuisine, and transport as needed. "
            "Group nearby activities together to minimize travel time. Avoid placing far-apart locations back-to-back. "
            "Every activity must include the following fields:\n"
            "- time: in HH:MM format (e.g., 08:30)\n"
            "- title: short, descriptive name of the activity\n"
            "- description: 1–2 short sentences explaining the activity\n"
            "- location_name: a specific, realistic place in or near the destination\n\n"
            "Return the result as a JSON array of days, in the exact structure below:\n"
            "[\n"
            "  {\n"
            "    \"day\": 1,\n"
            "    \"activities\": [\n"
            "      {\n"
            "        \"time\": \"08:30\",\n"
            "        \"title\": \"Explore the Grand Palace\",\n"
            "        \"description\": \"Visit the iconic Grand Palace and learn about Thai royal history.\",\n"
            "        \"location_name\": \"The Grand Palace, Bangkok\"\n"
            "      },\n"
            "      ...\n"
            "    ]\n"
            "  },\n"
            "  ...\n"
            "]\n\n"
        )

        if sub_end_day == num_days:
            prompt += f"On the final day (Day {sub_days}), include packing, hotel check-out, and transfer to the airport.\n"

        prompt += "After the JSON, add one line only: Budget: XXXX (estimated cost in USD for this segment only)."

        try:
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=4000,
                timeout=120,
            )
        except OpenAIError as e:
            raise HTTPException(status_code=500, detail=str(e)) 

        full_text = response.choices[0].message.content.strip()

        if "Budget:" in full_text:
            json_part, budget_part = full_text.rsplit("Budget:", 1)
            budget_text = budget_part.strip()
        else:
            json_part = full_text
            budget_text = "0"

        try:
            chunk_days = json.loads(json_part)
            for day in chunk_days:
                day["day"] += i
                for activity in day.get("activities", []):
                    name = activity.get("location_name", "").strip()
                    if name:
                        visited_places.add(name)

            budget_value = float(budget_text.replace("$", "").replace(",", "").strip())
        except (json.JSONDecodeError, ValueError) as e:
            raise HTTPException(status_code=500, detail=f"AI response error on days {sub_start_day}-{sub_end_day}: {str(e)}")

        yield chunk_days, budget_value

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

