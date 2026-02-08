# Dora Learning App 🚀

[![CI/CD Pipeline](https://github.com/santaclawbot/dora-learning-app/actions/workflows/ci.yml/badge.svg)](https://github.com/santaclawbot/dora-learning-app/actions/workflows/ci.yml)
[![Backend Tests](https://img.shields.io/badge/tests-passing-brightgreen)](https://github.com/santaclawbot/dora-learning-app/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern learning platform with Telegram integration, personalized lessons, and voice-enabled interactions.

## Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Node.js + Express + SQLite
- **Bot:** Telegram Bot API via webhook
- **Voice:** ElevenLabs API for text-to-speech

## Project Structure

```
dora-learning-app/
├── frontend/           # React + Vite app
├── backend/            # Express API server
├── docs/               # Documentation
└── README.md          # This file
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Git
- GitHub account (for deploying)

### 1. Clone the Repository

```bash
git clone https://github.com/santaclawbot/dora-learning-app.git
cd dora-learning-app
```

### 2. Environment Setup

Copy `.env.example` to `.env` in both frontend and backend directories:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in your API keys:
- `TELEGRAM_TOKEN` - Get from BotFather on Telegram
- `ELEVENLABS_API_KEY` - From ElevenLabs dashboard
- `DATABASE_URL` - SQLite path (defaults to `./data/dora.db`)

### 3. Backend Setup

```bash
cd backend
npm install
npm run db:init       # Initialize SQLite schema
npm run dev           # Start dev server on http://localhost:3001
```

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev           # Start dev server on http://localhost:5173
```

Open http://localhost:5173 in your browser. The app will connect to the backend at `http://localhost:3001`.

### 5. Telegram Bot Setup

1. Get your bot token from BotFather
2. Add it to `backend/.env` as `TELEGRAM_TOKEN`
3. Set webhook: `https://your-domain.com/webhook/telegram`
4. Start the backend server

## Testing

### Backend Tests

The backend includes comprehensive unit and integration tests using **Vitest**:

```bash
cd backend
npm install            # Install dependencies (includes test deps)
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report
```

**Test Coverage:**
- CRUD operations (Users, Lessons, UserLessons, Responses)
- API endpoints (all REST routes)
- Photo upload/management
- Telegram webhook handling
- Progress tracking and dashboards

### Test Files

```
backend/tests/
├── setup.js           # Test database setup
├── crud.test.js       # CRUD module tests
├── api.test.js        # API endpoint tests
├── photos.test.js     # Photo upload tests
└── telegram.test.js   # Telegram webhook tests
```

## CI/CD Pipeline

Automated testing and deployment via **GitHub Actions**:

- ✅ **On Push/PR to main:** Runs all backend tests
- ✅ **On successful tests:** Auto-deploys to production
  - Frontend → Vercel
  - Backend → Railway

### Required Secrets

Add these to your GitHub repository secrets:

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `RAILWAY_TOKEN` | Railway API token |

## Available Scripts

### Backend

```bash
npm run dev            # Development server with hot reload
npm run build          # Production build
npm start              # Run production server
npm run db:init        # Initialize database schema
npm run db:seed        # Populate sample lessons
npm test               # Run tests
npm run test:watch     # Tests in watch mode
npm run test:coverage  # Tests with coverage
```

### Frontend

```bash
npm run dev            # Development server
npm run build          # Production build
npm run preview        # Preview production build
npm run lint           # Run ESLint
```

## Database

SQLite database is created at `backend/data/dora.db`. Schema includes:
- `users` - Student profiles and progress
- `lessons` - Lesson content and metadata
- `user_lessons` - Completion status and scores
- `responses` - Student responses to exercises

Run `npm run db:init` in the backend folder to set up the schema.

## Architecture

### Backend Routes

- `GET /api/lessons` - List all lessons
- `GET /api/lessons/:id` - Get lesson details
- `POST /api/users/login` - User authentication
- `POST /api/users/profile` - Get/update profile
- `POST /webhook/telegram` - Telegram bot webhook

### Frontend Pages

- `/login` - User authentication
- `/dashboard` - Main learning hub
- `/lesson/:id` - Lesson viewer with progress tracking
- `/profile` - User profile and settings

## Development Workflow

1. Backend runs on port `3001`
2. Frontend (Vite) runs on port `5173`
3. Backend serves the webhook at `/webhook/telegram`

## Deployment

Coming soon! We'll cover:
- Vercel/Railway for backend
- Netlify for frontend
- Telegram webhook configuration

## Contributing

See `docs/CONTRIBUTING.md` for guidelines.

## License

MIT

## Support

Reach out on Telegram or create an issue in this repo!

---

**Built with ❤️ by Aron & the team**
