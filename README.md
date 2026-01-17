# Marathon Training Tracker

A full-stack marathon training application with Strava integration and AI-powered personalized training plans.

## Features

- **Strava Integration**: Connect your Strava account to sync your runs automatically
- **AI Training Plans**: Generate personalized week-by-week marathon training plans using OpenAI
- **Progress Tracking**: Track your training progress with your synced runs
- **Responsive Design**: Mobile-friendly interface built with Tailwind CSS

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - SQL toolkit and ORM
- **PostgreSQL** - Database
- **Strava OAuth** - Authentication
- **OpenAI GPT-4** - AI training plan generation
- **JWT** - Token-based authentication

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework

## Project Structure

```
marathon-training-app/
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Configuration settings
│   ├── database.py          # Database connection
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── auth.py              # JWT authentication
│   ├── routes/
│   │   ├── auth.py          # Strava OAuth routes
│   │   ├── profile.py       # User profile routes
│   │   ├── runs.py          # Runs sync routes
│   │   └── training_plan.py # Training plan routes
│   ├── services/
│   │   ├── strava.py        # Strava API service
│   │   └── training_plan.py # OpenAI training plan service
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Landing page
│   │   ├── layout.tsx       # Root layout
│   │   ├── auth/callback/   # OAuth callback
│   │   ├── onboarding/      # Onboarding flow
│   │   ├── dashboard/       # Main dashboard
│   │   ├── plan/            # Training plan view
│   │   └── runs/            # Runs list
│   ├── components/          # React components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions and API client
│   └── package.json
└── README.md
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Strava API credentials
- OpenAI API key

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd marathon-training-app
```

### 2. Database Setup

Create a PostgreSQL database:

```bash
createdb marathon_training
```

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
```

Edit `.env` with your credentials:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/marathon_training
JWT_SECRET=your-super-secret-jwt-key
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_REDIRECT_URI=http://localhost:8000/auth/strava/callback
OPENAI_API_KEY=your_openai_api_key
FRONTEND_URL=http://localhost:3000
```

Run the backend:

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000` and docs at `http://localhost:8000/docs`.

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Run the frontend:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Getting API Credentials

### Strava API

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Create an application
3. Set the Authorization Callback Domain to `localhost`
4. Copy your Client ID and Client Secret

### OpenAI API

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key to your `.env` file

## API Endpoints

### Authentication
- `GET /auth/strava` - Redirect to Strava OAuth
- `GET /auth/strava/callback` - Handle OAuth callback
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout user

### Profile
- `POST /api/profile` - Create/update profile
- `GET /api/profile` - Get user profile

### Runs
- `GET /api/runs` - Get synced runs
- `POST /api/runs/sync` - Sync runs from Strava

### Training Plan
- `POST /api/training-plan/generate` - Generate AI training plan
- `GET /api/training-plan` - Get current plan

## User Flow

1. **Landing Page**: User clicks "Connect with Strava"
2. **Strava OAuth**: User authorizes the app
3. **Onboarding**: User enters race date, goal time, and fitness level
4. **Plan Generation**: AI generates a personalized training plan
5. **Dashboard**: User views current week's workouts and recent runs
6. **Training Plan**: Full week-by-week plan view
7. **Runs**: View and sync runs from Strava

## Database Schema

### Users
- `id`, `strava_id`, `strava_access_token`, `strava_refresh_token`, `strava_token_expires_at`, `email`, `name`, `profile_picture`, `created_at`

### User Profiles
- `id`, `user_id`, `race_date`, `goal_time_minutes`, `fitness_level`

### Training Plans
- `id`, `user_id`, `plan_json`, `created_at`, `updated_at`

### Runs
- `id`, `user_id`, `strava_activity_id`, `name`, `distance_meters`, `moving_time_seconds`, `start_date`, `average_pace`, `type`

## Development

### Running Tests

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

### Code Formatting

```bash
# Backend
black .
isort .

# Frontend
npm run lint
```

## License

MIT
