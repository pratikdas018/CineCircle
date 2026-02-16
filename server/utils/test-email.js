import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const getService = () => {
  const explicitService = (process.env.EMAIL_SERVICE || "").toLowerCase().trim();
  if (explicitService) return explicitService;
  if (process.env.EMAIL_HOST || process.env.EMAIL_PORT || process.env.EMAIL_USER) return "smtp";
  return "gmail";
};

const service = getService();
const senderEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || "";
const smtpUser =
  service === "gmail"
    ? (process.env.EMAIL_FROM || process.env.EMAIL_USER || "")
    : (process.env.EMAIL_USER || process.env.EMAIL_FROM || "");
const pass = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || "";
const host = process.env.EMAIL_HOST || "smtp-relay.brevo.com";
const port = Number(process.env.EMAIL_PORT || 587);
const secure = String(process.env.EMAIL_PORT || "587") === "465";

const createTransporter = () =>
  service === "gmail"
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: smtpUser, pass },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
      })
    : nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user: smtpUser, pass },
        tls: { minVersion: "TLSv1.2" },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
      });

const runTest = async () => {
  console.log(`Starting email verification with service: ${service}`);
  console.log(`From: ${senderEmail || "(not configured)"}`);
  console.log(`SMTP user: ${smtpUser || "(not configured)"}`);
  if (service !== "gmail") {
    console.log(`SMTP host: ${host}`);
    console.log(`SMTP port: ${port}`);
  }

  try {
    if (!senderEmail || !smtpUser || !pass) {
      throw new Error(
        "Missing config. Required: EMAIL_FROM (or EMAIL_USER) and EMAIL_PASS."
      );
    }

    const transporter = createTransporter();
    await transporter.verify();
    console.log("Transport verification successful.");

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
    console.log("2. For Gmail, EMAIL_USER/EMAIL_FROM should be the same mailbox as the app password owner.");
    console.log("3. For SMTP providers, set EMAIL_SERVICE=smtp and configure EMAIL_HOST/EMAIL_PORT.");
  }
};

runTest();
