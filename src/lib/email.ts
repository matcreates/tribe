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

function getFromEmail(ownerName?: string) {
  const baseEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  // Extract just the email address if it's in "Name <email>" format
  const emailMatch = baseEmail.match(/<([^>]+)>/);
  const emailOnly = emailMatch ? emailMatch[1] : baseEmail.replace(/^[^<]*<|>$/g, '').trim() || baseEmail;
  
  // Use owner name if provided, otherwise default to "Tribe"
  const displayName = ownerName || "Tribe";
  return `${displayName} <${emailOnly}>`;
}

interface RecipientWithToken {
  email: string;
  unsubscribeToken: string;
}

// Get the reply-to domain (should match your verified Resend domain)
function getReplyDomain() {
  return process.env.RESEND_REPLY_DOMAIN || "madewithtribe.com";
}

// Convert plain text paragraphs to styled HTML paragraphs for ebook-like reading
function formatBodyAsEbook(text: string): string {
  // Split by double newlines (paragraphs) or single newlines
  const paragraphs = text.split(/\n\n+/);
  
  return paragraphs.map(para => {
    // Handle single line breaks within paragraphs
    const lines = para.trim();
    if (!lines) return '';
    
    // Check if it looks like a heading (short, no period at end)
    const isHeading = lines.length < 80 && !lines.endsWith('.') && !lines.includes('\n');
    
    if (isHeading && lines.length < 60) {
      return `<p style="color: rgba(255,255,255,0.95); font-size: 18px; font-weight: 500; line-height: 1.5; margin: 0 0 24px 0;">${lines}</p>`;
    }
    
    return `<p style="color: rgba(255,255,255,0.85); font-size: 17px; font-weight: 400; line-height: 1.85; margin: 0 0 28px 0;">${lines.replace(/\n/g, '<br>')}</p>`;
  }).filter(p => p).join('\n');
}

