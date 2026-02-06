# Contributing to Dora Learning App

Thanks for your interest in contributing! Here's how to get started.

## Setup

1. Fork and clone the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

## Development Workflow

1. **Backend** (`npm run dev` from backend/):
   - Runs on port 3001
   - Auto-reloads with nodemon
   - Check `/health` to verify server is running

2. **Frontend** (`npm run dev` from frontend/):
   - Runs on port 5173
   - Hot module reloading enabled
   - Proxies API calls to backend

## Making Changes

- Commit messages: Use clear, descriptive messages
- Code style: Follow existing patterns
- Test locally before submitting PRs

## Submitting PR

1. Push to your fork
2. Create a pull request with a clear title and description
3. Reference any related issues

## Questions?

Reach out on Telegram or create an issue!

---

**Happy coding! 🚀**
