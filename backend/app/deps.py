"""
TEMPORARY. Phase 2 replaces this with real JWT auth + workspace scoping.
This exists only so future code has a stable function signature to call.
"""
import uuid

DEV_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

def get_current_user_id() -> uuid.UUID:
    return DEV_USER_ID
