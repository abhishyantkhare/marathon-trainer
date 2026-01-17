from datetime import datetime
from typing import List
import httpx
import time

from models import User, Run
from auth import StravaOAuth
from config import get_settings

settings = get_settings()


class StravaService:
    """Service for interacting with Strava API."""

    ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities"

    @staticmethod
    async def ensure_valid_token(user: User, db) -> str:
        """Ensure user has a valid access token, refreshing if necessary."""
        current_time = int(time.time())

        if user.strava_token_expires_at and user.strava_token_expires_at < current_time:
            # Token expired, refresh it
            token_data = await StravaOAuth.refresh_token(user.strava_refresh_token)
            user.strava_access_token = token_data["access_token"]
            user.strava_refresh_token = token_data["refresh_token"]
            user.strava_token_expires_at = token_data["expires_at"]
            db.commit()

        return user.strava_access_token

    @staticmethod
    async def fetch_activities(access_token: str, page: int = 1, per_page: int = 30) -> List[dict]:
        """Fetch activities from Strava."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                StravaService.ACTIVITIES_URL,
                headers={"Authorization": f"Bearer {access_token}"},
                params={"page": page, "per_page": per_page},
            )
            response.raise_for_status()
            return response.json()

    @staticmethod
    def calculate_pace(distance_meters: int, moving_time_seconds: int) -> str:
        """Calculate pace in min/km format."""
        if distance_meters == 0:
            return "N/A"

        pace_seconds_per_km = (moving_time_seconds / distance_meters) * 1000
        minutes = int(pace_seconds_per_km // 60)
        seconds = int(pace_seconds_per_km % 60)
        return f"{minutes}:{seconds:02d}/km"

    @staticmethod
    async def sync_runs(user: User, db) -> int:
        """Sync running activities from Strava."""
        access_token = await StravaService.ensure_valid_token(user, db)

        synced_count = 0
        page = 1

        while True:
            activities = await StravaService.fetch_activities(access_token, page=page, per_page=50)

            if not activities:
                break

            for activity in activities:
                # Only sync runs
                if activity.get("type") != "Run":
                    continue

                strava_activity_id = activity["id"]

                # Check if already synced
                existing = db.query(Run).filter(Run.strava_activity_id == strava_activity_id).first()
                if existing:
                    continue

                # Calculate pace
                distance = activity.get("distance", 0)
                moving_time = activity.get("moving_time", 0)
                pace = StravaService.calculate_pace(int(distance), moving_time)

                # Create run record
                run = Run(
                    user_id=user.id,
                    strava_activity_id=strava_activity_id,
                    name=activity.get("name"),
                    distance_meters=int(distance),
                    moving_time_seconds=moving_time,
                    start_date=datetime.fromisoformat(activity["start_date_local"].replace("Z", "+00:00")),
                    average_pace=pace,
                    type=activity.get("type"),
                )
                db.add(run)
                synced_count += 1

            page += 1

            # Safety limit - don't fetch more than 10 pages (500 activities)
            if page > 10:
                break

        db.commit()
        return synced_count
