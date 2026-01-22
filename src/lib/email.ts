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
      
      // Generate preheader text (first ~100 chars of content for inbox preview)
      const preheaderText = plainTextBody.substring(0, 120).replace(/\n/g, ' ').trim() + '...';

      // Clean, ebook-style HTML email template
      const htmlBody = `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
    <title>${subject}</title>
    <!--[if mso]>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
    <![endif]-->
  </head>
  <body style="margin: 0; padding: 0; background-color: #0a0a0a; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    <!-- Preheader text (hidden but shows in inbox preview) -->
    <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
      ${preheaderText}
      &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    </div>
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
                  <a href="https://www.madewithtribe.com" target="_blank" style="text-decoration: none; display: inline-block; margin-bottom: 12px;">
                    <span style="color: rgba(255,255,255,0.25); font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">made with </span><span style="font-family: Georgia, 'Times New Roman', serif; font-size: 12px; font-style: italic; letter-spacing: 0.03em; color: rgba(255,255,255,0.4);">tribe</span>
                  </a>
                  <br>
                  <a href="${unsubscribeUrl}" style="color: rgba(255,255,255,0.3); font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-decoration: underline;">
                    Unsubscribe
                  </a>
                  <p style="color: rgba(255,255,255,0.15); font-size: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 16px 0 0 0; line-height: 1.5;">
                    You're receiving this because you joined ${ownerName}'s tribe.<br>
                    Our mailing address: Tribe, Internet, Worldwide
                  </p>
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

      const textBody = `${plainTextBody}${signatureText}${replyNoticeText}\n\n---\nSent by ${ownerName}\nmade with tribe: https://www.madewithtribe.com\nUnsubscribe: ${unsubscribeUrl}\n\nYou're receiving this because you joined ${ownerName}'s tribe.\nOur mailing address: Tribe, Internet, Worldwide`;

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
        // Headers for maximum deliverability
        headers: {
          // RFC 8058 compliant one-click unsubscribe (required by Gmail/Yahoo since Feb 2024)
          'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:unsubscribe@madewithtribe.com?subject=Unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          // Indicates this is bulk/marketing email (helps spam filters categorize correctly)
          'Precedence': 'bulk',
          // Feedback loop identifier (helps ISPs route complaints)
          'Feedback-ID': `${emailId || 'campaign'}:${ownerName.replace(/[^a-zA-Z0-9]/g, '')}:tribe`,
          // Unique message ID for threading and deduplication
          'X-Entity-Ref-ID': `${emailId}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
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
  
  // Clean, professional subject lines (avoid spam trigger words)
  const subject = isGiftSignup 
    ? `${ownerName} - Please confirm your email`
    : `${ownerName} - Please confirm your email`;
  
  const buttonText = isGiftSignup ? 'Confirm and Download' : 'Confirm Email';
  const headline = isGiftSignup ? 'Confirm to get your download' : 'Confirm your email';
  const description = isGiftSignup
    ? `You requested to join <strong style="color: #333333;">${ownerName}'s</strong> community and receive a download. Click the button below to confirm.`
    : `You requested to join <strong style="color: #333333;">${ownerName}'s</strong> community. Click the button below to confirm.`;
  
  // Plain text version for better deliverability
  const plainTextDescription = isGiftSignup
    ? `You requested to join ${ownerName}'s community and receive a download. Click the link below to confirm.`
    : `You requested to join ${ownerName}'s community. Click the link below to confirm.`;
  
  const plainTextBody = `${headline}

${plainTextDescription}

Confirm your email: ${verifyUrl}

If you didn't request this, you can safely ignore this email.

---
${ownerName}
Sent via Tribe - https://www.madewithtribe.com`;

  // Use light theme with solid colors for maximum compatibility
  // This ensures readability in ALL email clients (light mode, dark mode, etc.)
  const { data, error } = await client.emails.send({
    from: getFromEmail(ownerName),
    to: [to],
    subject,
    text: plainTextBody,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>${subject}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; -webkit-font-smoothing: antialiased;">
  <!-- Preheader -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${isGiftSignup ? 'Confirm your email to access your download' : 'One click to confirm your email'}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  
  <table role="presentation" style="width: 100%; border: 0; border-spacing: 0; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 440px; border: 0; border-spacing: 0;">
          <tr>
            <td style="background-color: #ffffff; border-radius: 12px; padding: 48px 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
              
              <!-- Header -->
              <table role="presentation" style="width: 100%; border: 0; border-spacing: 0;">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <h1 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 22px; font-weight: 600; color: #1a1a1a;">
                      ${headline}
                    </h1>
                  </td>
                </tr>
              </table>
              
              <!-- Body -->
              <table role="presentation" style="width: 100%; border: 0; border-spacing: 0;">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #555555;">
                      ${description}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Button -->
              <table role="presentation" style="width: 100%; border: 0; border-spacing: 0;">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <a href="${verifyUrl}" style="display: inline-block; background-color: ${isGiftSignup ? '#059669' : '#1a1a1a'}; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Link fallback -->
              <table role="presentation" style="width: 100%; border: 0; border-spacing: 0;">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #999999;">
                      Or copy this link: <a href="${verifyUrl}" style="color: #666666; text-decoration: underline; word-break: break-all;">${verifyUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Disclaimer -->
              <table role="presentation" style="width: 100%; border: 0; border-spacing: 0;">
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #999999;">
                      If you didn't request this, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #999999;">
                Sent by ${ownerName} via <a href="https://www.madewithtribe.com" style="color: #666666; text-decoration: none;">Tribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    // Transactional emails should be marked as such
    headers: {
      'X-Entity-Ref-ID': verificationToken.substring(0, 16),
    },
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
                  <a href="https://www.madewithtribe.com" target="_blank" style="text-decoration: none; display: inline-block; margin-bottom: 12px;">
                    <span style="color: rgba(255,255,255,0.25); font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">made with </span><span style="font-family: Georgia, 'Times New Roman', serif; font-size: 12px; font-style: italic; letter-spacing: 0.03em; color: rgba(255,255,255,0.4);">tribe</span>
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
