# GigCredit — Credit Scoring System for Gig Workers Using Alternative Data and a Transparent Scoring API

GigCredit is a full-stack credit scoring platform built for gig economy workers. It analyses daily work data uploaded from platforms such as Grab, Foodpanda, Lalamove, and ShopeeFood, then produces a transparent, explainable credit score that financial institutions can use for lending decisions.

Instead of relying on traditional credit bureau data, GigCredit uses **alternative data** — task completion rates, GPS consistency, customer ratings, platform diversity, and earnings history — to build a fairer picture of a gig worker's financial reliability.

---

## Features

- AI-assisted CSV/Excel column mapping using Grok (xAI) with rule-based fallback
- Rolling weighted credit scoring across up to 12 months of data
- SHAP (SHapley Additive exPlanations) for transparent, factor-level score explanations
- Per-month score history with daily drill-down chart
- Three user roles: Gig Worker, Admin, Financial Institution
- Fully documented REST API via Swagger UI (`/docs`)
- Audit log of every worker profile viewed by a financial institution

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | FastAPI (Python) |
| Database | MongoDB Atlas |
| ML Model | scikit-learn (RandomForest) + SHAP |
| AI Mapping | xAI Grok via OpenAI-compatible SDK |

---

## Project Structure

```
gigcredit/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # MongoDB connection and collections
│   ├── ml_model.pkl         # Trained scoring model
│   ├── routes/
│   │   ├── auth.py          # Register, login, identity
│   │   ├── score.py         # Score calculation, history, daily drill-down
│   │   ├── data.py          # File upload and profile management
│   │   ├── admin.py         # Admin and financial institution management
│   │   └── simulation.py    # Hypothetical score simulation
│   ├── services/
│   │   ├── scoring_engine.py
│   │   ├── shap_explainer.py
│   │   └── auth_service.py
│   └── models/
│       └── profile.py
└── frontend/
    ├── app/
    │   └── dashboard/       # Main dashboard, admin panel, upload page
    ├── components/          # Reusable UI components
    └── lib/
        └── api.ts           # Axios API client
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB Atlas account

### Backend

```bash
cd backend
pip install fastapi uvicorn pymongo python-jose bcrypt python-dotenv pandas openpyxl shap scikit-learn openai
```

Create `backend/.env`:

```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
SECRET_KEY=your_jwt_secret
GROK_API_KEY=your_grok_api_key
```

Start the server:

```bash
python -m uvicorn main:app --reload
```

API available at `http://localhost:8000`  
Swagger docs at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:3000`

---

## API Overview

The scoring API is documented interactively at `http://localhost:8000/docs`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register a gig worker account |
| POST | `/auth/login` | Authenticate and receive a JWT token |
| POST | `/data/upload` | Upload a CSV/Excel file of daily work records |
| POST | `/score/calculate` | Calculate rolling credit scores for all months |
| GET | `/score/history` | Monthly score history with SHAP explanations |
| GET | `/score/daily?month=YYYY-MM` | Day-by-day score progression for a month |
| POST | `/simulate` | Simulate a score for a hypothetical profile |
| GET | `/admin/worker-scores` | All worker scores (admin and FI access) |

All protected endpoints require a `Bearer <token>` header.

---

## Scoring Model

Scores range from **300 to 850** and are derived from four alternative data factors:

| Factor | Description |
|--------|-------------|
| Task Completion Rate | Completed jobs / (completed + cancelled) |
| GPS Consistency | Active working days / total days in month |
| Customer Rating | Average daily rating from platform customers |
| Platform Diversity | Number of distinct platforms worked on |

A **rolling weighted average** is applied across up to 12 months, giving higher weight to more recent months. Each monthly score includes a SHAP explanation showing which factors contributed positively or negatively.

### Eligibility Tiers

| Months of Data | Status |
|---------------|--------|
| < 3 months | Insufficient |
| 3–5 months | Preliminary Score |
| 6+ months | Official Score |

---

## User Roles

- **Gig Worker** — registers, uploads data, views their own score and explanation
- **Admin** — manages users, creates financial institution accounts, monitors the platform
- **Financial Institution** — views worker credit scores for lending decisions; every access is logged

---

## CSV Format

Each row represents one day of activity on one platform.

| Column | Required | Description |
|--------|----------|-------------|
| `date` | Yes | YYYY-MM-DD, DD/MM/YYYY, or DD-MM-YYYY |
| `platform` | Yes | e.g. Grab, Foodpanda, Lalamove |
| `jobs_completed` | Yes | Tasks completed that day |
| `total_earnings` | Yes | Earnings for the day |
| `jobs_cancelled` | No | Tasks cancelled (default 0) |
| `hours_online` | No | Hours app was active (0–24) |
| `average_rating` | No | Customer rating (1.0–5.0) |

Minimum per month-platform: 10 active days and 30 completed tasks.
