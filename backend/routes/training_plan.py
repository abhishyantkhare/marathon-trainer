import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from database import get_db
from models import User, UserProfile, TrainingPlan
from schemas import TrainingPlanResponse, TrainingPlanData, GeneratePlanRequest
from auth import get_current_user
from services.training_plan import generate_training_plan

router = APIRouter(prefix="/api/training-plan", tags=["training-plan"])


@router.post("/generate", response_model=TrainingPlanResponse)
async def generate_plan(
    request: GeneratePlanRequest = GeneratePlanRequest(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a new training plan using OpenAI."""
    # Get user profile
    profile_result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete your profile first (race date, goal time, fitness level)",
        )

    # Check if plan already exists
    if not request.regenerate:
        existing_result = await db.execute(
            select(TrainingPlan)
            .where(TrainingPlan.user_id == current_user.id)
            .order_by(desc(TrainingPlan.created_at))
            .limit(1)
        )
        existing_plan = existing_result.scalar_one_or_none()

        if existing_plan:
            plan_data = json.loads(existing_plan.plan_json)
            return TrainingPlanResponse(
                id=existing_plan.id,
                plan=TrainingPlanData(**plan_data),
                created_at=existing_plan.created_at.isoformat(),
                updated_at=existing_plan.updated_at.isoformat(),
            )

    try:
        # Generate new plan with OpenAI
        plan_data = await generate_training_plan(
            race_date=profile.race_date,
            goal_time_minutes=profile.goal_time_minutes,
            fitness_level=profile.fitness_level,
        )

        # Save plan to database
        plan = TrainingPlan(
            user_id=current_user.id,
            plan_json=json.dumps(plan_data),
        )
        db.add(plan)
        await db.commit()
        await db.refresh(plan)

        return TrainingPlanResponse(
            id=plan.id,
            plan=TrainingPlanData(**plan_data),
            created_at=plan.created_at.isoformat(),
            updated_at=plan.updated_at.isoformat(),
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate training plan: {str(e)}",
        )


@router.get("", response_model=TrainingPlanResponse)
async def get_training_plan(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current training plan."""
    result = await db.execute(
        select(TrainingPlan)
        .where(TrainingPlan.user_id == current_user.id)
        .order_by(desc(TrainingPlan.created_at))
        .limit(1)
    )
    plan = result.scalar_one_or_none()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No training plan found. Please generate one first.",
        )

    plan_data = json.loads(plan.plan_json)
    return TrainingPlanResponse(
        id=plan.id,
        plan=TrainingPlanData(**plan_data),
        created_at=plan.created_at.isoformat(),
        updated_at=plan.updated_at.isoformat(),
    )
