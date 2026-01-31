import nodemailer from "nodemailer";

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.EMAIL_FROM) {
    console.error("❌ Email configuration missing: EMAIL_USER, EMAIL_PASS, or EMAIL_FROM not set.");
    return null;
  }

  transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false, // Use STARTTLS for port 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  return transporter;
};

export const sendEmail = async (to, subject, text) => {
  try {
    const transporter = getTransporter();
    if (!transporter) throw new Error("Email service not configured");

    const mailOptions = {
      from: `"CineCircle Support" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
          <h2 style="color: #333;">Email Verification</h2>
          <p>Thank you for registering with CineCircle. Please use the following OTP to verify your email address. This code is valid for 10 minutes.</p>
          <h1 style="background: #f4f4f4; padding: 10px; text-align: center; letter-spacing: 5px;">${text}</h1>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("📧 Email sent successfully:", info.messageId);
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    throw new Error("Email could not be sent");
  }
};

export const sendReminderEmail = async (to, movieTitle) => {
  try {
    const transporter = getTransporter();
    if (!transporter) return;

    const mailOptions = {
      from: `"CineCircle Support" <${process.env.EMAIL_FROM}>`,
      to,
      subject: `Movie Reminder: ${movieTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
          <h2 style="color: #333;">Don't Forget!</h2>
          <p>This is a reminder to watch <strong>${movieTitle}</strong>.</p>
          <p>Enjoy your movie!</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Reminder email sending failed:", error);
  }
};