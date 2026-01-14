# AGENTS.md - AI Agent Context for Tribe

This document provides context for AI agents working on this codebase.

## Project Overview

**Tribe** is an email newsletter platform that allows creators to build and engage with their audience ("tribe"). Users can send emails to their subscribers, track opens, receive replies, and manage their tribe through a beautiful dark-themed dashboard.

**Live URL:** https://www.madewithtribe.com (note: uses `www.` prefix - important for webhooks!)

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (via `pg` package)
- **Authentication:** NextAuth.js (Auth.js v5)
- **Email Service:** Resend
- **Payments:** Stripe
- **Styling:** Tailwind CSS with custom glass-effect buttons
- **Hosting:** Vercel

## Key Environment Variables

```
DATABASE_URL          # PostgreSQL connection string
RESEND_API_KEY        # Resend API key (needs FULL ACCESS for replies feature)
RESEND_FROM_EMAIL     # Sender email (e.g., "Tribe <noreply@madewithtribe.com>")
RESEND_REPLY_DOMAIN   # Domain for reply-to addresses (e.g., "madewithtribe.com")
STRIPE_SECRET_KEY     # Stripe secret key
STRIPE_WEBHOOK_SECRET # Stripe webhook signing secret
NEXT_PUBLIC_BASE_URL  # Base URL (https://www.madewithtribe.com)
AUTH_SECRET           # NextAuth secret
```

## Important Architecture Decisions

### 1. Email Replies System

The reply system was complex to implement. Here's how it works:

1. **Sending emails with reply-to:** When sending emails with "Allow replies" enabled, we set a custom `replyTo` address in the format: `reply-{emailId}@madewithtribe.com`

2. **Receiving replies:** Resend receives the reply and triggers a webhook to `/api/webhook-inbound`

3. **Fetching reply content:** The webhook payload does NOT include the email body! You must fetch it via:
   ```
   GET https://api.resend.com/emails/receiving/{email_id}
   ```
   Note: It's `/emails/receiving/` (not `/received/`)

4. **API Key permissions:** The Resend API key must have "Full Access" (not just "Sending access") to fetch received emails.

5. **Text extraction:** Email replies often come as HTML-only (no plain text). We extract text from HTML and strip:
   - Quoted original email ("On [date] wrote:...")
   - Email signatures ("Sent from my iPhone")
   - URLs and email addresses

### 2. Webhook URL Must Use www.

The domain `madewithtribe.com` redirects (307) to `www.madewithtribe.com`. **Webhook URLs must use the www. prefix** or they will fail with 307 redirects.

Correct: `https://www.madewithtribe.com/api/webhook-inbound`
Wrong: `https://madewithtribe.com/api/webhook-inbound`

### 3. Resend SDK Field Names

The Resend SDK uses **camelCase** field names, not snake_case:
- ✅ `replyTo` (correct)
- ❌ `reply_to` (wrong - won't work)

### 4. Middleware Configuration

The middleware at `src/middleware.ts` handles authentication. API routes and webhook endpoints are excluded from auth checks. If adding new webhook endpoints, ensure they're added to the matcher exclusion pattern.

## Database Schema

Key tables:
- `users` - User accounts
- `tribes` - Each user's tribe settings
- `subscribers` - Email subscribers for each tribe
- `sent_emails` - Sent email records
- `email_replies` - Replies received from subscribers
- `scheduled_emails` - Emails scheduled for future sending

## Key Files

- `src/lib/email.ts` - Email sending logic (Resend integration)
- `src/lib/db.ts` - Database queries and schema
- `src/lib/actions.ts` - Server actions for frontend
- `src/app/api/webhook-inbound/route.ts` - Inbound email webhook handler
- `src/app/api/stripe/webhook/route.ts` - Stripe webhook handler
- `src/middleware.ts` - Auth middleware (excludes API routes)

## Resend Configuration

### Webhooks (in Resend Dashboard)
- **Endpoint:** `https://www.madewithtribe.com/api/webhook-inbound`
- **Event:** `email.received`

### Domain Setup
- MX records point to Resend for receiving emails
- Domain verified for sending

## Stripe Configuration

### Products
- Subscription-based model for sending emails

### Webhooks
- Endpoint: `https://www.madewithtribe.com/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

## Common Issues & Solutions

### Issue: Webhook returns 307 redirect
**Solution:** Use `www.madewithtribe.com` instead of `madewithtribe.com`

### Issue: Replies show as "[Empty reply]"
**Solutions:**
1. Ensure Resend API key has "Full Access" permissions
2. Check that we're calling `/emails/receiving/{id}` (not `/received/`)
3. HTML content extraction is working (text field may be null)

### Issue: reply_to not being set on outgoing emails
**Solution:** Use `replyTo` (camelCase) not `reply_to` in Resend SDK

### Issue: Build fails with "pool" import error
**Solution:** Don't import `pool` directly in API routes that might run on edge. Use the `query` function instead.

## UI/UX Notes

- Dark theme throughout (background: #0a0a0a)
- Glass-effect buttons with shine animation (see `globals.css`)
- Responsive sidebar that slides in on mobile
- Russian language support (UTF-8) for international users

## Testing Replies Locally

1. Use ngrok or similar to expose local server
2. Update Resend webhook URL temporarily
3. Send test email with replies enabled
4. Reply from your email client
5. Check Vercel/local logs for webhook processing

## Future Considerations

- Click tracking for links in emails
- A/B testing for subject lines
- Subscriber segmentation
- Email templates
- Analytics dashboard improvements
