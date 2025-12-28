import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ 
      error: "RESEND_API_KEY not set",
      hasKey: false 
    }, { status: 500 });
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: "Tribe <onboarding@resend.dev>",
      to: ["delivered@resend.dev"], // Resend test email
      subject: "Test email from Tribe",
      html: "<p>This is a test email</p>",
    });

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        errorDetails: error 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      emailId: data?.id,
      message: "Test email sent successfully" 
    });
  } catch (err) {
    return NextResponse.json({ 
      success: false, 
      error: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}

