from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import pandas as pd
import io
import uuid
import calendar
from collections import defaultdict

from services.auth_service import get_current_user
from config import profiles_col, upload_batches_col, users_col, daily_records_col
from services.ai_column_mapper import map_columns_with_ai, apply_ai_mapping
from datetime import datetime

router = APIRouter(prefix="/data", tags=["Data"])

# Try these formats in order before falling back to pandas inference.
# Covers ISO (2026-05-01), Excel-style (01/05/2026 or 1/5/2026 DD/MM/YYYY),
# and US-style (05/01/2026 MM/DD/YYYY).
_DATE_FORMATS = ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%m-%d-%Y"]


def _parse_dates(series: pd.Series) -> pd.Series:
    """Try explicit formats first; fall back to pandas inference."""
    result = pd.Series([pd.NaT] * len(series), index=series.index)
    remaining = series.copy()
    for fmt in _DATE_FORMATS:
        parsed = pd.to_datetime(remaining, format=fmt, errors="coerce")
        filled = parsed.notna()
        result[filled] = parsed[filled]
        remaining = remaining[~filled]
        if remaining.empty:
            break
    # Final fallback for anything still unparsed
    if remaining.notna().any():
        fallback = pd.to_datetime(remaining, errors="coerce")
        result[remaining.index] = fallback
    return result

MIN_ACTIVE_DAYS = 10
MIN_TASKS       = 30

REQUIRED_DAILY_FIELDS = {"date", "platform", "jobs_completed", "total_earnings"}

# Platforms we recognize out of the box. Anything else gets flagged so the
# worker can confirm it's a real platform and not a typo or unsupported source.
KNOWN_PLATFORMS = {
    "grab", "foodpanda", "lalamove", "shopee", "shopeefood", "gojek",
    "maxim", "airasia ride", "deliveroo", "uber", "ubereats", "bykea",
    "swiggy", "zomato", "indrive", "deliveryhero", "ryde", "anycar",
}

ISSUE_LABELS = {
    "blank_date":              "day(s) with a missing or unreadable date",
    "blank_platform":          "day(s) with a missing platform name",
    "unsupported_platform":    "day(s) listing an unrecognized platform",
    "blank_jobs_completed":    "day(s) with a missing completed-job count",
    "negative_jobs_completed": "day(s) with a negative completed-job count",
    "negative_jobs_cancelled": "day(s) with a negative cancelled-job count",
    "blank_earnings":          "day(s) with missing earnings",
    "negative_earnings":       "day(s) with negative earnings",
    "out_of_range_hours":      "day(s) with hours online outside the valid 0–24 range",
    "out_of_range_rating":     "day(s) with a rating outside the valid 1–5 range",
}


def _to_number(value):
    try:
        if value is None or (isinstance(value, float) and pd.isna(value)):
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _is_known_platform(platform: str) -> bool:
    return platform.strip().lower() in KNOWN_PLATFORMS


