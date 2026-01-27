import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ 
      error: "RESEND_API_KEY not set",
      hasKey: false 
    }, { status: 500 });
  }

  const resend = new Resend(apiKey);

  try {
    // Try to send a test email to check configuration
    const { data, error } = await resend.emails.send({
      from: "Tribe <onboarding@resend.dev>",
      to: ["delivered@resend.dev"], // Resend test email
      subject: "Resend configuration test",
      html: "<p>This is a test to verify Resend is working.</p>",
    });

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        errorDetails: error,
        note: "Resend API key is set but email sending failed. Check your Resend dashboard."
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      emailId: data?.id,
      message: "Resend is configured correctly",
      note: "Check your Resend dashboard (resend.com) to see sent emails and verify the 'from' domain is approved."
    });
  } catch (err) {
    return NextResponse.json({ 
      success: false, 
      error: err instanceof Error ? err.message : String(err),
      note: "Check that RESEND_API_KEY is correct in Vercel environment variables"
    }, { status: 500 });
  }
}

