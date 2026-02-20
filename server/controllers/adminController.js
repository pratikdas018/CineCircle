import User from "../models/User.js";
import EmailLog from "../models/EmailLog.js";
import { generateAIEmail } from "../services/aiEmailService.js";
import { sendCustomEmail } from "../utils/sendEmail.js";

export {
  getAdminStats,
  getUsersAdmin,
  updateUserRoleAdmin,
  deleteUserAdmin,
  getReviewsAdmin,
  deleteReviewAdmin,
} from "./admin.controller.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const yieldToEventLoop = () => new Promise((resolve) => setImmediate(resolve));

const normalizeEmailType = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

const chunk = (items, size) => {
  const groups = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
};

export const generateAIEmailController = async (req, res) => {
  try {
    const emailType = normalizeEmailType(req.body?.emailType);
    const generated = await generateAIEmail(emailType);
    const subject = String(generated?.subject || "").trim();
    const body = String(generated?.body || "").trim();

    return res.json({
      subject: subject || "CineCircle Update",
      body:
        body ||
        "Hello CineCircle users,\n\nWe are sharing an update from our team. Please stay tuned for more improvements.\n\nBest regards,\nCineCircle Team",
    });
  } catch (error) {
    console.error("generateAIEmailController error:", error.message);
    return res.json({
      subject: "CineCircle Update",
      body: "Hello CineCircle users,\n\nWe are sharing an update from our team. Please stay tuned for more improvements.\n\nBest regards,\nCineCircle Team",
    });
  }
};

export const sendBroadcastController = async (req, res) => {
  try {
    const subject = String(req.body?.subject || "").trim();
    const body = String(req.body?.body || "").trim();

    if (!subject || !body) {
      return res.status(400).json({ message: "Subject and body are required" });
    }

    const users = await User.find({
      email: { $exists: true, $ne: "" },
    })
      .select("email")
      .lean();

    const emails = [...new Set(users.map((user) => String(user.email || "").trim().toLowerCase()))].filter(Boolean);
    const batchSize = Math.max(1, Number(process.env.BULK_EMAIL_BATCH_SIZE || 25));
    const batchDelay = Math.max(0, Number(process.env.BULK_EMAIL_BATCH_DELAY_MS || 1200));

    let sent = 0;
    let failed = 0;

    for (const group of chunk(emails, batchSize)) {
      const results = await Promise.allSettled(group.map((email) => sendCustomEmail(email, subject, body)));

      for (const result of results) {
        if (result.status === "fulfilled") {
          sent += 1;
        } else {
          failed += 1;
        }
      }

      await yieldToEventLoop();
      if (batchDelay > 0) {
        await wait(batchDelay);
      }
    }

    const log = await EmailLog.create({
      subject,
      body,
      totalUsersSent: sent,
      sentAt: new Date(),
      adminId: req.user._id,
    });

    return res.json({
      message: "Broadcast completed",
      subject,
      totalUsers: emails.length,
      sent,
      failed,
      logId: log._id,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to send broadcast" });
  }
};

export const getEmailLogsController = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      EmailLog.find()
        .populate("adminId", "name email")
        .sort({ sentAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      EmailLog.countDocuments(),
    ]);

    const normalizedLogs = logs.map((log) => {
      const doc = log.toObject();
      return {
        ...doc,
        admin: doc.adminId || null,
      };
    });

    return res.json({
      logs: normalizedLogs,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load email logs" });
  }
};
