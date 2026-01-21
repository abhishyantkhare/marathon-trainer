"""Enable RLS on all tables

Revision ID: 835c007277ac
Revises: bff1e4113a8a
Create Date: 2026-01-21 15:36:09.004538

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '835c007277ac'
down_revision: Union[str, Sequence[str], None] = 'bff1e4113a8a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = ['users', 'user_profiles', 'training_plans', 'runs']


def upgrade() -> None:
    """Enable RLS on all tables."""
    for table in TABLES:
        # Enable RLS
        op.execute(f'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY')

        # Force RLS for table owners too (important for Supabase)
        op.execute(f'ALTER TABLE {table} FORCE ROW LEVEL SECURITY')


def downgrade() -> None:
    """Disable RLS on all tables."""
    for table in TABLES:
        # Disable forced RLS
        op.execute(f'ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY')

        # Disable RLS
        op.execute(f'ALTER TABLE {table} DISABLE ROW LEVEL SECURITY')
