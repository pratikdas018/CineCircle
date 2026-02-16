import Notification from "../models/Notification.js";
import { emitToUser } from "./socketState.js";

const toObjectId = (value) => String(value || "").trim();

export const createNotificationAndEmit = async ({
  recipient,
  sender,
  type,
  reviewId,
  movieTitle,
}) => {
  const recipientId = toObjectId(recipient);
  const senderId = toObjectId(sender);

  if (!recipientId || !senderId || recipientId === senderId) {
    return null;
  }

  const notification = await Notification.create({
    recipient: recipientId,
    sender: senderId,
    type,
    reviewId,
    movieTitle,
  });

  const populatedNotification = await Notification.findById(notification._id)
    .populate("sender", "name avatar")
    .populate({
      path: "reviewId",
      select: "movieId",
    })
    .lean();

  const unreadCount = await Notification.countDocuments({
    recipient: recipientId,
    read: false,
  });

  emitToUser(recipientId, "notification:new", {
    notification: populatedNotification,
    unreadCount,
  });

  return populatedNotification;
};
