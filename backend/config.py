import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

class Settings:
    MONGO_URI = os.getenv("MONGO_URI")
    DB_NAME = "TransparentCreditScoringDB"

settings = Settings()

client = MongoClient(settings.MONGO_URI)
db = client[settings.DB_NAME]

# Collections
users_col = db["users"]
profiles_col = db["profiles"]
scores_col = db["scores"]
explanations_col = db["explanations"]
fi_access_logs_col = db["fi_access_logs"]
upload_batches_col = db["upload_batches"]
daily_records_col  = db["daily_records"]