import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import { emitToUser } from "../utils/socketState.js";

const parsePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
};

// Get all notifications for the current user
export const getNotifications = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1, 10_000);
    const limit = parsePositiveInt(req.query.limit, 10, 50);
    const skip = (page - 1) * limit;

    const query = { recipient: req.user._id };

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate("sender", "name avatar")
        .populate({
          path: "reviewId",
          select: "movieId",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
    ]);

    const hasMore = skip + notifications.length < total;
    return res.json({ notifications, hasMore, total, page, limit });
  } catch (error) {
    console.error("getNotifications error:", error.message);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

// Mark all notifications as read
export const markNotificationsAsRead = async (req, res) => {
  try {
    const query = { recipient: req.user._id, read: false };
    const updateResult = await Notification.updateMany(query, { $set: { read: true } });

    emitToUser(req.user._id, "notification:unread-count", { unreadCount: 0 });

    return res.json({
      message: "Notifications marked as read",
      updatedCount: Number(updateResult?.modifiedCount || 0),
      unreadCount: 0,
    });
  } catch (error) {
    console.error("markNotificationsAsRead error:", error.message);
    return res.status(500).json({ message: "Failed to mark notifications as read" });
  }
};

// Get count of unread notifications
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user._id, read: false });
    return res.json({ count, unreadCount: count });
  } catch (error) {
    console.error("getUnreadCount error:", error.message);
    return res.status(500).json({ message: "Failed to fetch unread count" });
  }
};

// Mark a single notification as read
export const markSingleNotificationAsRead = async (req, res) => {
  try {
    const notificationId = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    const query = { _id: notificationId, recipient: req.user._id };

    const existingNotification = await Notification.findOne(query).select("_id read").lean();
    if (!existingNotification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (!existingNotification.read) {
      await Notification.updateOne(query, { $set: { read: true } });
    }

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    emitToUser(req.user._id, "notification:unread-count", { unreadCount });

    return res.json({ message: "Notification marked as read", unreadCount });
  } catch (error) {
    console.error("markSingleNotificationAsRead error:", error.message);
    return res.status(500).json({ message: "Failed to mark notification as read" });
  }
};
