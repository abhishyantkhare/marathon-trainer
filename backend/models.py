from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, BigInteger, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class FitnessLevel(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    strava_id = Column(BigInteger, unique=True, index=True, nullable=False)
    strava_access_token = Column(String(255), nullable=True)
    strava_refresh_token = Column(String(255), nullable=True)
    strava_token_expires_at = Column(Integer, nullable=True)
    email = Column(String(255), nullable=True)
    name = Column(String(255), nullable=True)
    profile_picture = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False)
    training_plans = relationship("TrainingPlan", back_populates="user")
    runs = relationship("Run", back_populates="user")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    race_date = Column(DateTime(timezone=True), nullable=False)
    goal_time_minutes = Column(Integer, nullable=False)  # Total minutes for marathon
    fitness_level = Column(SQLEnum(FitnessLevel), nullable=False)

    # Relationships
    user = relationship("User", back_populates="profile")


class TrainingPlan(Base):
    __tablename__ = "training_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_json = Column(Text, nullable=False)  # JSON string of the full plan
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="training_plans")


class Run(Base):
    __tablename__ = "runs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    strava_activity_id = Column(BigInteger, unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=True)
    distance_meters = Column(Integer, nullable=False)
    moving_time_seconds = Column(Integer, nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    average_pace = Column(String(50), nullable=True)  # e.g., "5:30/km"
    type = Column(String(50), nullable=True)

    # Relationships
    user = relationship("User", back_populates="runs")
