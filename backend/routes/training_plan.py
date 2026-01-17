from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import json

from database import get_db
from models import User, UserProfile, TrainingPlan
from schemas import TrainingPlanResponse, GeneratePlanRequest
from auth import get_current_user
from services.training_plan import TrainingPlanService

router = APIRouter(prefix="/api/training-plan", tags=["training-plan"])


@router.get("", response_model=TrainingPlanResponse)
async def get_training_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's current training plan."""
    plan = db.query(TrainingPlan).filter(
        TrainingPlan.user_id == current_user.id
    ).order_by(TrainingPlan.created_at.desc()).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No training plan found. Generate one first."
        )

    return TrainingPlanResponse(
        id=plan.id,
        plan_json=json.loads(plan.plan_json),
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


@router.post("/generate", response_model=TrainingPlanResponse)
async def generate_training_plan(
    request: GeneratePlanRequest = GeneratePlanRequest(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a new training plan using AI."""
    # Check if user has a profile
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete your profile first"
        )

    # Check for existing plan if not regenerating
    if not request.regenerate:
        existing_plan = db.query(TrainingPlan).filter(
            TrainingPlan.user_id == current_user.id
        ).first()
        if existing_plan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Training plan already exists. Set regenerate=true to create a new one."
            )

    try:
        plan = await TrainingPlanService.generate_plan(current_user, profile, db)
        return TrainingPlanResponse(
            id=plan.id,
            plan_json=json.loads(plan.plan_json),
            created_at=plan.created_at,
            updated_at=plan.updated_at,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate training plan: {str(e)}"
        )
