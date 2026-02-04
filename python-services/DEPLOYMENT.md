# Python AI Service Deployment Guide

## ⚠️ Why Not Vercel?

Vercel has a **250MB serverless function limit**. The Python service dependencies (`boto3`, `pdfplumber`, `pandas`, `openai`) exceed this limit. Use Railway or Render instead.

## ✅ Recommended: Railway Deployment

Railway is perfect for Python services with heavy dependencies.

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### Step 2: Deploy from GitHub
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your `infradyn1` repository
4. Railway will ask which service to deploy - select **"python-services"** (set as root directory)

### Step 3: Configure Environment Variables
In Railway dashboard, go to **"Variables"** and add:

```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=infradyn-storage
OPENAI_API_KEY=sk-your_key
DATABASE_URL=your_postgres_url
```

### Step 4: Set Build Settings
Railway auto-detects Python. Ensure:
- **Root Directory:** `python-services`
- **Start Command:** Auto-detected from `Procfile`

### Step 5: Get Your Service URL
After deployment, Railway will give you a URL like:
`https://infradyn-python-production.up.railway.app`

### Step 6: Update Next.js
In your main Next.js project on Vercel, add environment variable:
```
PYTHON_SERVICE_URL=https://your-railway-url.railway.app
```

---

## Alternative: Render Deployment

Similarly straightforward:

1. Go to [render.com](https://render.com)
2. **New Web Service** → Connect GitHub repo
3. Set **Root Directory:** `python-services`
4. **Build Command:** `pip install -r requirements.txt`
5. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables in Render dashboard

---

## 🚀 Verification

Once deployed, test your Python service:
```bash
curl https://your-service-url.railway.app/health
# Should return: {"status": "healthy"}
```

Then upload a PO in your Next.js app - it should now use the deployed Python service!
