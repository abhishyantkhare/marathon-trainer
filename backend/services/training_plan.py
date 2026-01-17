import json
from datetime import datetime, timedelta
from typing import Optional
import openai

from config import get_settings
from models import User, UserProfile, TrainingPlan

settings = get_settings()


class TrainingPlanService:
    """Service for generating marathon training plans using OpenAI."""

    @staticmethod
    def format_goal_time(minutes: int) -> str:
        """Format goal time from minutes to HH:MM:SS."""
        hours = minutes // 60
        mins = minutes % 60
        return f"{hours}:{mins:02d}:00"

    @staticmethod
    def calculate_weeks_until_race(race_date: datetime) -> int:
        """Calculate weeks until race date."""
        today = datetime.now()
        delta = race_date - today
        weeks = delta.days // 7
        return max(1, weeks)

    @staticmethod
    def calculate_pace_targets(goal_time_minutes: int) -> dict:
        """Calculate various pace targets based on goal time."""
        # Marathon is 42.195 km
        marathon_km = 42.195
        goal_pace_per_km = goal_time_minutes / marathon_km  # minutes per km

        return {
            "goal_pace": f"{int(goal_pace_per_km)}:{int((goal_pace_per_km % 1) * 60):02d}/km",
            "easy_pace": f"{int(goal_pace_per_km + 1)}:{int(((goal_pace_per_km + 1) % 1) * 60):02d}/km - {int(goal_pace_per_km + 1.5)}:{int(((goal_pace_per_km + 1.5) % 1) * 60):02d}/km",
            "tempo_pace": f"{int(goal_pace_per_km - 0.15)}:{int(((goal_pace_per_km - 0.15) % 1) * 60):02d}/km",
            "interval_pace": f"{int(goal_pace_per_km - 0.5)}:{int(((goal_pace_per_km - 0.5) % 1) * 60):02d}/km",
        }

    @staticmethod
    async def generate_plan(user: User, profile: UserProfile, db) -> TrainingPlan:
        """Generate a training plan using OpenAI."""
        weeks_until_race = TrainingPlanService.calculate_weeks_until_race(profile.race_date)
        goal_time = TrainingPlanService.format_goal_time(profile.goal_time_minutes)
        pace_targets = TrainingPlanService.calculate_pace_targets(profile.goal_time_minutes)

        prompt = f"""Generate a detailed marathon training plan with the following parameters:

- Weeks until race: {weeks_until_race}
- Goal time: {goal_time}
- Fitness level: {profile.fitness_level.value}
- Race date: {profile.race_date.strftime('%Y-%m-%d')}
- Today's date: {datetime.now().strftime('%Y-%m-%d')}

Pace targets based on goal:
- Goal marathon pace: {pace_targets['goal_pace']}
- Easy run pace: {pace_targets['easy_pace']}
- Tempo pace: {pace_targets['tempo_pace']}
- Interval pace: {pace_targets['interval_pace']}

Generate a comprehensive week-by-week training plan. For each week, provide daily workouts including:
- Easy runs
- Tempo runs
- Long runs
- Interval training
- Rest days
- Cross-training suggestions

Return the plan as a JSON object with this structure:
{{
  "summary": {{
    "total_weeks": {weeks_until_race},
    "goal_time": "{goal_time}",
    "fitness_level": "{profile.fitness_level.value}",
    "race_date": "{profile.race_date.strftime('%Y-%m-%d')}",
    "pace_targets": {json.dumps(pace_targets)}
  }},
  "weeks": [
    {{
      "week_number": 1,
      "start_date": "YYYY-MM-DD",
      "focus": "Base building / Speed work / Taper / etc",
      "total_distance_km": 40,
      "days": [
        {{
          "day": "Monday",
          "date": "YYYY-MM-DD",
          "workout_type": "easy_run | tempo | long_run | intervals | rest | cross_training",
          "description": "Easy 5km run",
          "distance_km": 5,
          "pace": "5:30/km - 6:00/km",
          "duration_minutes": 30,
          "notes": "Keep heart rate in zone 2"
        }}
      ]
    }}
  ]
}}

Important guidelines:
1. Build mileage progressively (10% rule)
2. Include a 2-3 week taper before race day
3. Place long runs on weekends
4. Include at least 1-2 rest days per week
5. Adjust intensity based on fitness level
6. For beginners: focus on completion, more rest days
7. For intermediate: balance speed and endurance
8. For advanced: higher mileage, more quality sessions

Return ONLY the JSON object, no additional text."""

        client = openai.AsyncOpenAI(api_key=settings.openai_api_key)

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert marathon running coach. Generate detailed, personalized training plans in JSON format."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=4000,
        )

        plan_json = response.choices[0].message.content

        # Clean up the response (remove markdown code blocks if present)
        if plan_json.startswith("```"):
            plan_json = plan_json.split("```")[1]
            if plan_json.startswith("json"):
                plan_json = plan_json[4:]
        if plan_json.endswith("```"):
            plan_json = plan_json[:-3]

        plan_json = plan_json.strip()

        # Validate JSON
        try:
            json.loads(plan_json)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON generated: {e}")

        # Save to database
        training_plan = TrainingPlan(
            user_id=user.id,
            plan_json=plan_json,
        )
        db.add(training_plan)
        db.commit()
        db.refresh(training_plan)

        return training_plan
