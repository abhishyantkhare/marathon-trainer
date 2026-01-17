from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
import time

from database import get_db
from models import User
from schemas import UserResponse, Token
from auth import StravaOAuth, create_access_token, get_current_user
from config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.get("/strava")
async def strava_login():
    """Redirect to Strava OAuth authorization page."""
    authorization_url = StravaOAuth.get_authorization_url()
    return RedirectResponse(url=authorization_url)


@router.get("/strava/callback")
async def strava_callback(code: str = None, error: str = None, db: Session = Depends(get_db)):
    """Handle Strava OAuth callback."""
    if error:
        return RedirectResponse(url=f"{settings.frontend_url}?error={error}")

    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No authorization code provided"
        )

    try:
        # Exchange code for tokens
        token_data = await StravaOAuth.exchange_code(code)

        strava_id = token_data["athlete"]["id"]
        access_token = token_data["access_token"]
        refresh_token = token_data["refresh_token"]
        expires_at = token_data["expires_at"]

        # Get athlete info
        athlete = token_data.get("athlete", {})

        # Find or create user
        user = db.query(User).filter(User.strava_id == strava_id).first()

        if user:
            # Update tokens
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
                name=f"{athlete.get('firstname', '')} {athlete.get('lastname', '')}".strip(),
                profile_picture=athlete.get("profile"),
            )
            db.add(user)

        db.commit()
        db.refresh(user)

        # Create JWT token
        jwt_token = create_access_token(user.id)

        # Redirect to frontend with token
        response = RedirectResponse(url=f"{settings.frontend_url}/auth/callback?token={jwt_token}")
        return response

    except Exception as e:
        print(f"Strava OAuth error: {e}")
        return RedirectResponse(url=f"{settings.frontend_url}?error=oauth_failed")


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
        has_profile=current_user.profile is not None
    )
