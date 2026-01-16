import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const { email, message, reason } = await req.json();

    if (!email || !message) {
      return NextResponse.json({ success: false, error: "Email and message are required" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("RESEND_API_KEY not configured");
      return NextResponse.json({ success: false, error: "Email service not configured" }, { status: 500 });
    }

    const resend = new Resend(apiKey);

    // Send the support email
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Tribe <onboarding@resend.dev>",
      to: ["matcreatespro@gmail.com"],
      subject: "TRIBE CUSTOMER SUPPORT",
      replyTo: email,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #121212; margin: 0; padding: 40px 20px;">
            <div style="max-width: 500px; margin: 0 auto; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px;">
              <h1 style="color: rgba(255,255,255,0.9); font-size: 18px; font-weight: 500; margin: 0 0 24px;">
                New Support Request
              </h1>
              
              <div style="margin-bottom: 20px;">
                <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em;">From</p>
                <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0;">${email}</p>
              </div>
              
              ${reason ? `
              <div style="margin-bottom: 20px;">
                <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em;">Reason</p>
                <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0;">${reason}</p>
              </div>
              ` : ''}
              
              <div>
                <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">Message</p>
                <div style="background: rgba(0,0,0,0.2); border-radius: 8px; padding: 16px;">
                  <p style="color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `New Support Request\n\nFrom: ${email}\n${reason ? `Reason: ${reason}\n` : ''}\nMessage:\n${message}`,
    });

    if (error) {
      console.error("Failed to send support email:", error);
      return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500 });
    }

    console.log("Support email sent:", data?.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact support error:", err);
    return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500 });
  }
}
