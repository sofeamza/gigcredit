from pydantic import BaseModel, Field
from datetime import datetime

class Score(BaseModel):
    user_id: str
    score_value: int = Field(..., ge=300, le=850)
    model_used: str  # "baseline" or "ml"

    calculated_at: datetime
    expires_at: datetime

    version: str = "v1"