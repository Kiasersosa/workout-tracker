# Workout Tracker PWA - Setup Guide

## Prerequisites
- A Google account
- A GitHub account (free)
- Node.js 18+ installed locally (for development)

## Step 1: Google Cloud Setup

1. Go to https://console.cloud.google.com
2. Create a new project (or select an existing one)
3. **Enable APIs:**
   - Go to "APIs & Services" → "Library"
   - Search and enable: **Google Sheets API**
   - Search and enable: **Google Drive API**
4. **Create OAuth credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - If prompted, configure the consent screen first:
     - User type: External
     - App name: "Workout Tracker"
     - Add your email as test user
   - Application type: **Web application**
   - Name: "Workout Tracker"
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for local dev)
     - `https://your-app.vercel.app/api/auth/callback/google` (for production — add after deploying)
   - Click "Create" and copy the **Client ID** and **Client Secret**

## Step 2: Anthropic API Key

1. Go to https://console.anthropic.com
2. Sign up / sign in
3. Go to "API Keys" and create a new key
4. Copy the key (starts with `sk-ant-`)
5. Add credits ($5 is plenty to start — each workout analysis costs ~$0.05-0.15)

## Step 3: Local Development

1. Clone the repo and install dependencies:
   ```bash
   cd workout-tracker
   npm install
   ```

2. Copy the example env file and fill in your values:
   ```bash
   cp .env.local.example .env.local
   ```

3. Edit `.env.local`:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   AUTH_SECRET=run-npx-auth-secret-to-generate
   AUTH_URL=http://localhost:3000
   ANTHROPIC_API_KEY=sk-ant-your-key
   ```

4. Generate the AUTH_SECRET:
   ```bash
   npx auth secret
   ```
   Copy the output into your `.env.local`

5. Run the dev server:
   ```bash
   npm run dev -- --webpack
   ```
   (The `--webpack` flag is needed because Serwist requires webpack, not Turbopack)

6. Open http://localhost:3000 and sign in with Google

## Step 4: Deploy to Vercel

1. Push your code to a GitHub repository
2. Go to https://vercel.com and sign in with GitHub
3. Click "New Project" → import your repo
4. Add environment variables in Vercel's settings:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `AUTH_SECRET`
   - `ANTHROPIC_API_KEY`
   - `AUTH_URL` → set to your Vercel URL (e.g., `https://workout-tracker-xyz.vercel.app`)
5. Deploy
6. Go back to Google Cloud Console → Credentials → edit your OAuth client
7. Add your Vercel URL to authorized redirect URIs:
   `https://your-app.vercel.app/api/auth/callback/google`

## Step 5: Install as PWA

1. Open your deployed app on your phone's browser (Chrome on Android, Safari on iOS)
2. **Android:** Tap the "Add to Home Screen" prompt or menu → "Install app"
3. **iOS:** Tap Share → "Add to Home Screen"
4. The app will now work like a native app with offline support

## Troubleshooting

- **"Access blocked" on Google sign-in:** Make sure your email is added as a test user in the OAuth consent screen (while the app is in testing mode)
- **Sheets not syncing:** Check that both Sheets API and Drive API are enabled in Google Cloud
- **AI analysis fails:** Verify your Anthropic API key is correct and has credits
- **PWA not installing:** Make sure you're accessing the app over HTTPS (Vercel handles this automatically)
