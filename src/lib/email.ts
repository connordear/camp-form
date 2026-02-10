import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM = process.env.EMAIL_FROM;

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: SendEmailOptions) {
  return await resend.emails.send({
    from: EMAIL_FROM!,
    to,
    subject,
    text,
    html,
  });
}

export function generateVerificationEmailHtml(url: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verify Your Email Address</h2>
      <p>Thank you for signing up! Please click the link below to verify your email address:</p>
      <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; margin: 16px 0;">Verify Email</a>
      <p>Or copy and paste this link into your browser:</p>
      <p>${url}</p>
      <p>This link will expire in 24 hours.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #666; font-size: 14px;">If you didn't sign up for this account, you can safely ignore this email.</p>
    </div>
  `;
}

export function generatePasswordResetEmailHtml(url: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset Your Password</h2>
      <p>You requested to reset your password. Click the link below to set a new password:</p>
      <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; margin: 16px 0;">Reset Password</a>
      <p>Or copy and paste this link into your browser:</p>
      <p>${url}</p>
      <p>This link will expire in 1 hour.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
  `;
}
