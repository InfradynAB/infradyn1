# Environment & External Services Setup

This guide details how to acquire the necessary API keys and configure the external services required for the Infradyn platform.

---

## 1. Core Infrastructure

### Database (Neon)
1. Sign up at [neon.tech](https://neon.tech).
2. Create a new project and a PostgreSQL database.
3. Copy the "Connection String" (pooled connection is recommended for serverless).
4. Assign to `POSTGRES_URL`.

### Authentication (Better-Auth)
1. Generate a secure 32-character string for `BETTER_AUTH_SECRET`.
2. Set `BETTER_AUTH_URL` to your deployment URL (e.g., `https://app.infradyn.com`).

---

## 2. Media & Processing (AWS)

The system uses AWS for S3 storage and Textract OCR.

1. **IAM User**: Create an IAM user with `AmazonS3FullAccess` and `AmazonTextractFullAccess`.
2. **Access Keys**: Generate Access Key ID and Secret Access Key.
3. **S3 Bucket**: Create a private bucket in your preferred region.
4. **CORS**: Configure CORS on the bucket to allow your application domains.

---

## 3. Intelligence Layer (OpenAI)

Used for document parsing and predictive analytics.

1. Sign up at [platform.openai.com](https://platform.openai.com).
2. Create an API Key in the "API Keys" section.
3. Ensure the account has credit (Usage Tier 1+ is recommended for `gpt-4o` access).

---

## 4. Communication (Resend)

Used for all system emails and notifications.

1. Sign up at [resend.com](https://resend.com).
2. Verify your domain in the "Domains" section.
3. Create an API Key.
4. **Webhooks**: Configure a webhook pointing to `https://your-domain.com/api/webhooks/resend` to track email delivery and bounce events.

---

## 5. Logistics (Maersk & DHL)

### Maersk API
1. Create a developer account at [Maersk Developer Portal](https://developer.maersk.com).
2. Register an app for "Shipment Tracking".
3. Obtain `MAERSK_CONSUMER_KEY` and `CLIENT_SECRET`.

### DHL API
1. Create an account at [DHL Developer Portal](https://developer.dhl.com).
2. Request access to "Unified Tracking".
3. Set the region (`eu`, `ap`, or `us`) and provide the `DHL_API_KEY`.

---

## 6. Google Services

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com).
2. Create a Project and configure the "OAuth Consent Screen".
3. Create credentials for "OAuth Client ID" (Web Application).
4. Add authorized redirect URIs.

### Google Maps (Places)
1. Enable "Places API" and "Geocoding API".
2. Create an API Key and restrict it to your domains.

---

## 7. Deployment (Vercel)

The project is optimized for Vercel.

1. **Environment Variables**: Add all `.env` keys to the project settings in the Vercel dashboard.
2. **Cron Jobs**: The `vercel.json` file automatically configures crons for chasing and forecasting. Ensure `CRON_SECRET` is set in Vercel to match the one in your environment.
