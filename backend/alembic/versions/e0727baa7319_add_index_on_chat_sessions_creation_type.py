"""Add index on chat_sessions creation_type

Revision ID: e0727baa7319
Revises: 835c007277ac
Create Date: 2026-01-22 18:53:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e0727baa7319'
down_revision: Union[str, Sequence[str], None] = '835c007277ac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add index on creation_type column for chat_sessions table."""
    op.create_index(
        op.f('ix_chat_sessions_creation_type'),
        'chat_sessions',
        ['creation_type'],
        unique=False
    )


def downgrade() -> None:
    """Remove index on creation_type column from chat_sessions table."""
    op.drop_index(op.f('ix_chat_sessions_creation_type'), table_name='chat_sessions')
