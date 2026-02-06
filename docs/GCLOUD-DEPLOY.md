# FinMind Backend — Google Cloud Run Deployment

## Prerequisites

1. **Google Cloud account** with billing enabled
2. **gcloud CLI** installed: [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)
3. **Docker** installed (optional — Cloud Build can build for you)

---

## Quick Deploy (5 minutes)

### 1. Login & set project

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 2. Enable required APIs

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

### 3. Deploy directly from source (no Docker needed locally)

```bash
cd server
gcloud run deploy finmind-api \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars "OPENROUTER_API_KEY=sk-or-v1-YOUR_KEY_HERE" \
  --set-env-vars "CORS_ORIGINS=https://your-app.vercel.app,http://localhost:5173" \
  --set-env-vars "ADVISOR_MODEL=google/gemini-2.5-flash" \
  --min-instances 0 \
  --max-instances 3 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60
```

> `--source .` tells Cloud Build to build the Dockerfile automatically in the cloud.
> `asia-southeast1` = Singapore (closest to Thailand).

### 4. Get your service URL

After deploy, you'll see:
```
Service URL: https://finmind-api-xxxxx-as.a.run.app
```

### 5. Set this URL in Vercel

Go to Vercel → Project Settings → Environment Variables:
```
VITE_API_URL = https://finmind-api-xxxxx-as.a.run.app/api
```

Redeploy the frontend.

---

## Alternative: Build & Push Docker Image Manually

```bash
# Build
cd server
docker build -t finmind-api .

# Tag for Artifact Registry
docker tag finmind-api asia-southeast1-docker.pkg.dev/YOUR_PROJECT/finmind/api:latest

# Create repo (first time only)
gcloud artifacts repositories create finmind --repository-format=docker --location=asia-southeast1

# Push
docker push asia-southeast1-docker.pkg.dev/YOUR_PROJECT/finmind/api:latest

# Deploy from image
gcloud run deploy finmind-api \
  --image asia-southeast1-docker.pkg.dev/YOUR_PROJECT/finmind/api:latest \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars "OPENROUTER_API_KEY=sk-or-v1-YOUR_KEY_HERE" \
  --set-env-vars "CORS_ORIGINS=https://your-app.vercel.app"
```

---

## Environment Variables on Cloud Run

| Variable | Required | Example |
|----------|----------|---------|
| `OPENROUTER_API_KEY` | ✅ | `sk-or-v1-xxxx` |
| `PORT` | Auto | Cloud Run sets this to `8080` |
| `CORS_ORIGINS` | ✅ | `https://finmind.vercel.app,http://localhost:5173` |
| `ADVISOR_MODEL` | Optional | `google/gemini-2.5-flash` |
| `DB_PATH` | Optional | `./database.sqlite` |

> ⚠️ **SQLite limitation:** Cloud Run containers are stateless — the SQLite database resets on each new instance. For production, consider:
> - **Cloud SQL (PostgreSQL)** for persistent data
> - **Cloud Storage** to back up SQLite periodically
> - **Firestore** as a serverless alternative
>
> For MVP/demo, SQLite on Cloud Run works fine with `--min-instances 1` to keep the container alive.

---

## Using Secret Manager (recommended for API keys)

```bash
# Create secret
echo -n "sk-or-v1-YOUR_KEY" | gcloud secrets create openrouter-api-key --data-file=-

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding openrouter-api-key \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Deploy with secret
gcloud run deploy finmind-api \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-secrets "OPENROUTER_API_KEY=openrouter-api-key:latest" \
  --set-env-vars "CORS_ORIGINS=https://your-app.vercel.app"
```

---

## Update Deployment

```bash
cd server
gcloud run deploy finmind-api --source . --region asia-southeast1
```

---

## Monitor

```bash
# View logs
gcloud run services logs read finmind-api --region asia-southeast1 --limit 50

# View in browser
gcloud run services describe finmind-api --region asia-southeast1 --format="value(status.url)"
```

---

## Cost Estimate

Cloud Run pricing (asia-southeast1):
- **Free tier:** 2M requests/month, 360K vCPU-seconds, 180K GiB-seconds
- **After free tier:** ~$0.00002400/vCPU-second, ~$0.00000250/GiB-second
- **With `--min-instances 0`:** Pay only when requests come in

For a personal finance app with light usage, **this should stay within the free tier**.
