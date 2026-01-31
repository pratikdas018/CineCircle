import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables from the server's .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const testBrevoConnection = async () => {
  console.log("🔍 Starting Brevo SMTP Verification...");
  console.log(`📧 Testing with User: ${process.env.EMAIL_USER}`);

  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  try {
    // 1. Verify connection configuration
    console.log("⏳ Verifying connection...");
    await transporter.verify();
    console.log("✅ Connection established successfully!");

    // 2. Attempt to send a test email to yourself
    console.log("⏳ Sending test email...");
    const info = await transporter.sendMail({
      from: `"CineCircle Test" <${process.env.EMAIL_FROM}>`,
      to: "your-personal-email@gmail.com", // Change this to your actual inbox
      subject: "Brevo SMTP Test Email",
      text: "This is a test email to verify your Brevo SMTP settings. If you received this, your credentials and network connection are working!",
    });

    console.log("✅ Test email sent successfully! Message ID:", info.messageId);
  } catch (error) {
    console.error("❌ SMTP Verification Failed:", error.message);
    console.log("\n💡 Troubleshooting Tips:");
    console.log("1. Ensure EMAIL_PASS is your Brevo SMTP Key, NOT your account password.");
    console.log("2. Check if your Brevo account is activated for SMTP.");
    console.log("3. If on Render, ensure you aren't hitting a firewall block (Port 587 is usually open).");
  }
};

testBrevoConnection();