import { NextResponse } from "next/server";
import { 
  getQueuedCampaigns,
  getPendingRecipientsForCampaign,
  markRecipientsSent,
  updateCampaignProgress,
  cleanupCompletedCampaignRecipients,
  getTribeById,
  getSentEmailById,
} from "@/lib/db";
import { sendBulkEmailWithUnsubscribe } from "@/lib/email";

// This endpoint is called by Vercel Cron to process queued email campaigns
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/process-campaigns", "schedule": "* * * * *" }] }
// Runs every minute, processes up to 1000 emails per batch (20 batches of 50)

const BATCH_SIZE = 50; // Resend's batch limit
const MAX_BATCHES_PER_RUN = 20; // 1000 emails per cron run
const RECIPIENTS_PER_RUN = BATCH_SIZE * MAX_BATCHES_PER_RUN;

export async function GET(request: Request) {
  // Verify cron secret - REQUIRED for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // CRON_SECRET must be configured and must match
  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is not configured");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const campaigns = await getQueuedCampaigns();
    
    if (campaigns.length === 0) {
      return NextResponse.json({ message: "No campaigns to process", count: 0 });
    }

    const results = [];

    for (const campaign of campaigns) {
      try {
        // Get tribe info
        const tribe = await getTribeById(campaign.tribe_id);
        if (!tribe) {
          console.error(`Tribe not found for campaign ${campaign.id}`);
          await updateCampaignProgress(campaign.id, campaign.sent_count, 'failed', 'Tribe not found');
          continue;
        }

        // Get pending recipients for this campaign
        const pendingRecipients = await getPendingRecipientsForCampaign(campaign.id, RECIPIENTS_PER_RUN);
        
        if (pendingRecipients.length === 0) {
          // All recipients sent - campaign complete
          const finalEmail = await getSentEmailById(campaign.id);
          await updateCampaignProgress(campaign.id, finalEmail?.sent_count || 0, 'sent');
          await cleanupCompletedCampaignRecipients(campaign.id);
          results.push({ 
            id: campaign.id, 
            status: 'completed',
            sentCount: finalEmail?.sent_count || 0,
            totalRecipients: campaign.total_recipients
          });
          continue;
        }

        // Update status to 'sending' if it was 'queued'
        if (campaign.status === 'queued') {
          await updateCampaignProgress(campaign.id, campaign.sent_count, 'sending');
        }

        // Get base URL and tribe settings
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://madewithtribe.com";
        const ownerName = tribe.owner_name || 'Anonymous';
        const emailSignature = tribe.email_signature || '';
        const escapedBody = (campaign.body || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const allowReplies = campaign.allow_replies !== false;

        // Process recipients in batches
        let totalSentThisRun = 0;
        const errors: string[] = [];

        for (let i = 0; i < pendingRecipients.length; i += BATCH_SIZE) {
          const batch = pendingRecipients.slice(i, i + BATCH_SIZE);
          
          // Send batch
          const result = await sendBulkEmailWithUnsubscribe(
            batch.map(r => ({ email: r.email, unsubscribeToken: r.unsubscribe_token })),
            campaign.subject || 'Untitled',
            escapedBody,
            campaign.body || '',
            ownerName,
            baseUrl,
            campaign.id,
            emailSignature,
            allowReplies
          );

          if (result.sentCount > 0) {
            // Mark these recipients as sent
            await markRecipientsSent(batch.slice(0, result.sentCount).map(r => r.id));
            totalSentThisRun += result.sentCount;
          }

          if (result.errors.length > 0) {
            errors.push(...result.errors);
          }
        }

        // Update campaign progress
        const newSentCount = campaign.sent_count + totalSentThisRun;
        await updateCampaignProgress(campaign.id, newSentCount);

        results.push({ 
          id: campaign.id, 
          status: 'sending',
          sentThisRun: totalSentThisRun,
          totalSent: newSentCount,
          totalRecipients: campaign.total_recipients,
          errors: errors.length > 0 ? errors : undefined
        });

      } catch (error) {
        console.error(`Failed to process campaign ${campaign.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await updateCampaignProgress(campaign.id, campaign.sent_count, 'failed', errorMessage);
        results.push({ 
          id: campaign.id, 
          status: 'error', 
          error: errorMessage
        });
      }
    }

    return NextResponse.json({ 
      message: `Processed ${results.length} campaigns`,
      results 
    });

  } catch (error) {
    console.error("Campaign cron job error:", error);
    return NextResponse.json(
      { error: "Failed to process campaigns" },
      { status: 500 }
    );
  }
}
