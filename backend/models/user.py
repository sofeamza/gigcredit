from pydantic import BaseModel, EmailStr
from typing import Literal

class User(BaseModel):
    email: EmailStr
    hashed_password: str
    role: Literal["worker", "admin", "financial_institution"] = "worker"