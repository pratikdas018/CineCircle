import "dotenv/config";
import nodemailer from "nodemailer";

const getEmailService = () => (process.env.EMAIL_SERVICE || "gmail").toLowerCase().trim();

const getSenderEmail = () => process.env.EMAIL_FROM || process.env.EMAIL_USER || "";

const getSmtpUser = () => {
  const service = getEmailService();

  // For Gmail, prefer EMAIL_FROM to avoid stale EMAIL_USER values from other providers.
  if (service === "gmail") {
    return process.env.EMAIL_FROM || process.env.EMAIL_USER || "";
  }

  return process.env.EMAIL_USER || process.env.EMAIL_FROM || "";
};

const ensureEmailConfig = () => {
  const smtpUser = getSmtpUser();
  const senderEmail = getSenderEmail();
  const pass = process.env.EMAIL_PASS || "";

  if (!senderEmail || !smtpUser || !pass) {
    throw new Error(
      "Email config missing. Required: EMAIL_FROM, EMAIL_PASS and (EMAIL_USER for non-gmail providers)."
    );
  }

  return { smtpUser, senderEmail, pass };
};

const createTransporter = () => {
  const { smtpUser, pass } = ensureEmailConfig();
  const service = getEmailService();

  if (service === "gmail") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass,
      },
    });
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp-relay.brevo.com",
    port: Number(process.env.EMAIL_PORT || 587),
    secure: String(process.env.EMAIL_PORT || "587") === "465",
    auth: {
      user: smtpUser,
      pass,
    },
  });
};

const sendHtmlEmail = async ({ to, subject, html }) => {
  const { senderEmail } = ensureEmailConfig();
  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from: `CineCircle Support <${senderEmail}>`,
    to,
    subject,
    html,
  });

  console.log(`Email sent: ${info.messageId}`);
};

export const sendEmail = async (to, subject, text) => {
  try {
    const otp = String(text || "").trim();
    const appUrl = "https://cine-circle-ten.vercel.app";
    const safeSubject = subject || "CineCircle OTP Verification Code";

    await sendHtmlEmail({
      to,
      subject: safeSubject,
      html: `
        <div style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;background:linear-gradient(135deg,#dc2626,#ea580c);">
                <h1 style="margin:0;font-size:22px;line-height:1.2;color:#ffffff;font-weight:700;">CineCircle</h1>
                <p style="margin:8px 0 0 0;color:#fee2e2;font-size:13px;">Secure One-Time Password Verification</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h2 style="margin:0 0 12px 0;font-size:20px;color:#111827;">Verify Your Email Address</h2>
                <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#374151;">
                  We received a request to verify your CineCircle account. Use the OTP below to continue.
                </p>
                <div style="margin:18px 0;padding:14px;border:1px dashed #d1d5db;border-radius:10px;background:#f9fafb;text-align:center;">
                  <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:1px;color:#6b7280;text-transform:uppercase;">Your OTP Code</p>
                  <p style="margin:0;font-size:32px;letter-spacing:8px;font-weight:700;color:#111827;">${otp}</p>
                </div>
                <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#374151;">
                  This code is valid for <strong>10 minutes</strong>. Do not share this OTP with anyone.
                </p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
                  If you did not request this, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px;border-top:1px solid #e5e7eb;background:#fafafa;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;text-align:center;">
                  Copyright CineCircle. <a href="${appUrl}" target="_blank" rel="noopener noreferrer" style="color:#dc2626;text-decoration:none;font-weight:600;">CineCircle (${appUrl})</a>
                </p>
              </td>
            </tr>
          </table>
        </div>
      `,
    });
  } catch (error) {
    console.error("Email sending failed:", error.message);
    throw new Error("Email could not be sent");
  }
};

export const sendReminderEmail = async (to, movieTitle) => {
  try {
    await sendHtmlEmail({
      to,
      subject: `Movie Reminder: ${movieTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
          <h2 style="color: #333;">Don't Forget!</h2>
          <p>This is a reminder to watch <strong>${movieTitle}</strong>.</p>
          <p>Enjoy your movie!</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Reminder email sending failed:", error.message);
  }
};

export const sendAvailabilityEmail = async (to, movieTitle, providerName, link = "") => {
  try {
    await sendHtmlEmail({
      to,
      subject: `Now Streaming: ${movieTitle} on ${providerName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
          <h2 style="color: #333;">Availability Alert</h2>
          <p><strong>${movieTitle}</strong> is now available on <strong>${providerName}</strong>.</p>
          ${
            link
              ? `<p><a href="${link}" target="_blank" style="color:#2563eb;">Open provider link</a></p>`
              : ""
          }
          <p>Enjoy your movie night!</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Availability email sending failed:", error.message);
  }
};
