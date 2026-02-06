# 🚀 Deployment Guide for Dora Learning App

## Overview
- **Backend**: Railway (Node.js + SQLite)
- **Frontend**: Vercel (Vite + React)
- **GitHub Repo**: santaclawbot/dora-learning-app

---

## Step 1: Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select `santaclawbot/dora-learning-app`
4. Railway will auto-detect the Node.js backend in `/backend`
5. **Important**: Set the **Root Directory** to `backend`

### Environment Variables (Settings → Variables)
```
PORT=3001
NODE_ENV=production
JWT_SECRET=dora-super-secret-key-2024
ELEVENLABS_API_KEY=sk_77718b72529589bb7f4b81b6f6e875436b8238093c3f9009
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
DATABASE_URL=./data/dora.db
```

6. Go to **Settings → Networking** → **Generate Domain**
7. Copy the URL (e.g., `https://dora-learning-app-backend-production.up.railway.app`)

---

## Step 2: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New..."** → **"Project"**
3. Import `santaclawbot/dora-learning-app`
4. Set **Root Directory** to `frontend`
5. Framework Preset: **Vite**

### Environment Variables
```
VITE_API_URL=https://YOUR-RAILWAY-URL.up.railway.app
```
(Replace with actual Railway URL from Step 1)

6. Click **Deploy**
7. Copy your Vercel URL (e.g., `https://dora-learning-app.vercel.app`)

---

## Step 3: Update Backend CORS (Optional but recommended)

Go back to Railway → your backend service → Variables, add:
```
CORS_ORIGINS=https://dora-learning-app.vercel.app,https://YOUR-VERCEL-URL.vercel.app
```

---

## Step 4: Test Production

1. Open your Vercel URL in browser
2. Login with:
   - Username: `aiden` / Password: `aiden123`
   - Username: `marcus` / Password: `marcus123`
3. Verify:
   - ✅ Login works
   - ✅ Lessons load
   - ✅ Audio plays (TTS)

---

## Quick Reference

| Service | Purpose | Root Dir |
|---------|---------|----------|
| Railway | Backend API | `backend` |
| Vercel  | Frontend SPA | `frontend` |

## Troubleshooting

**CORS errors?** 
- Make sure `CORS_ORIGINS` includes your Vercel URL
- Or leave it unset to allow all origins (fine for MVP)

**Audio not playing?**
- Check ELEVENLABS_API_KEY is set correctly
- Check browser console for errors

**Login fails?**
- Verify VITE_API_URL points to Railway backend
- Check Railway logs for errors

---

*Deployment configs already added:*
- `backend/railway.json` - Railway config
- `backend/Procfile` - Railway process file  
- `frontend/vercel.json` - Vercel config
