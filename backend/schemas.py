from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Any
from models import FitnessLevel


# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


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
    goal_time_minutes: int
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
class TrainingPlanResponse(BaseModel):
    id: int
    plan_json: Any  # Will be parsed JSON
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GeneratePlanRequest(BaseModel):
    regenerate: bool = False