export async function sendBulkEmailWithUnsubscribe(
  recipients: RecipientWithToken[],
  subject: string,
  escapedBody: string,
  plainTextBody: string,
  ownerName: string,
  baseUrl: string,
  emailId?: string,
  emailSignature?: string,
  allowReplies: boolean = true
): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
  console.log(`sendBulkEmailWithUnsubscribe called: emailId=${emailId}, allowReplies=${allowReplies}, recipients=${recipients.length}`);
  
  if (recipients.length === 0) {
    return { success: true, sentCount: 0, errors: [] };
  }

  const client = getResendClient();
  const fromEmail = getFromEmail(ownerName);
  const errors: string[] = [];
  let sentCount = 0;

  // Send emails in batches of 50 (Resend's batch limit)
  const batchSize = 50;
  
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    // Create personalized emails with unsubscribe links
    const batchEmails = batch.map(recipient => {
      const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${recipient.unsubscribeToken}`;
      
      // Tracking pixel for open rate (invisible, at the end)
      const trackingPixel = emailId 
        ? `<img src="${baseUrl}/api/track/${emailId}/pixel.gif" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`
        : '';

      // Format signature for HTML
      let signatureHtml = '';
      let signatureText = '';
      if (emailSignature && emailSignature.trim()) {
        const escapedSig = emailSignature.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        // Auto-link URLs in signature
        const linkedSig = escapedSig.replace(
          /(https?:\/\/[^\s]+)/g,
          '<a href="$1" style="color: #E8B84A; text-decoration: underline;">$1</a>'
        );
        signatureHtml = `
          <div style="margin-top: 48px; padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.08);">
            <p style="color: rgba(255,255,255,0.5); font-size: 15px; line-height: 1.7; margin: 0; white-space: pre-wrap;">${linkedSig}</p>
          </div>
        `;
        signatureText = `\n\n---\n${emailSignature}`;
      }

      // Reply notice when replies are enabled
      let replyNoticeHtml = '';
      let replyNoticeText = '';
      if (allowReplies) {
        replyNoticeHtml = `
          <div style="margin-top: 40px; padding: 20px 24px; background: rgba(255,255,255,0.03); border-radius: 8px;">
            <p style="color: rgba(255,255,255,0.5); font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
              Replies are on, feel free to answer this email and ${ownerName} will receive your reply.
            </p>
          </div>
        `;
        replyNoticeText = `\n\n---\nReplies are on, feel free to answer this email and ${ownerName} will receive your reply.`;
      }

      // Format body as ebook-style paragraphs
      const formattedBody = formatBodyAsEbook(plainTextBody);

      // Clean, ebook-style HTML email template
      const htmlBody = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${subject}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #0a0a0a; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    <table role="presentation" style="width: 100%; border: 0; border-spacing: 0; background-color: #0a0a0a;">
      <tr>
        <td align="center" style="padding: 48px 24px;">
          <table role="presentation" style="width: 100%; max-width: 560px; border: 0; border-spacing: 0;">
            <tr>
              <td style="padding: 0;">
                <!-- Main Content -->
                <div style="font-family: Georgia, 'Times New Roman', serif;">
                  ${formattedBody}
                </div>
                
                <!-- Signature -->
                ${signatureHtml}
                
                <!-- Reply Notice -->
                ${replyNoticeHtml}
                
                <!-- Footer -->
                <div style="margin-top: 56px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
                  <p style="color: rgba(255,255,255,0.25); font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0 0 12px 0;">
                    Sent by ${ownerName}
                  </p>
                  <a href="https://www.madewithtribe.com" target="_blank" style="color: rgba(255,255,255,0.3); font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-decoration: none; display: inline-block; margin-bottom: 12px;">
                    made with <span style="font-weight: 600;">tribe</span>
                  </a>
                  <br>
                  <a href="${unsubscribeUrl}" style="color: rgba(255,255,255,0.2); font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-decoration: underline;">
                    Unsubscribe
                  </a>
                </div>
                
                ${trackingPixel}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

      const textBody = `${plainTextBody}${signatureText}${replyNoticeText}\n\n---\nSent by ${ownerName}\nmade with tribe: https://www.madewithtribe.com\nUnsubscribe: ${unsubscribeUrl}`;

      // Build the email configuration with proper headers for deliverability
      // Note: Resend SDK uses camelCase field names
      const replyDomain = getReplyDomain();
      const replyToAddress = allowReplies && emailId ? `reply-${emailId}@${replyDomain}` : undefined;
      
      console.log(`Email config: allowReplies=${allowReplies}, emailId=${emailId}, replyTo=${replyToAddress}`);
      
      const emailConfig: {
        from: string;
        to: string[];
        subject: string;
        html: string;
        text: string;
        replyTo?: string;
        headers?: Record<string, string>;
      } = {
        from: fromEmail,
        to: [recipient.email],
        subject,
        html: htmlBody,
        text: textBody,
        // Add List-Unsubscribe header for better deliverability
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      };

      // Add reply-to address for tracking replies (using camelCase for Resend SDK)
      if (replyToAddress) {
        emailConfig.replyTo = replyToAddress;
      }

      return emailConfig;
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
  baseUrl: string,
  giftId?: string | null
) {
  const verifyUrl = `${baseUrl}/api/verify?token=${verificationToken}`;
  const isGiftSignup = !!giftId;

  const client = getResendClient();
  console.log(`Sending verification email to: ${to}, token: ${verificationToken.substring(0, 8)}..., gift: ${giftId || 'none'}`);
  console.log(`Resend API key present: ${!!process.env.RESEND_API_KEY}`);
  console.log(`Base URL: ${baseUrl}, Verify URL: ${baseUrl}/api/verify?token=${verificationToken}`);
  
  const subject = isGiftSignup 
    ? `Verify to receive your gift from ${ownerName}`
    : `You're Almost In! Confirm Your Spot in ${ownerName}'s Tribe.`;
  
  const buttonText = isGiftSignup ? 'VERIFY AND DOWNLOAD GIFT' : 'CONFIRM';
  const description = isGiftSignup
    ? `You requested to join <strong style="color: rgba(255,255,255,0.7);">${ownerName}'s</strong> tribe and receive a gift. Click the button below to verify your email and download your gift.`
    : `You requested to join <strong style="color: rgba(255,255,255,0.7);">${ownerName}'s</strong> tribe. Click the button below to confirm your spot.`;
  
  const { data, error } = await client.emails.send({
    from: getFromEmail(ownerName),
    to: [to],
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #121212; margin: 0; padding: 40px 20px;">
          <div style="max-width: 400px; margin: 0 auto; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 40px;">
            ${isGiftSignup ? `
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 40px;">🎁</span>
            </div>
            ` : ''}
            <h1 style="color: rgba(255,255,255,0.9); font-size: 20px; font-weight: 500; margin: 0 0 16px; text-align: center;">
              ${isGiftSignup ? 'Verify to get your gift' : 'Confirm your spot'}
            </h1>
            <p style="color: rgba(255,255,255,0.5); font-size: 14px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
              ${description}
            </p>
            <div style="text-align: center;">
              <a href="${verifyUrl}" style="display: inline-block; background: ${isGiftSignup ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.08)'}; border: 1px solid ${isGiftSignup ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.1)'}; color: ${isGiftSignup ? 'rgba(34, 197, 94, 0.9)' : 'rgba(255,255,255,0.8)'}; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 500; letter-spacing: 0.05em;">
                ${buttonText}
              </a>
            </div>
            <p style="color: rgba(255,255,255,0.3); font-size: 12px; margin: 32px 0 16px; text-align: center;">
              If you didn't request this, you can safely ignore this email.
            </p>
            <a href="https://www.madewithtribe.com" target="_blank" style="color: rgba(255,255,255,0.3); font-size: 11px; text-decoration: none; display: block; text-align: center;">
              made with <span style="font-weight: 600;">tribe</span>
            </a>
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

export async function sendTestEmail(
  to: string,
  subject: string,
  plainTextBody: string,
  ownerName: string,
  emailSignature?: string,
  allowReplies: boolean = true
): Promise<{ success: boolean; error?: string }> {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return { success: false, error: "Invalid email address format" };
  }

  const client = getResendClient();
  const fromEmail = getFromEmail(ownerName);

  // Format body as ebook-style paragraphs
  const formattedBody = formatBodyAsEbook(plainTextBody);

  // Format signature for HTML
  let signatureHtml = '';
  let signatureText = '';
  if (emailSignature && emailSignature.trim()) {
    const escapedSig = emailSignature.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const linkedSig = escapedSig.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" style="color: #E8B84A; text-decoration: underline;">$1</a>'
    );
    signatureHtml = `
      <div style="margin-top: 48px; padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.08);">
        <p style="color: rgba(255,255,255,0.5); font-size: 15px; line-height: 1.7; margin: 0; white-space: pre-wrap;">${linkedSig}</p>
      </div>
    `;
    signatureText = `\n\n---\n${emailSignature}`;
  }

  // Reply notice when replies are enabled (same as bulk email)
  let replyNoticeHtml = '';
  let replyNoticeText = '';
  if (allowReplies) {
    replyNoticeHtml = `
      <div style="margin-top: 40px; padding: 20px 24px; background: rgba(255,255,255,0.03); border-radius: 8px;">
        <p style="color: rgba(255,255,255,0.5); font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
          Replies are on, feel free to answer this email and ${ownerName} will receive your reply.
        </p>
      </div>
    `;
    replyNoticeText = `\n\n---\nReplies are on, feel free to answer this email and ${ownerName} will receive your reply.`;
  }

  // Test email HTML template (similar to regular emails but with test notice)
  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${subject}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #0a0a0a; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    <table role="presentation" style="width: 100%; border: 0; border-spacing: 0; background-color: #0a0a0a;">
      <tr>
        <td align="center" style="padding: 48px 24px;">
          <table role="presentation" style="width: 100%; max-width: 560px; border: 0; border-spacing: 0;">
            <tr>
              <td style="padding: 0;">
                <!-- Test Email Notice -->
                <div style="margin-bottom: 32px; padding: 16px 20px; background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.3); border-radius: 8px; text-align: center;">
                  <p style="color: rgba(234, 179, 8, 0.9); font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; font-weight: 500;">
                    🧪 This is a test email — only you can see this preview
                  </p>
                </div>
                
                <!-- Main Content -->
                <div style="font-family: Georgia, 'Times New Roman', serif;">
                  ${formattedBody}
                </div>
                
                <!-- Signature -->
                ${signatureHtml}
                
                <!-- Reply Notice -->
                ${replyNoticeHtml}
                
                <!-- Footer -->
                <div style="margin-top: 56px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
                  <p style="color: rgba(255,255,255,0.25); font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0 0 12px 0;">
                    Sent by ${ownerName}
                  </p>
                  <a href="https://www.madewithtribe.com" target="_blank" style="color: rgba(255,255,255,0.3); font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-decoration: none; display: inline-block; margin-bottom: 12px;">
                    made with <span style="font-weight: 600;">tribe</span>
                  </a>
                  <br>
                  <p style="color: rgba(255,255,255,0.15); font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0;">
                    [Unsubscribe link will appear here in real emails]
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textBody = `[TEST EMAIL - Only you can see this preview]\n\n${plainTextBody}${signatureText}${replyNoticeText}\n\n---\nSent by ${ownerName}\nmade with tribe: https://www.madewithtribe.com`;

  try {
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: `[TEST] ${subject}`,
      html: htmlBody,
      text: textBody,
    });

    if (error) {
      console.error("Test email send error:", error);
      return { success: false, error: error.message || "Failed to send test email" };
    }

    if (!data || !data.id) {
      return { success: false, error: "No email ID returned" };
    }

    console.log(`Test email sent successfully to ${to}, email ID: ${data.id}`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to send test email";
    console.error("Test email exception:", msg);
    return { success: false, error: msg };
  }
}