def _validate_daily_rows(df: pd.DataFrame) -> dict[tuple[str, str], list[str]]:
    """
    Scan raw mapped daily rows for data quality issues (blanks, invalid values,
    out-of-range numbers, unsupported platforms) before aggregation.

    Returns a dict keyed by (month, platform) -> list of human-readable issue
    descriptions. Rows whose date can't be parsed are grouped under month "unknown".
    """
    counts: dict[tuple[str, str], dict[str, int]] = defaultdict(lambda: defaultdict(int))

    parsed_dates = _parse_dates(df.get("date"))

    for idx, row in df.iterrows():
        date_val = parsed_dates.loc[idx]
        platform_raw = row.get("platform")
        platform = str(platform_raw).strip() if pd.notna(platform_raw) else ""

        if pd.isna(date_val):
            counts[("unknown", platform or "unknown")]["blank_date"] += 1
            continue

        month = date_val.strftime("%Y-%m")
        key = (month, platform or "unknown")

        if not platform:
            counts[key]["blank_platform"] += 1
        elif not _is_known_platform(platform):
            counts[key]["unsupported_platform"] += 1

        jobs_completed = _to_number(row.get("jobs_completed"))
        if jobs_completed is None:
            counts[key]["blank_jobs_completed"] += 1
        elif jobs_completed < 0:
            counts[key]["negative_jobs_completed"] += 1

        jobs_cancelled = _to_number(row.get("jobs_cancelled"))
        if jobs_cancelled is not None and jobs_cancelled < 0:
            counts[key]["negative_jobs_cancelled"] += 1

        earnings = _to_number(row.get("total_earnings"))
        if earnings is None:
            counts[key]["blank_earnings"] += 1
        elif earnings < 0:
            counts[key]["negative_earnings"] += 1

        hours = _to_number(row.get("hours_online"))
        if hours is not None and (hours < 0 or hours > 24):
            counts[key]["out_of_range_hours"] += 1

        rating = _to_number(row.get("average_rating"))
        if rating is not None and rating > 0 and (rating < 1 or rating > 5):
            counts[key]["out_of_range_rating"] += 1

    result: dict[tuple[str, str], list[str]] = {}
    for key, issue_counts in counts.items():
        msgs = [f"{n} {ISSUE_LABELS[issue]}" for issue, n in issue_counts.items() if n > 0]
        if msgs:
            result[key] = msgs

    return result


