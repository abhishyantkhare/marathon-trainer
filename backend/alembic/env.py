from logging.config import fileConfig
import os
import sys

from sqlalchemy import engine_from_config, pool, MetaData
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv

from alembic import context

# Load .env file
load_dotenv()

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# this is the Alembic Config object
config = context.config

# Set the database URL from environment variable
# Convert asyncpg to psycopg2 for sync migrations
database_url = os.getenv("DATABASE_URL", "")
if database_url.startswith("postgresql+asyncpg://"):
    database_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
config.set_main_option("sqlalchemy.url", database_url)

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import models AFTER setting up the URL to get metadata
# We need to create a separate Base to avoid the async engine issue
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, BigInteger, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

Base = declarative_base()

class FitnessLevel(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"

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

class UserProfile(Base):
    __tablename__ = "user_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    race_date = Column(DateTime(timezone=True), nullable=False)
    goal_time_minutes = Column(Integer, nullable=False)
    fitness_level = Column(SQLEnum(FitnessLevel), nullable=False)

class TrainingPlan(Base):
    __tablename__ = "training_plans"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_json = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Run(Base):
    __tablename__ = "runs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    strava_activity_id = Column(BigInteger, unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=True)
    distance_meters = Column(Integer, nullable=False)
    moving_time_seconds = Column(Integer, nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    average_pace = Column(String(50), nullable=True)
    type = Column(String(50), nullable=True)

# Set target metadata for autogenerate support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
