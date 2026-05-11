from fastapi import FastAPI
from config import users_col, profiles_col, scores_col, explanations_col

from routes.auth import router as auth_router
from routes.score import router as score_router
from routes.simulation import router as simulation_router
from routes.data import router as data_router

app = FastAPI(title="GigCredit API")

app.include_router(auth_router)
app.include_router(score_router)
app.include_router(simulation_router)
app.include_router(data_router)


@app.on_event("startup")
def create_indexes():
    users_col.create_index("email", unique=True)
    profiles_col.create_index([("user_id", 1), ("platform_name", 1)])
    scores_col.create_index([("user_id", 1), ("calculated_at", -1)])
    explanations_col.create_index("score_id")

    print("Indexes created successfully")


@app.get("/health")
def health_check():
    return {"status": "ok"}