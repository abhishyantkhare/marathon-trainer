import httpx
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from models import User
from config import get_settings

settings = get_settings()

STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token"
STRAVA_ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities"


async def refresh_strava_token(user: User, db: AsyncSession) -> str:
    """Refresh Strava access token if expired."""
    current_time = int(datetime.utcnow().timestamp())

    # Check if token is expired (with 5 minute buffer)
    if user.strava_token_expires_at and user.strava_token_expires_at > current_time + 300:
        return user.strava_access_token

    # Refresh the token
    async with httpx.AsyncClient() as client:
        response = await client.post(
            STRAVA_TOKEN_URL,
            data={
                "client_id": settings.strava_client_id,
                "client_secret": settings.strava_client_secret,
                "grant_type": "refresh_token",
                "refresh_token": user.strava_refresh_token,
            },
        )

        if response.status_code != 200:
            raise Exception("Failed to refresh Strava token")

        token_data = response.json()

    # Update user tokens
    user.strava_access_token = token_data["access_token"]
    user.strava_refresh_token = token_data["refresh_token"]
    user.strava_token_expires_at = token_data["expires_at"]
    await db.commit()

    return user.strava_access_token


async def fetch_strava_activities(
    access_token: str,
    per_page: int = 100,
    page: int = 1,
    after: int = None,
) -> List[Dict[str, Any]]:
    """Fetch activities from Strava API."""
    params = {
        "per_page": per_page,
        "page": page,
    }
    if after:
        params["after"] = after

    async with httpx.AsyncClient() as client:
        response = await client.get(
            STRAVA_ACTIVITIES_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            params=params,
        )

        if response.status_code != 200:
            raise Exception(f"Failed to fetch activities: {response.text}")

        return response.json()


def calculate_pace(distance_meters: int, time_seconds: int) -> str:
    """Calculate pace in MM:SS per km format."""
    if distance_meters == 0:
        return "N/A"

    # Calculate seconds per km
    seconds_per_km = (time_seconds / distance_meters) * 1000
    minutes = int(seconds_per_km // 60)
    seconds = int(seconds_per_km % 60)

    return f"{minutes}:{seconds:02d}/km"
