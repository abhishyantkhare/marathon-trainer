from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime
from database import get_db
from models import User, Run
from schemas import RunResponse, RunsListResponse, SyncResponse
from auth import get_current_user
from services.strava import refresh_strava_token, fetch_strava_activities, calculate_pace

router = APIRouter(prefix="/api/runs", tags=["runs"])


@router.get("", response_model=RunsListResponse)
async def get_runs(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's synced runs."""
    result = await db.execute(
        select(Run)
        .where(Run.user_id == current_user.id)
        .order_by(desc(Run.start_date))
        .limit(limit)
        .offset(offset)
    )
    runs = result.scalars().all()

    # Get total count
    count_result = await db.execute(
        select(Run).where(Run.user_id == current_user.id)
    )
    total = len(count_result.scalars().all())

    return RunsListResponse(
        runs=[
            RunResponse(
                id=run.id,
                strava_activity_id=run.strava_activity_id,
                name=run.name,
                distance_meters=run.distance_meters,
                moving_time_seconds=run.moving_time_seconds,
                start_date=run.start_date,
                average_pace=run.average_pace,
                type=run.type,
            )
            for run in runs
        ],
        total=total,
    )


@router.post("/sync", response_model=SyncResponse)
async def sync_runs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Sync runs from Strava."""
    if not current_user.strava_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Strava not connected",
        )

    try:
        # Refresh token if needed
        access_token = await refresh_strava_token(current_user, db)

        # Get the latest run we have to avoid duplicates
        result = await db.execute(
            select(Run)
            .where(Run.user_id == current_user.id)
            .order_by(desc(Run.start_date))
            .limit(1)
        )
        latest_run = result.scalar_one_or_none()

        # Fetch activities from Strava
        after_timestamp = None
        if latest_run:
            after_timestamp = int(latest_run.start_date.timestamp())

        activities = await fetch_strava_activities(
            access_token=access_token,
            per_page=100,
            after=after_timestamp,
        )

        # Filter to only running activities
        run_types = ["Run", "TrailRun", "VirtualRun", "Treadmill"]
        running_activities = [a for a in activities if a.get("type") in run_types]

        synced_count = 0
        for activity in running_activities:
            # Check if already exists
            result = await db.execute(
                select(Run).where(Run.strava_activity_id == activity["id"])
            )
            existing = result.scalar_one_or_none()

            if not existing:
                distance = int(activity.get("distance", 0))
                moving_time = int(activity.get("moving_time", 0))

                run = Run(
                    user_id=current_user.id,
                    strava_activity_id=activity["id"],
                    name=activity.get("name"),
                    distance_meters=distance,
                    moving_time_seconds=moving_time,
                    start_date=datetime.fromisoformat(
                        activity["start_date"].replace("Z", "+00:00")
                    ),
                    average_pace=calculate_pace(distance, moving_time),
                    type=activity.get("type"),
                )
                db.add(run)
                synced_count += 1

        await db.commit()

        return SyncResponse(
            synced_count=synced_count,
            message=f"Successfully synced {synced_count} new runs from Strava",
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync runs: {str(e)}",
        )
