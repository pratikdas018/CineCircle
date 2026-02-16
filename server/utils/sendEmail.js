import "dotenv/config";
import nodemailer from "nodemailer";

const DEFAULT_APP_URL = "https://cine-circle-ten.vercel.app";
let cachedTransporter = null;
let cachedTransporterKey = "";

const getEmailService = () => {
  const explicitService = (process.env.EMAIL_SERVICE || "").toLowerCase().trim();
  if (explicitService) return explicitService;

  // Auto-select SMTP in production if host/user exists and service is not explicitly set.
  if (process.env.EMAIL_HOST || process.env.EMAIL_PORT || process.env.EMAIL_USER) {
    return "smtp";
  }

  return "gmail";
};

const getSenderEmail = () => process.env.EMAIL_FROM || process.env.EMAIL_USER || "";

const getSenderName = () => process.env.EMAIL_FROM_NAME || "CineCircle Support";

const getAppUrl = () =>
  (
    process.env.FRONTEND_URL ||
    process.env.APP_URL ||
    process.env.CLIENT_URL ||
    DEFAULT_APP_URL
  ).replace(/\/$/, "");

const getEmailPassword = () => process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || "";

const getSmtpUser = (service) => {
  if (service === "gmail") {
    // Gmail app-password auth is tied to mailbox owner, so prefer EMAIL_FROM.
    return process.env.EMAIL_FROM || process.env.EMAIL_USER || "";
  }

  return process.env.EMAIL_USER || process.env.EMAIL_FROM || "";
};

const getSmtpHost = (service) => {
  if (process.env.EMAIL_HOST) return process.env.EMAIL_HOST;
  if (service === "brevo") return "smtp-relay.brevo.com";
  return "";
};

const buildEmailConfig = () => {
  const service = getEmailService();
  const smtpUser = getSmtpUser(service);
  const senderEmail = getSenderEmail();
  const pass = getEmailPassword();

  if (!senderEmail || !smtpUser || !pass) {
    throw new Error(
      "Email config missing. Required vars: EMAIL_FROM (or EMAIL_USER), and EMAIL_PASS."
    );
  }

  if (service !== "gmail" && !process.env.EMAIL_HOST && service !== "brevo" && service !== "smtp") {
    throw new Error(`Unsupported EMAIL_SERVICE value: ${service}`);
  }

  if (service === "smtp" && !process.env.EMAIL_HOST) {
    throw new Error("EMAIL_HOST is required when EMAIL_SERVICE=smtp");
  }

  return {
    service,
    smtpUser,
    senderEmail,
    senderName: getSenderName(),
    pass,
    host: getSmtpHost(service),
    port: Number(process.env.EMAIL_PORT || 587),
    secure: String(process.env.EMAIL_PORT || "587") === "465",
  };
};

const getTransporterKey = (config) =>
  JSON.stringify({
    service: config.service,
    host: config.host,
    port: config.port,
    secure: config.secure,
    smtpUser: config.smtpUser,
  });

const createTransporter = (config) => {
  const commonOptions = {
    pool: true,
    maxConnections: 3,
    maxMessages: 200,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  };

  if (config.service === "gmail") {
    return nodemailer.createTransport({
      ...commonOptions,
      service: "gmail",
      auth: {
        user: config.smtpUser,
        pass: config.pass,
      },
    });
  }

  return nodemailer.createTransport({
    ...commonOptions,
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.smtpUser,
      pass: config.pass,
    },
    tls: {
      minVersion: "TLSv1.2",
    },
  });
};

const getTransporter = () => {
  const config = buildEmailConfig();
  const transporterKey = getTransporterKey(config);

  if (!cachedTransporter || cachedTransporterKey !== transporterKey) {
    cachedTransporter = createTransporter(config);
    cachedTransporterKey = transporterKey;
  }

  return { transporter: cachedTransporter, config };
};

const sendHtmlEmail = async ({ to, subject, html, text }) => {
  const { transporter, config } = getTransporter();

  const info = await transporter.sendMail({
    from: `${config.senderName} <${config.senderEmail}>`,
    to,
    subject,
    text,
    html,
  });

  console.log(`Email sent: ${info.messageId}`);
};

export const verifyEmailTransport = async () => {
  try {
    const service = getEmailService();
    if (service === "gmail" && process.env.EMAIL_HOST) {
      console.warn("[email] EMAIL_HOST is set but EMAIL_SERVICE=gmail. SMTP host will be ignored.");
    }
    if (service === "gmail" && process.env.EMAIL_USER && process.env.EMAIL_FROM) {
      const normalizedUser = String(process.env.EMAIL_USER).trim().toLowerCase();
      const normalizedFrom = String(process.env.EMAIL_FROM).trim().toLowerCase();
      if (normalizedUser !== normalizedFrom) {
        console.warn(
          "[email] EMAIL_USER and EMAIL_FROM differ with Gmail. Use the same mailbox for reliable delivery."
        );
      }
    }

    const { transporter, config } = getTransporter();
    await transporter.verify();
    console.log(
      `[email] Transport ready via ${config.service} (${config.service === "gmail" ? "gmail" : `${config.host}:${config.port}`})`
    );
  } catch (error) {
    console.error(`[email] Transport verification failed: ${error.message}`);
  }
};

export const sendEmail = async (to, subject, text) => {
  try {
    const otp = String(text || "").trim();
    const appUrl = getAppUrl();
    const safeSubject = subject || "CineCircle OTP Verification Code";

    await sendHtmlEmail({
      to,
      subject: safeSubject,
      text: `Your CineCircle OTP is ${otp}. This code is valid for 10 minutes. If you did not request this, ignore this email.`,
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

export const sendPasswordResetEmail = async (to, resetLink) => {
  try {
    const appUrl = getAppUrl();

    await sendHtmlEmail({
      to,
      subject: "CineCircle Password Reset Request",
      text: `Reset your CineCircle password using this secure link (valid for 15 minutes): ${resetLink}`,
      html: `
        <div style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;background:linear-gradient(135deg,#2563eb,#1d4ed8);">
                <h1 style="margin:0;font-size:22px;line-height:1.2;color:#ffffff;font-weight:700;">CineCircle</h1>
                <p style="margin:8px 0 0 0;color:#dbeafe;font-size:13px;">Secure Password Reset</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h2 style="margin:0 0 12px 0;font-size:20px;color:#111827;">Reset Your Password</h2>
                <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#374151;">
                  We received a request to reset your CineCircle account password.
                </p>
                <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#374151;">
                  Click the button below to set a new password. This secure link expires in <strong>15 minutes</strong>.
                </p>
                <div style="margin:0 0 20px 0;">
                  <a href="${resetLink}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Reset Password</a>
                </div>
                <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#6b7280;">
                  If the button does not work, copy and paste this URL into your browser:
                </p>
                <p style="margin:0 0 12px 0;font-size:12px;line-height:1.6;color:#1d4ed8;word-break:break-all;">
                  ${resetLink}
                </p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
                  If you did not request this reset, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px;border-top:1px solid #e5e7eb;background:#fafafa;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;text-align:center;">
                  Copyright CineCircle. <a href="${appUrl}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:none;font-weight:600;">CineCircle (${appUrl})</a>
                </p>
              </td>
            </tr>
          </table>
        </div>
      `,
    });
  } catch (error) {
    console.error("Password reset email sending failed:", error.message);
    throw new Error("Password reset email could not be sent");
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
