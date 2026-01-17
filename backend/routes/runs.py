from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import User, Run
from schemas import RunResponse, RunsListResponse, SyncResponse
from auth import get_current_user
from services.strava import StravaService

router = APIRouter(prefix="/api/runs", tags=["runs"])


@router.get("", response_model=RunsListResponse)
async def get_runs(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's synced runs."""
    runs_query = db.query(Run).filter(Run.user_id == current_user.id)
    total = runs_query.count()

    runs = runs_query.order_by(Run.start_date.desc()).offset(skip).limit(limit).all()

    return RunsListResponse(
        runs=[RunResponse.model_validate(run) for run in runs],
        total=total
    )


@router.post("/sync", response_model=SyncResponse)
async def sync_runs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sync runs from Strava."""
    if not current_user.strava_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Strava connection found"
        )

    try:
        synced_count = await StravaService.sync_runs(current_user, db)
        return SyncResponse(
            synced_count=synced_count,
            message=f"Successfully synced {synced_count} new runs"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync runs: {str(e)}"
        )
