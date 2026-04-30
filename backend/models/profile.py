from pydantic import BaseModel, Field
from typing import List

class Profile(BaseModel):
    user_id: str
    platform_name: str

    task_completion_rate: float = Field(..., ge=0.0, le=1.0)
    gps_consistency: float = Field(..., ge=0.0, le=1.0)
    customer_rating: float = Field(..., ge=1.0, le=5.0)
    platform_diversity: int = Field(..., ge=1)

    daily_earnings: List[float]