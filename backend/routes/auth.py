from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
from database import get_db
from models import User
from schemas import UserResponse, Token
from auth import create_access_token, get_current_user
from config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize"
STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token"
STRAVA_ATHLETE_URL = "https://www.strava.com/api/v3/athlete"


@router.get("/strava")
async def strava_login():
    """Redirect to Strava OAuth authorization page."""
    if not settings.strava_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Strava client ID not configured"
        )

    params = {
        "client_id": settings.strava_client_id,
        "response_type": "code",
        "redirect_uri": settings.strava_redirect_uri,
        "scope": "read,activity:read_all,profile:read_all",
        "approval_prompt": "auto",
    }
    auth_url = f"{STRAVA_AUTH_URL}?{'&'.join(f'{k}={v}' for k, v in params.items())}"
    return RedirectResponse(url=auth_url)


@router.get("/strava/callback")
async def strava_callback(code: str, db: AsyncSession = Depends(get_db)):
    """Handle Strava OAuth callback, create/update user, return JWT."""
    if not settings.strava_client_id or not settings.strava_client_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Strava credentials not configured"
        )

    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            STRAVA_TOKEN_URL,
            data={
                "client_id": settings.strava_client_id,
                "client_secret": settings.strava_client_secret,
                "code": code,
                "grant_type": "authorization_code",
            },
        )

        if token_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange code for token"
            )

        token_data = token_response.json()

    strava_id = token_data["athlete"]["id"]
    access_token = token_data["access_token"]
    refresh_token = token_data["refresh_token"]
    expires_at = token_data["expires_at"]
    athlete = token_data["athlete"]

    # Check if user exists
    result = await db.execute(select(User).where(User.strava_id == strava_id))
    user = result.scalar_one_or_none()

    if user:
        # Update existing user's tokens
        user.strava_access_token = access_token
        user.strava_refresh_token = refresh_token
        user.strava_token_expires_at = expires_at
        user.name = f"{athlete.get('firstname', '')} {athlete.get('lastname', '')}".strip()
        user.profile_picture = athlete.get("profile")
    else:
        # Create new user
        user = User(
            strava_id=strava_id,
            strava_access_token=access_token,
            strava_refresh_token=refresh_token,
            strava_token_expires_at=expires_at,
            email=None,  # Strava doesn't provide email in basic scope
            name=f"{athlete.get('firstname', '')} {athlete.get('lastname', '')}".strip(),
            profile_picture=athlete.get("profile"),
        )
        db.add(user)

    await db.commit()
    await db.refresh(user)

    # Create JWT token
    jwt_token = create_access_token(user.id)

    # Redirect to frontend with token in cookie
    response = RedirectResponse(url=f"{settings.frontend_url}/auth/callback")
    response.set_cookie(
        key="access_token",
        value=jwt_token,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
        max_age=settings.jwt_expiration_hours * 3600,
    )
    return response


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    return UserResponse(
        id=current_user.id,
        strava_id=current_user.strava_id,
        email=current_user.email,
        name=current_user.name,
        profile_picture=current_user.profile_picture,
        created_at=current_user.created_at,
        has_profile=current_user.profile is not None,
    )


@router.post("/logout")
async def logout():
    """Logout user by clearing the cookie."""
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie(key="access_token")
    return response
