import axios from "axios";

export const sendEmail = async (to, subject, text) => {
  try {
    if (!process.env.EMAIL_PASS || !process.env.EMAIL_FROM) {
      throw new Error("Email configuration missing: EMAIL_PASS or EMAIL_FROM not set.");
    }

    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { name: "CineCircle Support", email: process.env.EMAIL_FROM },
        to: [{ email: to }],
        subject: subject,
        htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
          <h2 style="color: #333;">Email Verification</h2>
          <p>Thank you for registering with CineCircle. Please use the following OTP to verify your email address. This code is valid for 10 minutes.</p>
          <h1 style="background: #f4f4f4; padding: 10px; text-align: center; letter-spacing: 5px;">${text}</h1>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
      },
      {
        headers: {
          "api-key": process.env.EMAIL_PASS,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("📧 Email sent successfully via API:", response.data.messageId);
  } catch (error) {
    console.error("❌ Email sending failed:", error.response?.data || error.message);
    throw new Error("Email could not be sent");
  }
};

export const sendReminderEmail = async (to, movieTitle) => {
  try {
    if (!process.env.EMAIL_PASS || !process.env.EMAIL_FROM) return;

    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { name: "CineCircle Support", email: process.env.EMAIL_FROM },
        to: [{ email: to }],
        subject: `Movie Reminder: ${movieTitle}`,
        htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
          <h2 style="color: #333;">Don't Forget!</h2>
          <p>This is a reminder to watch <strong>${movieTitle}</strong>.</p>
          <p>Enjoy your movie!</p>
        </div>
      `,
      },
      {
        headers: {
          "api-key": process.env.EMAIL_PASS,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Reminder email sending failed:", error.response?.data || error.message);
  }
};