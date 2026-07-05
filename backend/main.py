from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import users_col, profiles_col, scores_col, explanations_col, fi_access_logs_col, upload_batches_col

from routes.auth import router as auth_router
from routes.score import router as score_router
from routes.simulation import router as simulation_router
from routes.data import router as data_router

app = FastAPI(title="GigCredit API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
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
    fi_access_logs_col.create_index([("fi_email", 1), ("accessed_at", -1)])
    upload_batches_col.create_index([("user_email", 1), ("uploaded_at", -1)])

    print("Indexes created successfully")


@app.get("/health")
def health_check():
    return {"status": "ok"}

from routes.admin import router as admin_router

app.include_router(admin_router)