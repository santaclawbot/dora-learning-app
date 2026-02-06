# Dora Learning App - Quick Start

**TL;DR** - Get running in 5 minutes:

## 1. Create GitHub Repo

```bash
# Go to https://github.com/new
# Name: dora-learning-app
# Public visibility
# DON'T initialize with files (we have them)
```

## 2. Push Code

```bash
cd path/to/dora-learning-app
git remote add origin https://github.com/santaclawbot/dora-learning-app.git
git push -u origin main
```

## 3. Set Up Environment

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run db:init

# Frontend
cd frontend
cp .env.example .env
npm install
```

## 4. Start Development

```bash
# Terminal 1: Backend (port 3001)
cd backend && npm run dev

# Terminal 2: Frontend (port 5173)
cd frontend && npm run dev
```

## 5. Open Browser

Visit: http://localhost:5173

## Add Your API Keys

Update `.env` files:

```
Backend (.env):
- TELEGRAM_TOKEN=from_botfather
- ELEVENLABS_API_KEY=from_elevenlabs

Frontend (.env):
- Already configured to use http://localhost:3001
```

---

## Project Structure

- `backend/` → Express API server + Telegram bot
- `frontend/` → React + Vite learning interface
- `docs/` → API docs and contributing guide

## Key Endpoints

- `GET http://localhost:3001/health` → Check if backend is running
- `GET http://localhost:3001/api/lessons` → List lessons
- `POST http://localhost:3001/webhook/telegram` → Telegram messages

## Useful Commands

```bash
# Backend
npm run dev              # Development server
npm run db:init         # Initialize database
npm run db:seed         # Add sample lessons
npm start               # Production mode

# Frontend  
npm run dev             # Development server
npm run build           # Production build
npm run preview         # Preview build
```

---

**Need help?** See `SETUP.md` for detailed instructions or `docs/API.md` for endpoint reference.

**Ready to code?** Check the file structure and start in `backend/server.js` or `frontend/src/App.jsx`!

🚀 **Let's go!**
