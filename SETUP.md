# Dora Learning App - Setup Instructions

Welcome, Aron! 🚀 This guide will help you get the project up and running.

## Step 1: Create the GitHub Repository

Since you're santaclawbot on GitHub, you'll need to create the repo manually:

1. Go to https://github.com/new
2. **Repository name:** `dora-learning-app`
3. **Description:** A modern learning platform with Telegram integration and personalized lessons
4. **Visibility:** Public
5. **Initialize:** Do NOT initialize with README, .gitignore, or license (we already have them)
6. Click **Create repository**

## Step 2: Push the Code to GitHub

Once the repo is created, run these commands from your terminal:

```bash
# Navigate to the project directory
cd path/to/dora-learning-app

# Add GitHub as remote (replace santaclawbot if needed)
git remote add origin https://github.com/santaclawbot/dora-learning-app.git

# Verify the remote is added
git remote -v

# Push the code
git branch -M main
git push -u origin main
```

If you get authentication errors:
- **HTTPS:** Use a GitHub Personal Access Token instead of your password
  - Generate one: https://github.com/settings/tokens
  - Use token as password when prompted
- **SSH:** Set up SSH keys
  - https://docs.github.com/en/authentication/connecting-to-github-with-ssh

## Step 3: Clone and Install Dependencies

```bash
# Clone the repo
git clone https://github.com/santaclawbot/dora-learning-app.git
cd dora-learning-app

# Backend setup
cd backend
cp .env.example .env
npm install
npm run db:init          # Initialize SQLite database
npm run db:seed          # Add sample lessons (optional)
npm run dev              # Start backend on port 3001

# In a new terminal, frontend setup
cd frontend
cp .env.example .env
npm install
npm run dev              # Start frontend on port 5173
```

## Step 4: Environment Variables

### Backend (.env)

```
TELEGRAM_TOKEN=your_token_from_botfather
ELEVENLABS_API_KEY=your_api_key
DATABASE_URL=./data/dora.db
BACKEND_PORT=3001
NODE_ENV=development
```

### Frontend (.env)

```
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=Dora Learning App
```

## Step 5: Telegram Bot Setup

1. Open Telegram and message **@BotFather**
2. Send `/newbot` and follow the steps
3. Copy the token BotFather gives you
4. Add it to `backend/.env` as `TELEGRAM_TOKEN`
5. Tell BotFather to `/setwebhook` and provide your webhook URL (e.g., https://your-domain.com/webhook/telegram)

## Step 6: ElevenLabs Setup (Voice)

1. Create account at https://elevenlabs.io
2. Get your API key from Settings
3. Add it to `backend/.env` as `ELEVENLABS_API_KEY`
4. Pick a voice ID (default: `21m00Tcm4TlvDq8ikWAM`)

## Step 7: Verify Everything Works

### Backend
```bash
cd backend
npm run dev
# Visit http://localhost:3001/health
# You should see: {"status":"ok","timestamp":"..."}
```

### Frontend
```bash
cd frontend
npm run dev
# Visit http://localhost:5173
# You should see the login page
```

### Test Login (Local)
- Email: `test@example.com`
- Password: `password123`
- (Note: Authentication is stubbed in the initial version)

## Project Structure

```
dora-learning-app/
├── backend/               # Express API server
│  ├── server.js          # Main server file
│  ├── scripts/
│  │  ├── init-db.js      # Database initialization
│  │  └── seed-db.js      # Sample data
│  ├── package.json
│  └── .env.example
├── frontend/             # React + Vite app
│  ├── src/
│  │  ├── pages/          # Page components
│  │  ├── components/     # Reusable components
│  │  ├── styles/         # CSS files
│  │  └── App.jsx
│  ├── package.json
│  └── .env.example
├── docs/                 # Documentation
│  ├── API.md
│  └── CONTRIBUTING.md
├── README.md
└── SETUP.md             # This file
```

## Daily Development Workflow

### Start the Project

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Make Changes

- **Backend:** Edit `backend/server.js` or create new route files
- **Frontend:** Edit files in `frontend/src/`
- Changes auto-reload with hot module reloading

### Commit Changes

```bash
git add .
git commit -m "Your message here"
git push
```

## Troubleshooting

### Port Already in Use
```bash
# Backend (port 3001)
lsof -i :3001
kill -9 <PID>

# Frontend (port 5173)
lsof -i :5173
kill -9 <PID>
```

### Database Issues
```bash
# Reset database
rm backend/data/dora.db
cd backend
npm run db:init
```

### Dependencies Issues
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. **Week 1:** Build authentication, set up Telegram bot integration
2. **Week 2:** Implement lesson delivery system, voice synthesis
3. **Week 3:** Add student profiles, progress tracking, testing

## Questions?

- Check `docs/API.md` for endpoint details
- Review `README.md` for overview
- See `docs/CONTRIBUTING.md` for development guidelines

---

**Let's build something amazing! 🚀**

Happy coding, Aron!
