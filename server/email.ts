import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = "SalesBot AI <noreply@salesbot.ai>";
const APP_NAME = "SalesBot AI";

function getBaseUrl(): string {
  if (process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(",");
    return `https://${domains[0]}`;
  }
  return "http://localhost:5000";
}

function emailTemplate(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 40px; color: #374151; }
    .body h2 { font-size: 20px; color: #111827; margin-top: 0; }
    .body p { font-size: 15px; line-height: 1.7; color: #4b5563; }
    .cta { text-align: center; margin: 32px 0; }
    .cta a { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px; }
    .footer { padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { color: #9ca3af; font-size: 13px; margin: 0; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .note { background: #f9fafb; border-left: 4px solid #6366f1; padding: 14px 18px; border-radius: 4px; font-size: 13px; color: #6b7280; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${APP_NAME}</h1>
      <p>AI-Powered Sales Automation Platform</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      <p style="margin-top:6px;">If you did not request this email, you can safely ignore it.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendVerificationEmail(to: string, token: string, language: string = "ar"): Promise<void> {
  if (!resend) {
    console.warn("[email] Resend not configured — skipping verification email");
    return;
  }

  const baseUrl = getBaseUrl();
  const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

  const isAr = language === "ar";

  const subject = isAr
    ? "تحقق من بريدك الإلكتروني — SalesBot AI"
    : "Verify your email — SalesBot AI";

  const content = isAr
    ? `
      <h2>تحقق من بريدك الإلكتروني</h2>
      <p>شكراً لتسجيلك في <strong>SalesBot AI</strong>. انقر على الزر أدناه للتحقق من بريدك الإلكتروني وتفعيل حسابك.</p>
      <div class="cta">
        <a href="${verificationUrl}">تحقق من البريد الإلكتروني</a>
      </div>
      <hr class="divider" />
      <div class="note">
        هذا الرابط صالح لمدة <strong>24 ساعة</strong> فقط. إذا لم تقم بإنشاء هذا الحساب، يمكنك تجاهل هذا البريد الإلكتروني.
      </div>
    `
    : `
      <h2>Verify your email address</h2>
      <p>Thank you for registering with <strong>SalesBot AI</strong>. Click the button below to verify your email address and activate your account.</p>
      <div class="cta">
        <a href="${verificationUrl}">Verify Email Address</a>
      </div>
      <hr class="divider" />
      <div class="note">
        This link is valid for <strong>24 hours</strong>. If you did not create an account, you can safely ignore this email.
      </div>
    `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: emailTemplate(subject, content),
    });
  } catch (err) {
    console.error("[email] Failed to send verification email:", err);
  }
}

export async function sendPasswordResetEmail(to: string, token: string, language: string = "ar"): Promise<void> {
  if (!resend) {
    console.warn("[email] Resend not configured — skipping password reset email");
    return;
  }

  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const isAr = language === "ar";

  const subject = isAr
    ? "إعادة تعيين كلمة المرور — SalesBot AI"
    : "Reset your password — SalesBot AI";

  const content = isAr
    ? `
      <h2>إعادة تعيين كلمة المرور</h2>
      <p>تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في <strong>SalesBot AI</strong>. انقر على الزر أدناه لإنشاء كلمة مرور جديدة.</p>
      <div class="cta">
        <a href="${resetUrl}">إعادة تعيين كلمة المرور</a>
      </div>
      <hr class="divider" />
      <div class="note">
        هذا الرابط صالح لمدة <strong>ساعة واحدة</strong> فقط. إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد الإلكتروني.
      </div>
    `
    : `
      <h2>Reset your password</h2>
      <p>We received a request to reset the password for your <strong>SalesBot AI</strong> account. Click the button below to create a new password.</p>
      <div class="cta">
        <a href="${resetUrl}">Reset Password</a>
      </div>
      <hr class="divider" />
      <div class="note">
        This link is valid for <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.
      </div>
    `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: emailTemplate(subject, content),
    });
  } catch (err) {
    console.error("[email] Failed to send password reset email:", err);
  }
}
