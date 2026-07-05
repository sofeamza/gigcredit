"""
AI-powered CSV column mapper using xAI Grok.

Sends CSV headers + sample rows to Grok and gets back a JSON mapping
of each CSV column to one of the system's internal field names.

Falls back to rule-based matching if the API key is not set.

Internal fields:
  date, platform, jobs_completed, jobs_cancelled,
  total_earnings, hours_online, average_rating
"""

import json
import os
import re
from difflib import get_close_matches

INTERNAL_FIELDS = [
    "date",
    "platform",
    "jobs_completed",
    "jobs_cancelled",
    "total_earnings",
    "hours_online",
    "average_rating",
]

# ── Rule-based fallback ───────────────────────────────────────────────────────

FIELD_ALIASES: dict[str, list[str]] = {
    "date": [
        "date", "day", "work_date", "activity_date", "trip_date",
        "order_date", "transaction_date", "report_date", "period",
    ],
    "platform": [
        "platform", "app", "service", "company", "operator",
        "source", "gig_platform", "platform_name",
    ],
    "jobs_completed": [
        "jobs_completed", "completed_jobs", "completed_orders",
        "orders_completed", "trips_completed", "deliveries_completed",
        "tasks_completed", "successful_jobs", "successful_orders",
        "done", "finished_jobs", "rides_completed",
    ],
    "jobs_cancelled": [
        "jobs_cancelled", "cancelled_jobs", "cancelled_orders",
        "orders_cancelled", "cancellations", "cancel_count",
        "trips_cancelled", "rejected_jobs", "rejected_orders",
        "cancellation_count",
    ],
    "total_earnings": [
        "total_earnings", "earnings", "income", "revenue",
        "gross_earnings", "net_earnings", "payout", "total_payout",
        "daily_earnings", "amount_earned", "total_income",
        "fare", "total_fare", "total_revenue",
    ],
    "hours_online": [
        "hours_online", "online_hours", "hours_active", "active_hours",
        "time_online", "hours_worked", "working_hours", "hours",
        "duration", "login_hours", "total_hours",
    ],
    "average_rating": [
        "average_rating", "avg_rating", "rating", "customer_rating",
        "stars", "score", "satisfaction_score", "review_score",
        "daily_rating", "mean_rating",
    ],
}


def _normalize(name: str) -> str:
    name = name.lower().strip()
    name = re.sub(r"[^a-z0-9]+", "_", name)
    return name.strip("_")


def _rule_based_map(columns: list[str]) -> dict[str, str | None]:
    normalized_to_original = {_normalize(col): col for col in columns}

    alias_to_field: dict[str, str] = {}
    for field, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            alias_to_field[_normalize(alias)] = field

    claimed: set[str] = set()
    result: dict[str, str | None] = {col: None for col in columns}

    for norm_col, orig_col in normalized_to_original.items():
        if norm_col in alias_to_field:
            field = alias_to_field[norm_col]
            if field not in claimed:
                result[orig_col] = field
                claimed.add(field)

    unclaimed_fields = [f for f in INTERNAL_FIELDS if f not in claimed]
    for orig_col in [c for c, m in result.items() if m is None]:
        norm_col = _normalize(orig_col)
        candidates = {
            _normalize(alias): field
            for field in unclaimed_fields
            for alias in FIELD_ALIASES[field]
        }
        close = get_close_matches(norm_col, candidates.keys(), n=1, cutoff=0.72)
        if close:
            field = candidates[close[0]]
            if field not in claimed:
                result[orig_col] = field
                claimed.add(field)
                unclaimed_fields.remove(field)

    return result


# ── Grok AI mapping ───────────────────────────────────────────────────────────

def _grok_map(columns: list[str], sample_rows: list[dict], api_key: str) -> dict[str, str | None]:
    from openai import OpenAI

    client = OpenAI(
        api_key=api_key,
        base_url="https://api.x.ai/v1",
    )

    sample_text = json.dumps(sample_rows[:5], indent=2, default=str)

    prompt = f"""You are a data mapping assistant. A gig worker uploaded a CSV file.
Map each column to one of these internal field names (or null if no match):
  date, platform, jobs_completed, jobs_cancelled, total_earnings, hours_online, average_rating

CSV columns: {json.dumps(columns)}

Sample rows:
{sample_text}

Return ONLY a JSON object. Keys = exact CSV column names, values = internal field name or null.
No explanation, no markdown."""

    response = client.chat.completions.create(
        model="grok-3-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=256,
    )

    raw = response.choices[0].message.content.strip()
    raw = re.sub(r"^```[a-z]*\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)
    return json.loads(raw)


# ── Public interface ──────────────────────────────────────────────────────────

def map_columns_with_ai(columns: list[str], sample_rows: list[dict]) -> dict[str, str | None]:
    """
    Map CSV columns to internal field names.
    Uses Grok if GROK_API_KEY is set, otherwise falls back to rule-based matching.
    """
    api_key = os.getenv("GROK_API_KEY")
    if api_key:
        try:
            return _grok_map(columns, sample_rows, api_key)
        except Exception:
            pass  # fall through to rule-based on any error

    return _rule_based_map(columns)


def apply_ai_mapping(df, mapping: dict[str, str | None]):
    """Rename DataFrame columns and keep only mapped ones."""
    rename = {col: internal for col, internal in mapping.items() if internal}
    df = df.rename(columns=rename)
    keep = [v for v in mapping.values() if v]
    existing = [c for c in keep if c in df.columns]
    return df[existing]
