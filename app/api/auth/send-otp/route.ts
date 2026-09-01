import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: "Email and name are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Don't allow OTP signup for an existing account.
    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists. Please sign in instead.",
        },
        { status: 409 }
      );
    }

    const otp = generateOTP();

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save / replace OTP.
    await prisma.otpCode.upsert({
      where: {
        email: normalizedEmail,
      },
      update: {
        code: otp,
        expiresAt,
      },
      create: {
        email: normalizedEmail,
        code: otp,
        expiresAt,
      },
    });

    const sender =
      process.env.EMAIL_FROM ||
      "ApexTrader Security <onboarding@resend.dev>";

    const { error } = await resend.emails.send({
      from: sender,
      to: [normalizedEmail],
      subject: "Your ApexTrader Verification Code",
      html: `
        <!DOCTYPE html>
        <html>
          <body
            style="
              margin: 0;
              padding: 40px 20px;
              background: #0b0e14;
              font-family: Arial, sans-serif;
              color: #ffffff;
            "
          >
            <div
              style="
                max-width: 480px;
                margin: 0 auto;
                background: #131722;
                border: 1px solid #1e222d;
                border-radius: 16px;
                padding: 32px;
              "
            >
              <h1 style="margin: 0 0 10px; font-size: 24px;">
                ApexTrader
              </h1>

              <p style="color: #9ca3af; margin-bottom: 28px;">
                Welcome ${escapeHtml(name)}.
              </p>

              <p style="color: #d1d5db;">
                Use the verification code below to complete your
                ApexTrader account registration:
              </p>

              <div
                style="
                  margin: 28px 0;
                  padding: 20px;
                  background: #0b0e14;
                  border: 1px solid #2962ff;
                  border-radius: 12px;
                  text-align: center;
                "
              >
                <div
                  style="
                    font-size: 36px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    color: #ffffff;
                  "
                >
                  ${otp}
                </div>
              </div>

              <p style="color: #9ca3af; font-size: 14px;">
                This code expires in 10 minutes.
              </p>

              <p
                style="
                  color: #6b7280;
                  font-size: 12px;
                  margin-top: 30px;
                "
              >
                If you didn't request this code, you can safely ignore
                this email.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);

      return NextResponse.json(
        {
          error: "Unable to send verification email.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully.",
    });
  } catch (error) {
    console.error("Send OTP error:", error);

    return NextResponse.json(
      {
        error: "Internal server error.",
      },
      { status: 500 }
    );
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}