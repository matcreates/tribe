import { NextResponse } from "next/server";
import { 
  getScheduledEmailsToSend, 
  updateScheduledEmailStatus,
  getSubscribersByTribeId,
  getTribeById,
} from "@/lib/db";
import { sendBulkEmailWithUnsubscribe } from "@/lib/email";

// This endpoint is called by Vercel Cron to send scheduled emails
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/send-scheduled", "schedule": "*/5 * * * *" }] }

export async function GET(request: Request) {
  // Verify cron secret for security (optional but recommended)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // If CRON_SECRET is set, verify it
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const scheduledEmails = await getScheduledEmailsToSend();
    
    if (scheduledEmails.length === 0) {
      return NextResponse.json({ message: "No scheduled emails to send", count: 0 });
    }

    const results = [];

    for (const email of scheduledEmails) {
      try {
        // Mark as processing to prevent duplicate sends
        await updateScheduledEmailStatus(email.id, 'processing');

        // Get tribe info
        const tribe = await getTribeById(email.tribe_id);
        if (!tribe) {
          console.error(`Tribe not found for email ${email.id}`);
          continue;
        }

        // Get recipients based on filter
        const allSubscribers = await getSubscribersByTribeId(email.tribe_id);
        let filteredSubscribers = allSubscribers.filter(s => !s.unsubscribed);
        
        const filter = email.recipient_filter || 'verified';
        switch (filter) {
          case "verified":
            filteredSubscribers = filteredSubscribers.filter(s => s.verified);
            break;
          case "non-verified":
            filteredSubscribers = filteredSubscribers.filter(s => !s.verified);
            break;
          case "all":
            break;
        }

        if (filteredSubscribers.length === 0) {
          await updateScheduledEmailStatus(email.id, 'sent', 0);
          results.push({ id: email.id, status: 'sent', recipientCount: 0 });
          continue;
        }

        // Get base URL
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://madewithtribe.com";
        const ownerName = tribe.owner_name || 'Anonymous';
        const emailSignature = tribe.email_signature || '';
        const escapedBody = (email.body || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const allowReplies = email.allow_replies !== false; // Default to true

        // Send emails
        const result = await sendBulkEmailWithUnsubscribe(
          filteredSubscribers.map(s => ({ email: s.email, unsubscribeToken: s.unsubscribe_token || '' })),
          email.subject || 'Untitled',
          escapedBody,
          email.body || '',
          ownerName,
          baseUrl,
          email.id,
          emailSignature,
          allowReplies
        );

        // Update status to sent
        await updateScheduledEmailStatus(email.id, 'sent', result.sentCount);
        
        results.push({ 
          id: email.id, 
          status: 'sent', 
          recipientCount: result.sentCount,
          errors: result.errors 
        });

      } catch (error) {
        console.error(`Failed to send scheduled email ${email.id}:`, error);
        results.push({ 
          id: email.id, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({ 
      message: `Processed ${results.length} scheduled emails`,
      results 
    });

  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Failed to process scheduled emails" },
      { status: 500 }
    );
  }
}

