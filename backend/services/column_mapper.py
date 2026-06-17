import re
from difflib import get_close_matches

REQUIRED_COLUMNS = [
    "worker_id",
    "platform",
    "month",
    "total_tasks_assigned",
    "tasks_completed",
    "cancellation_rate",
    "avg_rating",
    "active_days",
    "gps_consistency",
    "total_earnings",
]

COLUMN_ALIASES = {
    "worker_id": ["worker_id", "driver_id", "rider_id", "partner_id", "user_id", "id"],
    "platform": ["platform", "app", "source", "service", "company"],
    "month": ["month", "date", "period", "statement_month"],
    "total_tasks_assigned": ["total_tasks_assigned", "total_jobs", "assigned_orders", "total_orders", "orders_received"],
    "tasks_completed": ["tasks_completed", "completed_jobs", "completed_orders", "successful_orders", "orders_completed"],
    "cancellation_rate": ["cancellation_rate", "cancel_rate", "cancelled_rate", "cancellations"],
    "avg_rating": ["avg_rating", "rating", "average_rating", "customer_rating", "stars"],
    "active_days": ["active_days", "days_worked", "working_days", "online_days"],
    "gps_consistency": ["gps_consistency", "gps_score", "location_score", "attendance_score"],
    "total_earnings": ["total_earnings", "earnings", "income", "net_earnings", "gross_earnings", "payout"],
}


def normalize_name(name: str) -> str:
    name = name.lower().strip()
    name = re.sub(r"[^a-z0-9]+", "_", name)
    return name.strip("_")


def auto_map_columns(uploaded_columns):
    normalized_uploaded = {
        normalize_name(col): col for col in uploaded_columns
    }

    mapping = {}
    missing = []

    for standard_col, aliases in COLUMN_ALIASES.items():
        normalized_aliases = [normalize_name(alias) for alias in aliases]

        matched_col = None

        for alias in normalized_aliases:
            if alias in normalized_uploaded:
                matched_col = normalized_uploaded[alias]
                break

        if not matched_col:
            close = get_close_matches(
                standard_col,
                normalized_uploaded.keys(),
                n=1,
                cutoff=0.75
            )

            if close:
                matched_col = normalized_uploaded[close[0]]

        if matched_col:
            mapping[standard_col] = matched_col
        else:
            missing.append(standard_col)

    return mapping, missing


def apply_column_mapping(df, mapping):
    rename_map = {
        original: standard
        for standard, original in mapping.items()
    }

    return df.rename(columns=rename_map)