def _aggregate_daily_to_monthly(df: pd.DataFrame) -> list[dict]:
    """Aggregate daily-level rows into monthly summaries."""
    df = df.copy()
    df["date"] = _parse_dates(df["date"])
    df = df.dropna(subset=["date"])
    df["month"] = df["date"].dt.to_period("M").astype(str)

    for col in ["jobs_completed", "jobs_cancelled", "total_earnings", "hours_online", "average_rating"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
        else:
            df[col] = 0

    results = []
    for (month_str, platform), group in df.groupby(["month", "platform"]):
        year, month_num = map(int, month_str.split("-"))
        days_in_month  = calendar.monthrange(year, month_num)[1]

        jobs_done      = int(group["jobs_completed"].sum())
        jobs_cancelled = int(group["jobs_cancelled"].sum())
        total_assigned = jobs_done + jobs_cancelled
        total_earnings = float(group["total_earnings"].sum())
        active_days    = int((group["hours_online"] > 0).sum())
        gps_consistency = round(active_days / days_in_month, 4)

        rating_vals = group["average_rating"][group["average_rating"] > 0]
        customer_rating = round(float(rating_vals.mean()), 4) if not rating_vals.empty else 0.0

        task_completion_rate = (
            round(jobs_done / total_assigned, 4) if total_assigned > 0 else 0.0
        )

        results.append({
            "month":                month_str,
            "platform":             str(platform).strip(),
            "jobs_completed":       jobs_done,
            "jobs_cancelled":       jobs_cancelled,
            "total_tasks_assigned": total_assigned,
            "active_days":          active_days,
            "total_earnings":       total_earnings,
            "gps_consistency":      gps_consistency,
            "customer_rating":      customer_rating,
            "task_completion_rate": task_completion_rate,
        })

    return results


@router.post("/upload")
async def upload_data(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    contents = await file.read()
    filename  = file.filename.lower()

    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith(".xlsx"):
            df = pd.read_excel(io.BytesIO(contents))
        elif filename.endswith(".json"):
            df = pd.read_json(io.BytesIO(contents))
        elif filename.endswith(".gpx"):
            raise HTTPException(status_code=400, detail="GPX support coming soon")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file format")

    if df.empty:
        raise HTTPException(status_code=400, detail="The uploaded file is empty")

    # ── AI column mapping ────────────────────────────────────────────────────
    columns     = list(df.columns)
    sample_rows = df.head(5).to_dict(orient="records")

    try:
        ai_mapping = map_columns_with_ai(columns, sample_rows)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI column mapping failed: {e}")

    mapped_internals = {v for v in ai_mapping.values() if v}
    missing = REQUIRED_DAILY_FIELDS - mapped_internals
    if missing:
        return {
            "status":           "mapping_failed",
            "message":          f"Could not identify required columns: {', '.join(sorted(missing))}. "
                                "Make sure your file has date, platform, jobs completed, and earnings columns.",
            "detected_columns": columns,
            "ai_mapping":       ai_mapping,
        }

    df = apply_ai_mapping(df, ai_mapping)

    # ── Flag data quality issues (blanks, invalid/out-of-range values,
    #    unsupported platforms) before aggregation ────────────────────────────
    row_issues = _validate_daily_rows(df)

    # ── Aggregate daily → monthly ────────────────────────────────────────────
    try:
        monthly_summaries = _aggregate_daily_to_monthly(df)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error aggregating data: {e}")

    if not monthly_summaries:
        raise HTTPException(status_code=400, detail="No valid date rows found in the file")

    user_doc  = users_col.find_one({"email": current_user["email"]}, {"_id": 0})
    worker_id = (user_doc or {}).get("worker_id") or current_user["email"].split("@")[0]

    batch_id           = str(uuid.uuid4())
    validation_results = []
    inserted_months    = []
    inserted           = 0
    failed             = 0

    # Rows with unparseable dates can't be attributed to any month — report
    # them as their own failed entries so they aren't silently dropped.
    for (month_key, platform_key), issues in row_issues.items():
        if month_key == "unknown":
            validation_results.append({
                "month":    "Unrecognized",
                "platform": platform_key,
                "status":   "failed",
                "reasons":  issues,
            })
            failed += 1

    for summary in monthly_summaries:
        month          = summary["month"]
        platform       = summary["platform"]
        active_days    = summary["active_days"]
        tasks_done     = summary["jobs_completed"]
        total_earnings = summary["total_earnings"]
        total_tasks    = summary["total_tasks_assigned"]

        reasons = list(row_issues.get((month, platform), []))
        if active_days < MIN_ACTIVE_DAYS:
            reasons.append(f"Only {active_days} active days (minimum {MIN_ACTIVE_DAYS})")
        if tasks_done < MIN_TASKS:
            reasons.append(f"Only {tasks_done} completed tasks (minimum {MIN_TASKS})")
        if total_earnings <= 0:
            reasons.append("Earnings record is zero or invalid")
        if total_tasks <= 0:
            reasons.append("No tasks recorded")

        if reasons:
            validation_results.append({
                "month":    month,
                "platform": platform,
                "status":   "failed",
                "reasons":  reasons,
            })
            failed += 1
            continue

        profile_doc = {
            "user_email":           current_user["email"],
            "worker_id":            worker_id,
            "platform_name":        platform,
            "month":                month,
            "task_completion_rate": summary["task_completion_rate"],
            "gps_consistency":      summary["gps_consistency"],
            "customer_rating":      summary["customer_rating"],
            "platform_diversity":   1,
            "total_earnings":       total_earnings,
            "tasks_completed":      tasks_done,
            "active_days":          active_days,
            "uploaded_at":          datetime.utcnow(),
            "batch_id":             batch_id,
        }

        profiles_col.update_one(
            {
                "user_email":    current_user["email"],
                "month":         month,
                "platform_name": platform,
            },
            {"$set": profile_doc},
            upsert=True,
        )

        # Store raw daily rows for this month+platform so daily drill-down works
        df_parsed = df.copy()
        df_parsed["date"] = _parse_dates(df_parsed["date"])
        df_parsed = df_parsed.dropna(subset=["date"])
        df_parsed["month"] = df_parsed["date"].dt.to_period("M").astype(str)
        mask = (df_parsed["month"] == month) & (df_parsed["platform"].str.lower() == platform.lower())
        for _, row in df_parsed[mask].iterrows():
            daily_records_col.update_one(
                {
                    "user_email": current_user["email"],
                    "date":       row["date"].strftime("%Y-%m-%d"),
                    "platform":   platform,
                },
                {"$set": {
                    "user_email":      current_user["email"],
                    "date":            row["date"].strftime("%Y-%m-%d"),
                    "month":           month,
                    "platform":        platform,
                    "jobs_completed":  float(row.get("jobs_completed", 0)),
                    "jobs_cancelled":  float(row.get("jobs_cancelled", 0)),
                    "total_earnings":  float(row.get("total_earnings", 0)),
                    "hours_online":    float(row.get("hours_online", 0)),
                    "average_rating":  float(row.get("average_rating", 0)),
                }},
                upsert=True,
            )

        inserted_months.append({"month": month, "platform": platform})
        validation_results.append({
            "month":    month,
            "platform": platform,
            "status":   "passed",
        })
        inserted += 1

    if inserted == 0:
        return {
            "status":             "validation_failed",
            "message":            "No records passed validation. Please check the requirements below.",
            "records_inserted":   0,
            "records_failed":     failed,
            "validation_results": validation_results,
        }

    upload_batches_col.insert_one({
        "batch_id":         batch_id,
        "user_email":       current_user["email"],
        "filename":         file.filename,
        "uploaded_at":      datetime.utcnow(),
        "months":           inserted_months,
        "records_inserted": inserted,
        "records_failed":   failed,
    })

    return {
        "status":             "success",
        "message":            f"{inserted} month(s) of data uploaded successfully.",
        "records_inserted":   inserted,
        "records_failed":     failed,
        "validation_results": validation_results,
    }


@router.get("/upload-history")
def get_upload_history(current_user: dict = Depends(get_current_user)):
    batches = list(upload_batches_col.find(
        {"user_email": current_user["email"]},
        {"_id": 0},
    ).sort("uploaded_at", -1))
    return {"batches": batches}


@router.delete("/upload-history/{batch_id}")
def delete_upload_batch(batch_id: str, current_user: dict = Depends(get_current_user)):
    batch = upload_batches_col.find_one({
        "batch_id":   batch_id,
        "user_email": current_user["email"],
    })
    if not batch:
        raise HTTPException(status_code=404, detail="Upload batch not found")

    profiles_col.delete_many({
        "user_email": current_user["email"],
        "batch_id":   batch_id,
    })
    upload_batches_col.delete_one({"batch_id": batch_id})

    return {"status": "deleted", "batch_id": batch_id}


@router.get("/worker-history/{worker_email}")
def get_worker_history(worker_email: str, current_user: dict = Depends(get_current_user)):
    user = users_col.find_one({"email": current_user["email"]})
    if not user or user.get("role") != "financial_institution":
        raise HTTPException(status_code=403, detail="Access restricted to financial institutions")

    records = list(profiles_col.find(
        {"user_email": worker_email},
        {
            "_id": 0,
            "month": 1,
            "platform_name": 1,
            "worker_id": 1,
            "tasks_completed": 1,
            "task_completion_rate": 1,
            "active_days": 1,
            "total_earnings": 1,
            "gps_consistency": 1,
            "customer_rating": 1,
            "uploaded_at": 1,
        }
    ).sort("month", 1))

    return {"worker_email": worker_email, "history": records}


@router.get("/my-profile")
def get_my_profile(current_user: dict = Depends(get_current_user)):
    profiles = list(profiles_col.find(
        {"user_email": current_user["email"]},
        {"_id": 0},
    ).sort("month", -1))

    if not profiles:
        raise HTTPException(status_code=404, detail="No uploaded profile found")

    from collections import defaultdict
    monthly: dict = defaultdict(list)
    for p in profiles:
        monthly[p["month"]].append(p)

    months_count = len(monthly)

    if months_count < 3:
        eligibility = "insufficient"
    elif months_count < 6:
        eligibility = "preliminary"
    else:
        eligibility = "official"

    latest = profiles[0]

    return {
        "user_id":              latest["worker_id"],
        "platform_name":        latest["platform_name"],
        "task_completion_rate": latest["task_completion_rate"],
        "gps_consistency":      latest["gps_consistency"],
        "customer_rating":      latest["customer_rating"],
        "platform_diversity":   latest["platform_diversity"],
        "daily_earnings":       [latest["total_earnings"]],
        "months_count":         months_count,
        "eligibility":          eligibility,
    }
