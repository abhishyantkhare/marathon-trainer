import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from openai import AsyncOpenAI
from models import FitnessLevel
from config import get_settings

settings = get_settings()


class Workout(BaseModel):
    day: str
    workout_type: str
    description: str
    distance_km: Optional[float]
    pace_target: Optional[str]
    notes: Optional[str]


class TrainingWeek(BaseModel):
    week_number: int
    start_date: str
    end_date: str
    theme: str
    total_distance_km: float
    workouts: List[Workout]


class TrainingPlan(BaseModel):
    race_name: str
    race_date: str
    goal_time: str
    total_weeks: int
    weeks: List[TrainingWeek]
    notes: str


def format_goal_time(minutes: int) -> str:
    """Convert minutes to HH:MM:SS format."""
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours}:{mins:02d}:00"


def get_target_paces(goal_time_minutes: int) -> Dict[str, str]:
    """Calculate target paces based on goal marathon time."""
    # Marathon distance in miles
    marathon_miles = 26.2188

    # Goal pace in seconds per mile
    goal_pace_sec = (goal_time_minutes * 60) / marathon_miles

    # Different training paces (as percentage of goal pace)
    paces = {
        "easy": goal_pace_sec * 1.25,  # 25% slower than goal
        "long_run": goal_pace_sec * 1.15,  # 15% slower than goal
        "tempo": goal_pace_sec * 1.05,  # 5% slower than goal
        "intervals": goal_pace_sec * 0.90,  # 10% faster than goal
        "race": goal_pace_sec,
    }

    # Convert to MM:SS format per mile
    formatted = {}
    for pace_type, seconds in paces.items():
        mins = int(seconds // 60)
        secs = int(seconds % 60)
        formatted[pace_type] = f"{mins}:{secs:02d}/mi"

    return formatted


async def generate_training_plan(
    race_date: datetime,
    goal_time_minutes: int,
    fitness_level: FitnessLevel,
) -> Dict[str, Any]:
    """Generate a marathon training plan using OpenAI."""

    # Calculate weeks until race
    today = datetime.now().date()
    race_day = race_date.date()
    days_until_race = (race_day - today).days
    weeks_until_race = max(1, days_until_race // 7)

    # Get target paces
    paces = get_target_paces(goal_time_minutes)
    goal_time_str = format_goal_time(goal_time_minutes)

    # Weekly mileage recommendations based on fitness level (in miles)
    mileage_guide = {
        FitnessLevel.beginner: {"start": 15, "peak": 35, "taper": 20},
        FitnessLevel.intermediate: {"start": 25, "peak": 45, "taper": 25},
        FitnessLevel.advanced: {"start": 35, "peak": 60, "taper": 30},
    }

    mileage = mileage_guide[fitness_level]

    prompt = f"""Generate a detailed {weeks_until_race}-week marathon training plan in JSON format.

Runner Profile:
- Race Date: {race_date.strftime('%Y-%m-%d')}
- Goal Time: {goal_time_str} ({goal_time_minutes} minutes)
- Fitness Level: {fitness_level.value}
- Weeks until race: {weeks_until_race}

Target Paces:
- Easy runs: {paces['easy']}
- Long runs: {paces['long_run']}
- Tempo runs: {paces['tempo']}
- Intervals: {paces['intervals']}
- Race pace: {paces['race']}

Weekly Mileage Guidelines:
- Starting: ~{mileage['start']} miles/week
- Peak (around week {max(1, weeks_until_race - 3)}): ~{mileage['peak']} miles/week
- Taper (final 2-3 weeks): ~{mileage['taper']} miles/week

IMPORTANT: All distances should be in MILES, and all paces should be in minutes per MILE (e.g., "8:30/mi").

Generate a JSON object with this exact structure:
{{
  "race_name": "Marathon",
  "race_date": "{race_date.strftime('%Y-%m-%d')}",
  "goal_time": "{goal_time_str}",
  "total_weeks": {weeks_until_race},
  "weeks": [
    {{
      "week_number": 1,
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "theme": "Base Building",
      "total_distance_km": 22.0,
      "workouts": [
        {{
          "day": "Monday",
          "workout_type": "rest",
          "description": "Complete rest or light stretching",
          "distance_km": null,
          "pace_target": null,
          "notes": "Recovery day"
        }},
        {{
          "day": "Tuesday",
          "workout_type": "easy_run",
          "description": "Easy aerobic run",
          "distance_km": 5.0,
          "pace_target": "{paces['easy']}",
          "notes": "Keep heart rate in zone 2"
        }}
        // ... other days
      ]
    }}
    // ... other weeks
  ],
  "notes": "General training notes and advice"
}}

NOTE: The field is called "distance_km" but use MILES for all values. The field name is kept for compatibility.

Workout types: easy_run, tempo, long_run, intervals, rest, cross_training

Important guidelines:
1. Include a long run every weekend (Sunday preferred)
2. Include one quality workout per week (tempo or intervals)
3. Include 1-2 rest days per week
4. Gradually build mileage (max 10% increase per week)
5. Include a 3-week taper before race day
6. The final week should be very light with the race on the last day
7. Calculate start_date and end_date for each week starting from today ({today.strftime('%Y-%m-%d')})

Return ONLY valid JSON, no additional text or markdown."""

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    try:
        response = await client.beta.chat.completions.parse(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert marathon running coach. Generate detailed, scientifically-backed training plans.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=16384,
            response_format=TrainingPlan,
        )

        plan = response.choices[0].message.parsed
        return plan.model_dump()

    except Exception as e:
        print(f"OpenAI API error: {str(e)}")
        return generate_fallback_plan(race_date, goal_time_minutes, weeks_until_race, paces)


def generate_fallback_plan(
    race_date: datetime,
    goal_time_minutes: int,
    weeks: int,
    paces: Dict[str, str],
) -> Dict[str, Any]:
    """Generate a basic training plan template as fallback."""
    today = datetime.now().date()
    goal_time_str = format_goal_time(goal_time_minutes)

    plan_weeks = []
    for week_num in range(1, weeks + 1):
        week_start = today + timedelta(weeks=week_num - 1)
        week_end = week_start + timedelta(days=6)

        # Determine week theme (distances in miles)
        if week_num <= weeks // 3:
            theme = "Base Building"
        elif week_num <= weeks - 3:
            theme = "Build Phase"
        elif week_num == weeks:
            theme = "Race Week"
        else:
            theme = "Taper"

        # Adjust for progression
        multiplier = min(1.0 + (week_num - 1) * 0.05, 1.5) if week_num <= weeks - 3 else 0.6

        # Distances in miles
        workouts = [
            {
                "day": "Monday",
                "workout_type": "rest",
                "description": "Rest day",
                "distance_km": None,
                "pace_target": None,
                "notes": "Recovery",
            },
            {
                "day": "Tuesday",
                "workout_type": "easy_run",
                "description": "Easy run",
                "distance_km": round(5 * multiplier, 1),
                "pace_target": paces["easy"],
                "notes": None,
            },
            {
                "day": "Wednesday",
                "workout_type": "tempo" if week_num % 2 == 0 else "intervals",
                "description": "Quality workout",
                "distance_km": round(6 * multiplier, 1),
                "pace_target": paces["tempo"] if week_num % 2 == 0 else paces["intervals"],
                "notes": "Key workout of the week",
            },
            {
                "day": "Thursday",
                "workout_type": "easy_run",
                "description": "Recovery run",
                "distance_km": round(4 * multiplier, 1),
                "pace_target": paces["easy"],
                "notes": None,
            },
            {
                "day": "Friday",
                "workout_type": "rest",
                "description": "Rest day",
                "distance_km": None,
                "pace_target": None,
                "notes": None,
            },
            {
                "day": "Saturday",
                "workout_type": "easy_run",
                "description": "Easy run",
                "distance_km": round(5 * multiplier, 1),
                "pace_target": paces["easy"],
                "notes": None,
            },
            {
                "day": "Sunday",
                "workout_type": "long_run",
                "description": "Long run",
                "distance_km": round(12 * multiplier, 1),
                "pace_target": paces["long_run"],
                "notes": "Build endurance",
            },
        ]

        total_km = sum(w["distance_km"] or 0 for w in workouts)

        plan_weeks.append({
            "week_number": week_num,
            "start_date": week_start.strftime("%Y-%m-%d"),
            "end_date": week_end.strftime("%Y-%m-%d"),
            "theme": theme,
            "total_distance_km": round(total_km, 1),
            "workouts": workouts,
        })

    return {
        "race_name": "Marathon",
        "race_date": race_date.strftime("%Y-%m-%d"),
        "goal_time": goal_time_str,
        "total_weeks": weeks,
        "weeks": plan_weeks,
        "notes": "This is a fallback training plan. Consider regenerating with AI for a more personalized plan.",
    }
