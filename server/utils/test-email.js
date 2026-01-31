import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables from the server's .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const testBrevoConnection = async () => {
  console.log("🔍 Starting Brevo API Verification...");
  console.log(`📧 Testing with Sender: ${process.env.EMAIL_FROM}`);

  try {
    console.log("⏳ Sending test email...");
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { name: "CineCircle Test", email: process.env.EMAIL_FROM },
        to: [{ email: process.env.EMAIL_FROM }], // Send to yourself
        subject: "Brevo API Test Email",
        textContent: "This is a test email to verify your Brevo API settings.",
      },
      {
        headers: {
          "api-key": process.env.EMAIL_PASS,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Test email sent successfully! Message ID:", response.data.messageId);
  } catch (error) {
    console.error("❌ API Verification Failed:", error.response?.data || error.message);
    console.log("\n💡 Troubleshooting Tips:");
    console.log("1. Ensure EMAIL_PASS is your Brevo API Key.");
    console.log("2. Ensure EMAIL_FROM is a verified sender in Brevo.");
  }
};

testBrevoConnection();