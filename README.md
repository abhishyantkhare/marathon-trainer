# Marathon Training Tracker

A complete marathon training tracking application with Strava integration and AI-powered training plans.

## Features

- **Strava Integration**: Sign in with Strava and sync your running activities
- **AI Training Plans**: Generate personalized week-by-week training plans using OpenAI
- **Goal Tracking**: Set your race date and goal time
- **Progress Dashboard**: View current week's workouts and recent runs
- **Responsive Design**: Mobile-friendly UI built with Tailwind CSS

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for PostgreSQL
- **JWT Authentication** - Secure token-based auth
- **OpenAI API** - AI-powered training plan generation

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework

## Project Structure

```
/
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Configuration settings
│   ├── database.py          # Database connection
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── auth.py              # JWT & Strava OAuth
│   ├── routes/
│   │   ├── auth.py          # Auth endpoints
│   │   ├── profile.py       # Profile endpoints
│   │   ├── runs.py          # Runs endpoints
│   │   └── training_plan.py # Training plan endpoints
│   └── services/
│       ├── strava.py        # Strava API service
│       └── training_plan.py # OpenAI training plan service
│
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx         # Landing page
        │   ├── onboarding/      # Goal setup
        │   ├── dashboard/       # Main dashboard
        │   ├── plan/            # Full training plan
        │   ├── runs/            # All synced runs
        │   └── auth/callback/   # OAuth callback
        ├── components/
        │   ├── Navbar.tsx
        │   ├── LoadingSpinner.tsx
        │   └── ProtectedRoute.tsx
        ├── contexts/
        │   └── AuthContext.tsx
        └── lib/
            ├── api.ts           # API client
            └── utils.ts         # Utility functions
```

## Setup Instructions

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL
- Strava API credentials (create app at https://www.strava.com/settings/api)
- OpenAI API key

### 1. Database Setup

Create a PostgreSQL database:

```bash
createdb marathon_tracker
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from example
cp .env.example .env

# Edit .env with your credentials:
# - DATABASE_URL
# - STRAVA_CLIENT_ID
# - STRAVA_CLIENT_SECRET
# - OPENAI_API_KEY
# - JWT_SECRET_KEY (generate a secure random string)

# Run the server
uvicorn main:app --reload
```

The API will be available at http://localhost:8000

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
cp .env.example .env.local

# Run development server
npm run dev
```

The frontend will be available at http://localhost:3000

### 4. Strava OAuth Setup

1. Go to https://www.strava.com/settings/api
2. Create a new application
3. Set the callback URL to: `http://localhost:8000/auth/strava/callback`
4. Copy the Client ID and Client Secret to your backend `.env` file

## API Endpoints

### Auth
- `GET /auth/strava` - Redirect to Strava OAuth
- `GET /auth/strava/callback` - Handle OAuth callback
- `GET /auth/me` - Get current user

### Profile
- `POST /api/profile` - Create/update profile
- `GET /api/profile` - Get profile

### Runs
- `GET /api/runs` - Get synced runs
- `POST /api/runs/sync` - Sync from Strava

### Training Plan
- `GET /api/training-plan` - Get current plan
- `POST /api/training-plan/generate` - Generate new plan

## Environment Variables

### Backend (.env)

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/marathon_tracker
JWT_SECRET_KEY=your-secret-key-change-in-production
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_REDIRECT_URI=http://localhost:8000/auth/strava/callback
OPENAI_API_KEY=your_openai_api_key
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Database Schema

### users
- id, strava_id, strava_access_token, strava_refresh_token, strava_token_expires_at
- email, name, profile_picture, created_at

### user_profiles
- id, user_id, race_date, goal_time_minutes, fitness_level

### training_plans
- id, user_id, plan_json, created_at, updated_at

### runs
- id, user_id, strava_activity_id, name, distance_meters
- moving_time_seconds, start_date, average_pace, type

## Development

### Running Tests

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm run lint
```

### Building for Production

```bash
# Backend
# Use gunicorn with uvicorn workers
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker

# Frontend
cd frontend
npm run build
npm start
```

## License

MIT
