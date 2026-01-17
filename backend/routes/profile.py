from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import User, UserProfile
from schemas import ProfileCreate, ProfileResponse
from auth import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.post("", response_model=ProfileResponse)
async def create_or_update_profile(
    profile_data: ProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update user profile with race details."""
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if profile:
        # Update existing profile
        profile.race_date = profile_data.race_date
        profile.goal_time_minutes = profile_data.goal_time_minutes
        profile.fitness_level = profile_data.fitness_level
    else:
        # Create new profile
        profile = UserProfile(
            user_id=current_user.id,
            race_date=profile_data.race_date,
            goal_time_minutes=profile_data.goal_time_minutes,
            fitness_level=profile_data.fitness_level,
        )
        db.add(profile)

    await db.commit()
    await db.refresh(profile)

    return ProfileResponse(
        id=profile.id,
        race_date=profile.race_date,
        goal_time_minutes=profile.goal_time_minutes,
        fitness_level=profile.fitness_level,
    )


@router.get("", response_model=ProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's profile."""
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Please complete onboarding.",
        )

    return ProfileResponse(
        id=profile.id,
        race_date=profile.race_date,
        goal_time_minutes=profile.goal_time_minutes,
        fitness_level=profile.fitness_level,
    )
