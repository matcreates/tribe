# Tribe - AI Agent Context Guide

This document provides context for AI agents working on this codebase.

## Project Overview

**Tribe** is a newsletter/email platform that allows creators to build and communicate with their audience ("tribe"). Users can collect subscribers, send emails, track opens, and receive replies.

**Live URL:** https://www.madewithtribe.com (note: uses `www.` subdomain)

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (Neon)
- **Authentication:** NextAuth.js (Auth.js v5)
- **Email:** Resend
- **Payments:** Stripe
- **Hosting:** Vercel
- **Styling:** Tailwind CSS

## Key Integrations

### Resend (Email)

- **Sending emails:** Uses `resend.batch.send()` for bulk sending
- **Receiving emails (replies):** 
  - Webhook endpoint: `/api/webhook-inbound` (must use `www.madewithtribe.com`)
  - Webhook event: `email.received`
  - **CRITICAL:** The webhook only sends metadata, NOT the email body
  - Must call `GET https://api.resend.com/emails/receiving/:id` to fetch email content
  - API key needs "Full Access" permissions (not just "Sending")
- **Reply-to format:** `reply-{emailId}@madewithtribe.com`
- **SDK field names:** Use `replyTo` (camelCase), not `reply_to`

### Stripe (Payments)

- Subscription-based model
- Webhook endpoint: `/api/stripe/webhook`
- Manual sync endpoint: `/api/stripe/verify-subscription` (fallback if webhook fails)
- API version: Use latest stable version

### Vercel

- **Domain redirect:** `madewithtribe.com` → `www.madewithtribe.com` (307 redirect)
- **Important:** All webhook URLs must use `www.madewithtribe.com` to avoid redirect issues
- Environment variables are set in Vercel dashboard

## Database Schema (PostgreSQL)

Key tables:
- `users` - User accounts
- `tribes` - Each user has one tribe (settings, name, etc.)
- `subscribers` - People who joined a tribe
- `sent_emails` - Emails sent to tribe
- `email_replies` - Replies received from subscribers
- `scheduled_emails` - Emails scheduled for future sending

## Directory Structure

```
src/
├── app/
│   ├── (auth)/          # Login/signup pages
│   ├── (dashboard)/     # Protected dashboard pages
│   │   ├── dashboard/   # Main dashboard
│   │   ├── email/[id]/  # Email insights page
│   │   ├── new-email/   # Compose new email
│   │   ├── tribe/       # Subscriber management
│   │   ├── join/        # Join page settings
│   │   └── settings/    # User settings
│   ├── api/             # API routes
│   │   ├── inbound/     # Legacy inbound endpoint
│   │   ├── webhook-inbound/  # Current inbound webhook
│   │   ├── stripe/      # Stripe endpoints
│   │   └── ...
│   └── j/[slug]/        # Public join pages
├── components/          # React components
├── lib/
│   ├── actions.ts       # Server actions
│   ├── auth.ts          # NextAuth config
│   ├── db.ts            # Database queries
│   ├── email.ts         # Email sending functions
│   └── types.ts         # TypeScript types
└── middleware.ts        # Auth middleware
```

## Environment Variables

Required in Vercel:
```
DATABASE_URL=           # Neon PostgreSQL connection string
AUTH_SECRET=            # NextAuth secret
RESEND_API_KEY=         # Resend API key (needs Full Access)
RESEND_FROM_EMAIL=      # e.g., "noreply@madewithtribe.com"
RESEND_REPLY_DOMAIN=    # e.g., "madewithtribe.com"
STRIPE_SECRET_KEY=      # Stripe secret key
STRIPE_WEBHOOK_SECRET=  # Stripe webhook signing secret
NEXT_PUBLIC_BASE_URL=   # e.g., "https://www.madewithtribe.com"
```

## Common Issues & Solutions

### 1. Webhook returns 307 redirect
**Cause:** Using `madewithtribe.com` instead of `www.madewithtribe.com`
**Solution:** Always use `www.` prefix for webhook URLs

### 2. Replies show as "[Empty reply]"
**Cause:** Resend webhook doesn't include email body in payload
**Solution:** Fetch email content via `GET /emails/receiving/:id` API

### 3. API key restricted error
**Cause:** Resend API key only has "Sending" permissions
**Solution:** Create new API key with "Full Access" in Resend dashboard

### 4. Reply-to not working
**Cause:** Using `reply_to` instead of `replyTo` in Resend SDK
**Solution:** Use camelCase `replyTo` field name

### 5. Middleware blocking API routes
**Cause:** Auth middleware intercepting webhook requests
**Solution:** Exclude webhook paths in middleware matcher or check pathname first

## Key Code Patterns

### Server Actions (lib/actions.ts)
All database mutations go through server actions with auth checks:
```typescript
async function getTribe() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  // ...
}
```

### Email Sending (lib/email.ts)
Emails use batch sending with personalized unsubscribe links:
```typescript
const emailConfig = {
  from: fromEmail,
  to: [recipient.email],
  subject,
  html: htmlBody,
  replyTo: allowReplies ? `reply-${emailId}@${domain}` : undefined,
};
```

### Inbound Webhook (api/webhook-inbound/route.ts)
1. Receive webhook (metadata only)
2. Extract `email_id` from payload
3. Fetch full email via `GET /emails/receiving/:id`
4. Parse reply address to get original `emailId`
5. Clean up reply text (remove quoted content)
6. Save to database

## UI Notes

- Uses custom "liquid glass" button effect (see `globals.css`)
- Dark theme with subtle transparency effects
- Toast notifications via custom `Toast` component
- Modals for confirmations and imports

## Testing Tips

1. Check Vercel Logs for webhook debugging
2. Resend dashboard shows received emails under "Receiving" tab
3. Use Resend's "Replay" button to re-test webhooks
4. Database queries can be tested via `/api/init-db` endpoint
