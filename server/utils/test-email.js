import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const service = (process.env.EMAIL_SERVICE || "gmail").toLowerCase().trim();
const senderEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || "";
const smtpUser = service === "gmail"
  ? (process.env.EMAIL_FROM || process.env.EMAIL_USER || "")
  : (process.env.EMAIL_USER || process.env.EMAIL_FROM || "");
const pass = process.env.EMAIL_PASS || "";

const createTransporter = () => {
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

const runTest = async () => {
  console.log(`Starting email verification with service: ${service}`);
  console.log(`From: ${senderEmail || "(not configured)"}`);
  console.log(`SMTP user: ${smtpUser || "(not configured)"}`);

  try {
    if (!senderEmail || !smtpUser || !pass) {
      throw new Error(
        "Missing config. Required: EMAIL_FROM, EMAIL_PASS and (EMAIL_USER for non-gmail providers)."
      );
    }

    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from: `CineCircle Test <${senderEmail}>`,
      to: senderEmail,
      subject: "CineCircle SMTP Test Email",
      text: "This is a test email from CineCircle.",
    });

    console.log("Test email sent. Message ID:", info.messageId);
  } catch (error) {
    console.error("Email verification failed:", error.message);
    console.log("Tips:");
    console.log("1. For Gmail, EMAIL_PASS must be a Gmail app password (not your normal Gmail password).");
    console.log("2. For Gmail, EMAIL_FROM should be the same mailbox as the app password owner.");
    console.log("3. Remove old EMAIL_USER values from other providers if EMAIL_SERVICE=gmail.");
  }
};

runTest();
