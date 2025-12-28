import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(
  to: string,
  tribeName: string,
  ownerName: string,
  verificationToken: string,
  baseUrl: string
) {
  const verifyUrl = `${baseUrl}/api/verify?token=${verificationToken}`;

  const { error } = await resend.emails.send({
    from: "Tribe <noreply@resend.dev>", // Use your domain once verified in Resend
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
    console.error("Failed to send verification email:", error);
    throw new Error("Failed to send verification email");
  }

  return { success: true };
}

