from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field
from config import users_col
from services.auth_service import hash_password, verify_password, create_token
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Auth"])

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=72)

@router.post("/register")
def register(req: RegisterRequest):

    existing = users_col.find_one({"email": req.email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    hashed = hash_password(req.password)

    users_col.insert_one({
        "email": req.email,
        "hashed_password": hashed,
        "role": "worker",
        "created_at": datetime.utcnow(),
    })

    token = create_token({"email": req.email})

    return {"message": "User created", "token": token}

@router.post("/login")
def login(req: LoginRequest):

    user = users_col.find_one({"email": req.email})

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token({"email": req.email})

    return {"message": "Login successful", "token": token}

from services.auth_service import get_current_user
from fastapi import Depends

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    user = users_col.find_one(
        {"email": current_user["email"]},
        {"_id": 0, "email": 1, "role": 1}
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user