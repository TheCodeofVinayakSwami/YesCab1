# Yes Cab Backend - Render Deployment Guide

This guide walks you through deploying the Yes Cab backend on **Render** with two separate links:
- **Main project URL** (Flask web service)
- **Admin link** (static site with redirect to admin page)

---

## Prerequisites

1. **GitHub account** – with repo access
2. **Render account** – free tier available at [render.com](https://render.com)
3. **Database** – PostgreSQL (optional: use Render's managed Postgres)
4. **Razorpay keys** – for payment integration (if needed)

---

## Step 1: Prepare & Push to GitHub

### 1a. Initialize Git (local machine)
```bash
cd d:\yescab-backend
git init
git add .
git commit -m "Prepare for Render deployment"
git branch -M main
```

### 1b. Create GitHub Repository
- Go to [github.com/new](https://github.com/new)
- Create repo name: `yescab-backend` (or similar)
- **Do NOT** initialize with README (you already have files)
- Click "Create repository"

### 1c. Push to GitHub
Replace `YOUR_USERNAME` and `YOUR_REPO_URL`:
```bash
git remote add origin https://github.com/YOUR_USERNAME/yescab-backend.git
git push -u origin main
```

---

## Step 2: Set Up Render Web Service (Main Project)

### 2a. Create Web Service
1. Go to [render.com/dashboard](https://render.com/dashboard)
2. Click **+ New** → **Web Service**
3. Select **Connect a repository** → search and connect `yescab-backend`
4. Choose the `main` branch

### 2b. Configure Service
Set the following fields:

| Field | Value |
|-------|-------|
| **Name** | `yescab-backend` |
| **Environment** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn app:app --bind 0.0.0.0:$PORT` |
| **Pricing Plan** | Free (or Starter) |

### 2c. Add Environment Variables
In the **Environment** section, add:

```
DATABASE_URL=postgresql://user:password@host:port/dbname
RZP_KEY_ID=YOUR_RAZORPAY_KEY_ID
RZP_KEY_SECRET=YOUR_RAZORPAY_KEY_SECRET
```

**To get DATABASE_URL:**
- **Option A (Render Postgres)**: Click **+ New** → **PostgreSQL** → create DB → copy connection string
- **Option B (Neon)**: Sign up at [neon.tech](https://neon.tech) → create project → copy connection string
- **Option C (Existing DB)**: Use your current DB connection string

### 2d. Deploy
Click **Create Web Service** → Render will build & deploy automatically.

**After ~2 min**, you'll see:
- ✅ Deployment successful
- 📍 **Backend URL** (e.g., `https://yescab-backend.onrender.com`)
- Copy this URL for the next step

---

## Step 3: Set Up Render Static Site (Admin Link)

### 3a. Create Static Site
1. Go to [render.com/dashboard](https://render.com/dashboard)
2. Click **+ New** → **Static Site**
3. Connect same repository (`yescab-backend`)
4. Choose the `main` branch

### 3b. Configure Site
Set the following:

| Field | Value |
|-------|-------|
| **Name** | `yescab-admin` |
| **Root Directory** | `admin_site` |
| **Build Command** | (leave empty) |

### 3c. Deploy
Click **Create Static Site** → Render will deploy instantly.

**After deploy**, you'll see:
- ✅ Deployment successful
- 📍 **Admin URL** (e.g., `https://yescab-admin.onrender.com`)

### 3d. Update Admin Redirect
1. Open `admin_site/index.html` locally
2. Replace `BACKEND_URL` with your backend URL (from Step 2d)
   - Example: replace `BACKEND_URL` with `https://yescab-backend.onrender.com`
3. Save and push to GitHub:
```bash
git add admin_site/index.html
git commit -m "Update admin redirect to backend URL"
git push
```

4. Go to Render dashboard → **yescab-admin** static site → click **Redeploy** (to sync latest changes)

---

## Step 4: Test Both URLs

### Main Project
Visit: **`https://yescab-backend.onrender.com`**
- Expected: Homepage with booking forms

### Admin Page
Visit: **`https://yescab-admin.onrender.com`**
- Expected: Redirects to `https://yescab-backend.onrender.com/admin`
- Shows: Admin panel with all bookings from the database

---

## Troubleshooting

### Web Service Errors
1. **"DATABASE_URL not set"**
   - Go to Service > Environment → add `DATABASE_URL`

2. **"Database connection failed"**
   - Check `DATABASE_URL` is correct and accessible from Render
   - For Neon: ensure IP allowlist includes Render IPs

3. **Static assets missing (CSS, JS broken)**
   - They're served from `/static` by Flask (already configured in `app.py`)

### Admin URL Shows Blank Page
- Check browser console for errors
- Verify `BACKEND_URL` is correctly replaced in `admin_site/index.html`
- Ensure backend is running and accessible

### Bookings Not Showing in Admin
- Check `DATABASE_URL` env var is set and correct
- Ensure database has `bookings` table (app creates it on first request)
- Try visiting backend `/api/bookings` to test the API

---

## Optional: Custom Domains

If you have a custom domain (e.g., `yescab.com`):

### For Main Project
1. Render Web Service > Settings → **Custom Domains**
2. Add domain (e.g., `app.yescab.com`)
3. Add DNS CNAME record pointing to Render URL

### For Admin
1. Render Static Site > Settings → **Custom Domains**
2. Add domain (e.g., `admin.yescab.com`)
3. Add DNS CNAME record

---

## Environment Variables (Reference)

| Variable | Example | Required |
|----------|---------|----------|
| `DATABASE_URL` | `postgresql://user:pw@host:5432/db` | ✅ Yes |
| `RZP_KEY_ID` | `rzp_live_xxxxx` | ⚠️ If using payments |
| `RZP_KEY_SECRET` | `secret_xxxxx` | ⚠️ If using payments |
| `FLASK_ENV` | `production` | Optional |

---

## Files Used in Deployment

- **`Procfile`** – Tells Render how to start the app (`gunicorn app:app --bind 0.0.0.0:$PORT`)
- **`requirements.txt`** – Python dependencies (Flask, psycopg2-binary, gunicorn, etc.)
- **`app.py`** – Main Flask application
- **`template/admin.html`** – Admin dashboard (rendered by Flask at `/admin`)
- **`admin_site/index.html`** – Redirect page (served by static site)
- **`static/`** – CSS, JS, images (served by Flask)

---

## Quick Reference

| What | URL | Type |
|------|-----|------|
| Main site | `https://yescab-backend.onrender.com` | Flask Web Service |
| Bookings API | `https://yescab-backend.onrender.com/api/bookings` | Flask endpoint |
| Admin (static) | `https://yescab-admin.onrender.com` | Render Static Site (redirects) |
| Admin (via backend) | `https://yescab-backend.onrender.com/admin` | Flask route |

---

## Support

- **Render Docs**: https://render.com/docs
- **Flask Guide**: https://flask.palletsprojects.com
- **PostgreSQL Connection**: https://www.postgresql.org/docs/current/libpq-envars.html

