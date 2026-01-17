from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Any
from models import FitnessLevel


# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: int


# User schemas
class UserBase(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    profile_picture: Optional[str] = None


class UserResponse(UserBase):
    id: int
    strava_id: int
    created_at: datetime
    has_profile: bool = False

    class Config:
        from_attributes = True


# Profile schemas
class ProfileCreate(BaseModel):
    race_date: datetime
    goal_time_minutes: int = Field(..., gt=0, description="Goal time in minutes")
    fitness_level: FitnessLevel


class ProfileResponse(BaseModel):
    id: int
    race_date: datetime
    goal_time_minutes: int
    fitness_level: FitnessLevel

    class Config:
        from_attributes = True


# Run schemas
class RunResponse(BaseModel):
    id: int
    strava_activity_id: int
    name: Optional[str]
    distance_meters: int
    moving_time_seconds: int
    start_date: datetime
    average_pace: Optional[str]
    type: Optional[str]

    class Config:
        from_attributes = True


class RunsListResponse(BaseModel):
    runs: List[RunResponse]
    total: int


class SyncResponse(BaseModel):
    synced_count: int
    message: str


# Training Plan schemas
class WorkoutDay(BaseModel):
    day: str  # e.g., "Monday"
    workout_type: str  # e.g., "easy_run", "tempo", "long_run", "intervals", "rest"
    description: str
    distance_km: Optional[float] = None
    pace_target: Optional[str] = None  # e.g., "5:30-5:45 per km"
    notes: Optional[str] = None


class TrainingWeek(BaseModel):
    week_number: int
    start_date: str
    end_date: str
    theme: str  # e.g., "Base Building", "Peak Week", "Taper"
    total_distance_km: float
    workouts: List[WorkoutDay]


class TrainingPlanData(BaseModel):
    race_name: str
    race_date: str
    goal_time: str
    total_weeks: int
    weeks: List[TrainingWeek]
    notes: Optional[str] = None


class TrainingPlanResponse(BaseModel):
    id: int
    plan: TrainingPlanData
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GeneratePlanRequest(BaseModel):
    regenerate: bool = False  # If true, regenerate even if plan exists
