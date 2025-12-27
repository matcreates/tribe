# Tribe

A minimalist email-list management SaaS.

## Local Development

```bash
npm install
npm run dev
```

## Deploying to Vercel

### 1. Push to GitHub

```bash
git add -A
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/tribe.git
git push -u origin main
```

### 2. Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and import your GitHub repo
2. Vercel will auto-detect Next.js settings

### 3. Set Up Vercel Postgres

1. In your Vercel project dashboard, go to **Storage** tab
2. Click **Create Database** → Select **Postgres**
3. Name it `tribe-db` and create
4. Vercel will automatically add the `POSTGRES_*` environment variables

### 4. Add Environment Variables

In your Vercel project settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `AUTH_SECRET` | Generate with: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your Vercel URL (e.g., `https://tribe.vercel.app`) |

### 5. Initialize the Database

After your first deployment, visit:
```
https://your-app.vercel.app/api/init-db
```

This creates the required database tables.

### 6. Done!

Your app is now live at your Vercel URL.

---

## Features

- **Dashboard** - Analytics overview with subscriber count, emails sent, opening rates
- **Email Composer** - Write and send emails to your tribe
- **Subscriber Management** - Add, remove, search, import/export subscribers
- **Public Join Page** - Shareable page for new subscribers
- **Authentication** - Email/password login and signup

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Vercel Postgres
- **Auth**: NextAuth.js v5
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Environment Variables

| Variable | Description |
|----------|-------------|
| `POSTGRES_URL` | Auto-added by Vercel Postgres |
| `POSTGRES_PRISMA_URL` | Auto-added by Vercel Postgres |
| `POSTGRES_URL_NON_POOLING` | Auto-added by Vercel Postgres |
| `POSTGRES_USER` | Auto-added by Vercel Postgres |
| `POSTGRES_HOST` | Auto-added by Vercel Postgres |
| `POSTGRES_PASSWORD` | Auto-added by Vercel Postgres |
| `POSTGRES_DATABASE` | Auto-added by Vercel Postgres |
| `AUTH_SECRET` | Secret for NextAuth.js sessions |
| `NEXTAUTH_URL` | Your app's URL |
