# Deploy to GitHub - Step by Step

## Prerequisites

- GitHub account (santaclawbot)
- Git installed locally
- Terminal/command line access

## Step 1: Create the GitHub Repository

1. Go to https://github.com/new
2. Fill in the form:
   - **Repository name:** `dora-learning-app`
   - **Description:** A modern learning platform with Telegram integration and personalized lessons
   - **Visibility:** Public
   - **Initialize this repository with:**
     - ❌ Uncheck "Add a README file"
     - ❌ Uncheck "Add .gitignore"
     - ❌ Uncheck "Choose a license"
3. Click **"Create repository"**

## Step 2: Push Your Code

After creating the repo, GitHub will show you commands. Use these instead:

### Option A: Using the Push Helper Script (Easiest)

```bash
cd /path/to/dora-learning-app
./push-to-github.sh
```

The script will:
- Check if you have a git remote configured
- Ask for your GitHub URL if needed
- Push all commits to GitHub
- Show you the final URL

### Option B: Manual Push

```bash
cd /path/to/dora-learning-app

# Set the remote
git remote add origin https://github.com/santaclawbot/dora-learning-app.git

# Verify it was added
git remote -v

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Handle Authentication

If you get authentication errors, use one of these methods:

### Method 1: HTTPS with Personal Access Token (Recommended)

1. Create a token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token"
   - Select "Personal access tokens (classic)"
   - Scopes needed: `repo` (full control of private repositories)
   - Click "Generate token"
   - Copy the token (you won't see it again!)

2. When prompted for password, paste the token

3. (Optional) Save credentials locally:
   ```bash
   git config --global credential.helper store
   # Then do a git push - it will ask for password
   # Paste token, and it will be saved for future use
   ```

### Method 2: SSH Keys (More Secure)

1. Generate SSH key (if you don't have one):
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. Add key to GitHub:
   - Go to https://github.com/settings/ssh
   - Click "New SSH key"
   - Paste your public key from `~/.ssh/id_ed25519.pub`

3. Change remote to use SSH:
   ```bash
   git remote remove origin
   git remote add origin git@github.com:santaclawbot/dora-learning-app.git
   git push -u origin main
   ```

## Step 4: Verify the Push

```bash
# Check git status
git status
# Should show: "Your branch is up to date with 'origin/main'"

# Visit your repo
# https://github.com/santaclawbot/dora-learning-app
```

## Step 5: Clone and Verify

```bash
# Test by cloning in a different directory
mkdir /tmp/test-clone
cd /tmp/test-clone
git clone https://github.com/santaclawbot/dora-learning-app.git

# Verify files are there
cd dora-learning-app
ls -la
# Should see: README.md, backend/, frontend/, docs/, etc.
```

## Troubleshooting

### "remote origin already exists"

```bash
# Remove the old remote
git remote remove origin

# Add the correct one
git remote add origin https://github.com/santaclawbot/dora-learning-app.git

# Try pushing again
git push -u origin main
```

### "fatal: unable to access 'https://...' Could not resolve host"

- Check your internet connection
- Try with SSH instead of HTTPS

### "Updates were rejected because the tip of your current branch is behind"

```bash
# Pull any changes from GitHub first
git pull origin main

# Then push
git push -u origin main
```

### "403 Forbidden"

- Check your authentication (token/SSH key)
- Make sure you're using the right account (santaclawbot)
- Verify your token has `repo` scope

## Quick Reference

```bash
# One-liner: Create remote and push (if not already done)
git remote add origin https://github.com/santaclawbot/dora-learning-app.git && git push -u origin main

# Check current remote
git remote -v

# See all commits
git log --oneline

# Check what will be pushed
git log origin/main..HEAD
```

---

## After Successfully Pushing

1. ✅ Repository will be at: https://github.com/santaclawbot/dora-learning-app

2. ✅ You can now:
   - Share the link with the team
   - Clone it locally: `git clone https://github.com/santaclawbot/dora-learning-app.git`
   - Start development with QUICKSTART.md

3. ✅ Next: Follow SETUP.md or QUICKSTART.md to set up locally

---

**That's it! You're ready to start building! 🚀**

If you run into issues, check the troubleshooting section above or consult GitHub's official help:
- https://docs.github.com/en/get-started/importing-your-projects-to-github
- https://docs.github.com/en/authentication

Let me know if you need help!
