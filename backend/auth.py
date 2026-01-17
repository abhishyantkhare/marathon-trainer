from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import httpx

from config import get_settings
from database import get_db
from models import User

settings = get_settings()
security = HTTPBearer(auto_error=False)


def create_access_token(user_id: int) -> str:
    """Create JWT token for user."""
    expire = datetime.utcnow() + timedelta(hours=settings.jwt_expiration_hours)
    to_encode = {"sub": str(user_id), "exp": expire}
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt


def decode_token(token: str) -> Optional[int]:
    """Decode JWT token and return user_id."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        return int(user_id)
    except JWTError:
        return None


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Try to get token from Authorization header
    token = None
    if credentials:
        token = credentials.credentials

    # Try to get token from cookie if not in header
    if not token:
        token = request.cookies.get("access_token")

    if not token:
        raise credentials_exception

    user_id = decode_token(token)
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    return user


class StravaOAuth:
    """Handle Strava OAuth flow."""

    AUTHORIZE_URL = "https://www.strava.com/oauth/authorize"
    TOKEN_URL = "https://www.strava.com/oauth/token"
    ATHLETE_URL = "https://www.strava.com/api/v3/athlete"

    @staticmethod
    def get_authorization_url() -> str:
        """Generate Strava OAuth authorization URL."""
        params = {
            "client_id": settings.strava_client_id,
            "redirect_uri": settings.strava_redirect_uri,
            "response_type": "code",
            "scope": "read,activity:read_all",
        }
        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{StravaOAuth.AUTHORIZE_URL}?{query_string}"

    @staticmethod
    async def exchange_code(code: str) -> dict:
        """Exchange authorization code for access token."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                StravaOAuth.TOKEN_URL,
                data={
                    "client_id": settings.strava_client_id,
                    "client_secret": settings.strava_client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                },
            )
            response.raise_for_status()
            return response.json()

    @staticmethod
    async def refresh_token(refresh_token: str) -> dict:
        """Refresh access token using refresh token."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                StravaOAuth.TOKEN_URL,
                data={
                    "client_id": settings.strava_client_id,
                    "client_secret": settings.strava_client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            response.raise_for_status()
            return response.json()

    @staticmethod
    async def get_athlete(access_token: str) -> dict:
        """Get authenticated athlete info from Strava."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                StravaOAuth.ATHLETE_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
            return response.json()
