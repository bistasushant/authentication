import nodemailer from "nodemailer";

// ── SMTP transporter ─────────────────────────────────────────────────────────

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false, // STARTTLS on port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM =
  `"${process.env.SMTP_FROM_NAME ?? "Clipper"}" <${process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER}>`;

// ── Types ────────────────────────────────────────────────────────────────────

export type SendOtpEmailParams = {
  to: string;
  name: string;
  otp: string;
  action: "signin" | "signup";
  expiryMinutes?: number;
};

// ── Templates ────────────────────────────────────────────────────────────────

function buildHtml(params: SendOtpEmailParams): string {
  const { name, otp, action, expiryMinutes = 5 } = params;
  const actionLabel = action === "signup" ? "verify your email" : "sign in";
  const firstName = name.split(" ")[0] ?? name;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Clipper verification code</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:12px;border:1px solid #262626;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #262626;">
              <span style="font-size:16px;font-weight:600;color:#fff;">✂️ Clipper</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 8px;font-size:14px;color:#a3a3a3;">Hi ${firstName},</p>
              <p style="margin:0 0 24px;font-size:14px;color:#a3a3a3;">
                Use the code below to ${actionLabel}. This code expires in ${expiryMinutes} minutes.
              </p>
              <div style="background:#1c1c1c;border:1px solid #333;border-radius:10px;padding:24px;text-align:center;margin:0 0 24px;">
                <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#fff;font-family:'Courier New',monospace;">${otp}</span>
              </div>
              <p style="margin:0;font-size:13px;color:#737373;line-height:1.6;">
                If you didn't request this code, you can safely ignore this email.
                Never share this code with anyone.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #262626;text-align:center;">
              <p style="margin:0;font-size:12px;color:#525252;">© ${new Date().getFullYear()} Clipper · All rights reserved</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildText(params: SendOtpEmailParams): string {
  const { name, otp, action, expiryMinutes = 5 } = params;
  const actionLabel = action === "signup" ? "verify your email" : "sign in";
  const firstName = name.split(" ")[0] ?? name;
  return [
    `Hi ${firstName},`,
    "",
    `Use the following code to ${actionLabel}:`,
    "",
    `  ${otp}`,
    "",
    `This code expires in ${expiryMinutes} minutes.`,
    "",
    "If you didn't request this code, you can safely ignore this email.",
    "",
    "— The Clipper Team",
  ].join("\n");
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Send an OTP email via SMTP (nodemailer).
 * Throws on delivery failure so callers can handle it safely.
 */
export async function sendOtpEmail(params: SendOtpEmailParams): Promise<void> {
  const subject =
    params.action === "signup"
      ? "Verify your Clipper account"
      : "Your Clipper sign-in code";

  const transporter = createTransporter();

  try {
    await transporter.sendMail({
      from: FROM,
      to: params.to,
      subject,
      html: buildHtml(params),
      text: buildText(params),
    });
  } catch (err) {
    console.error("[SMTP] Email delivery failed:", err);
    throw new Error("Failed to send verification email. Please try again.");
  }
}
