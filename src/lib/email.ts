import { Resend } from "resend";

let resend: Resend | null = null;

function getResendClient() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL || "Tribe <onboarding@resend.dev>";
}

interface RecipientWithToken {
  email: string;
  unsubscribeToken: string;
}

export async function sendBulkEmailWithUnsubscribe(
  recipients: RecipientWithToken[],
  subject: string,
  escapedBody: string,
  plainTextBody: string,
  ownerName: string,
  baseUrl: string,
  emailId?: string
): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
  if (recipients.length === 0) {
    return { success: true, sentCount: 0, errors: [] };
  }

  const client = getResendClient();
  const fromEmail = getFromEmail();
  const errors: string[] = [];
  let sentCount = 0;

  // Send emails in batches of 50 (Resend's batch limit)
  const batchSize = 50;
  
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    // Create personalized emails with unsubscribe links
    const batchEmails = batch.map(recipient => {
      const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${recipient.unsubscribeToken}`;
      
      // Tracking pixel for open rate
      const trackingPixel = emailId 
        ? `<img src="${baseUrl}/api/track/${emailId}/pixel.gif" width="1" height="1" alt="" style="display:none;" />`
        : '';

      const htmlBody = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #121212; margin: 0; padding: 40px 20px;">
            <div style="max-width: 500px; margin: 0 auto; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 40px;">
              <div style="color: rgba(255,255,255,0.8); font-size: 15px; line-height: 1.7; white-space: pre-wrap;">${escapedBody}</div>
              <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
                <p style="color: rgba(255,255,255,0.3); font-size: 12px; margin: 0 0 8px;">
                  Sent from ${ownerName}'s Tribe
                </p>
                <a href="${unsubscribeUrl}" style="color: rgba(255,255,255,0.25); font-size: 11px; text-decoration: underline;">
                  Unsubscribe
                </a>
              </div>
            </div>
            ${trackingPixel}
          </body>
        </html>
      `;

      const textBody = `${plainTextBody}\n\n---\nSent from ${ownerName}'s Tribe\nUnsubscribe: ${unsubscribeUrl}`;

      return {
        from: fromEmail,
        to: [recipient.email],
        subject,
        html: htmlBody,
        text: textBody,
      };
    });

    try {
      const { data, error } = await client.batch.send(batchEmails);
      
      if (error) {
        console.error("Batch send error:", error);
        errors.push(`Batch ${i / batchSize + 1}: ${error.message || JSON.stringify(error)}`);
      } else if (data) {
        sentCount += data.data.length;
        console.log(`Batch ${i / batchSize + 1}: Sent ${data.data.length} emails`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Batch send exception:", msg);
      errors.push(`Batch ${i / batchSize + 1}: ${msg}`);
    }
  }

  return {
    success: errors.length === 0,
    sentCount,
    errors,
  };
}

export async function sendVerificationEmail(
  to: string,
  tribeName: string,
  ownerName: string,
  verificationToken: string,
  baseUrl: string
) {
  const verifyUrl = `${baseUrl}/api/verify?token=${verificationToken}`;

  const client = getResendClient();
  console.log(`Sending verification email to: ${to}, token: ${verificationToken.substring(0, 8)}...`);
  console.log(`Resend API key present: ${!!process.env.RESEND_API_KEY}`);
  console.log(`Base URL: ${baseUrl}, Verify URL: ${baseUrl}/api/verify?token=${verificationToken}`);
  
  const { data, error } = await client.emails.send({
    from: getFromEmail(),
    to: [to],
    subject: `Confirm your subscription to ${ownerName}'s tribe`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #121212; margin: 0; padding: 40px 20px;">
          <div style="max-width: 400px; margin: 0 auto; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 40px;">
            <h1 style="color: rgba(255,255,255,0.9); font-size: 20px; font-weight: 500; margin: 0 0 16px; text-align: center;">
              Confirm your subscription
            </h1>
            <p style="color: rgba(255,255,255,0.5); font-size: 14px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
              You requested to join <strong style="color: rgba(255,255,255,0.7);">${ownerName}'s</strong> tribe. Click the button below to confirm.
            </p>
            <div style="text-align: center;">
              <a href="${verifyUrl}" style="display: inline-block; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 500; letter-spacing: 0.05em;">
                CONFIRM SUBSCRIPTION
              </a>
            </div>
            <p style="color: rgba(255,255,255,0.3); font-size: 12px; margin: 32px 0 0; text-align: center;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error("Resend API returned an error:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    const errorMessage = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
    throw new Error(`Failed to send verification email: ${errorMessage}`);
  }

  if (!data || !data.id) {
    console.error("Resend API returned no data or email ID:", { data });
    throw new Error("Failed to send verification email: No email ID returned from Resend");
  }

  console.log(`Verification email sent successfully to ${to}, email ID: ${data.id}`);
  return { success: true, emailId: data.id };
}

