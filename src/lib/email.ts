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

/** Escape text from the database or a guest before putting it in an email. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export interface BookingEmailDetails {
  guestName: string;
  siteName: string;
  /** e.g. "Jul 3 to 5, 2027" */
  stay: string;
  /** e.g. "2 nights" */
  nights: string;
  checkInTime: string;
  checkOutTime: string;
  amountPaid: string;
  /** "When you cancel" and "Refund" pairs, already worded. */
  refundSchedule: Array<[string, string]>;
  policyText: string | null;
  /** Null when the guest has no account to view it in. */
  bookingUrl: string | null;
}

export function generateBookingConfirmedEmailText(d: BookingEmailDetails) {
  return [
    `Hi ${d.guestName},`,
    "",
    `Your campsite booking is confirmed: ${d.siteName}, ${d.stay} (${d.nights}).`,
    `Check-in from ${d.checkInTime}. Check-out by ${d.checkOutTime}.`,
    `Amount paid: ${d.amountPaid}`,
    "",
    "Cancellation policy:",
    ...d.refundSchedule.map(([when, refund]) => `- ${when}: ${refund}`),
    ...(d.policyText ? ["", d.policyText] : []),
    ...(d.bookingUrl ? ["", `View your booking: ${d.bookingUrl}`] : []),
  ].join("\n");
}

export function generateBookingConfirmedEmailHtml(d: BookingEmailDetails) {
  const e = escapeHtml;
  const rows = d.refundSchedule
    .map(
      ([when, refund]) =>
        `<tr><td style="padding: 6px 16px 6px 0; border-top: 1px solid #eee;">${e(when)}</td><td style="padding: 6px 0; border-top: 1px solid #eee;">${e(refund)}</td></tr>`,
    )
    .join("");
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Your campsite is booked</h2>
      <p>Hi ${e(d.guestName)}, thanks for booking with us. Here are your details.</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 4px 16px 4px 0; color: #666;">Site</td><td style="padding: 4px 0;"><strong>${e(d.siteName)}</strong></td></tr>
        <tr><td style="padding: 4px 16px 4px 0; color: #666;">Dates</td><td style="padding: 4px 0;">${e(d.stay)} (${e(d.nights)})</td></tr>
        <tr><td style="padding: 4px 16px 4px 0; color: #666;">Check-in</td><td style="padding: 4px 0;">From ${e(d.checkInTime)}</td></tr>
        <tr><td style="padding: 4px 16px 4px 0; color: #666;">Check-out</td><td style="padding: 4px 0;">By ${e(d.checkOutTime)}</td></tr>
        <tr><td style="padding: 4px 16px 4px 0; color: #666;">Paid</td><td style="padding: 4px 0;">${e(d.amountPaid)}</td></tr>
      </table>
      <h3 style="margin-bottom: 4px;">Cancellation policy</h3>
      <table style="border-collapse: collapse; font-size: 14px;">
        <tr style="text-align: left; color: #666;"><th style="padding: 6px 16px 6px 0; font-weight: normal;">When you cancel</th><th style="padding: 6px 0; font-weight: normal;">Refund</th></tr>
        ${rows}
      </table>
      ${d.policyText ? `<p style="font-size: 14px; color: #444; white-space: pre-line;">${e(d.policyText)}</p>` : ""}
      ${d.bookingUrl ? `<a href="${e(d.bookingUrl)}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; margin: 16px 0;">View booking</a>` : ""}
    </div>
  `;
}

export interface BookingUnavailableEmailDetails {
  guestName: string;
  siteName: string;
  stay: string;
  refundAmount: string;
  campgroundUrl: string;
}

export function generateBookingUnavailableEmailText(
  d: BookingUnavailableEmailDetails,
) {
  return [
    `Hi ${d.guestName},`,
    "",
    `We're sorry. Your payment for ${d.siteName}, ${d.stay} arrived after your hold on the site ran out, and someone else booked it in the meantime.`,
    `We have refunded the full ${d.refundAmount}. Refunds usually take 5 to 10 business days to appear on your statement.`,
    "",
    `You can choose another site here: ${d.campgroundUrl}`,
  ].join("\n");
}

export function generateBookingUnavailableEmailHtml(
  d: BookingUnavailableEmailDetails,
) {
  const e = escapeHtml;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Sorry, that site was no longer available</h2>
      <p>Hi ${e(d.guestName)},</p>
      <p>Your payment for <strong>${e(d.siteName)}, ${e(d.stay)}</strong> arrived after your hold on the site ran out, and someone else booked it in the meantime.</p>
      <p>We have refunded the full <strong>${e(d.refundAmount)}</strong>. Refunds usually take 5 to 10 business days to appear on your statement.</p>
      <a href="${e(d.campgroundUrl)}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; margin: 16px 0;">Choose another site</a>
    </div>
  `;
}

export interface BookingCancelledEmailDetails {
  guestName: string;
  siteName: string;
  stay: string;
  /** e.g. "$31.50"; "$0.00" when nothing is refunded. */
  refundAmount: string;
  hasRefund: boolean;
  /** Refunded to their card (true) or handed back by the camp (false). */
  refundToCard: boolean;
  campgroundUrl: string;
}

function cancelledRefundLine(d: BookingCancelledEmailDetails): string {
  if (!d.hasRefund) {
    return "Under the cancellation policy for this booking, no refund is due.";
  }
  return d.refundToCard
    ? `We have refunded ${d.refundAmount} to the card you paid with. Refunds usually take 5 to 10 business days to appear on your statement.`
    : `You are owed a refund of ${d.refundAmount}. The camp office will be in touch to arrange it.`;
}

export function generateBookingCancelledEmailText(
  d: BookingCancelledEmailDetails,
) {
  return [
    `Hi ${d.guestName},`,
    "",
    `Your campsite booking for ${d.siteName}, ${d.stay} has been cancelled.`,
    cancelledRefundLine(d),
    "",
    `If you'd like to book another stay: ${d.campgroundUrl}`,
  ].join("\n");
}

export function generateBookingCancelledEmailHtml(
  d: BookingCancelledEmailDetails,
) {
  const e = escapeHtml;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Your campsite booking is cancelled</h2>
      <p>Hi ${e(d.guestName)},</p>
      <p>Your booking for <strong>${e(d.siteName)}, ${e(d.stay)}</strong> has been cancelled.</p>
      <p>${e(cancelledRefundLine(d))}</p>
      <a href="${e(d.campgroundUrl)}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; margin: 16px 0;">Book another stay</a>
    </div>
  `;
}
