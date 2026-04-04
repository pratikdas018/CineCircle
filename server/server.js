import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import multer from "multer";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import Message from "./models/Message.js";
import User from "./models/User.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import movieRoutes from "./routes/movie.routes.js";
import watchlistRoutes from "./routes/watchlist.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import friendRoutes from "./routes/friend.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import reminderRoutes from "./routes/reminder.routes.js";
import startReminderJob from "./utils/scheduler.js";
import streamingRoutes from "./routes/streaming.routes.js";
import searchRoutes from "./routes/search.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import clubRoutes from "./routes/club.routes.js";
import availabilityAlertRoutes from "./routes/availabilityAlert.routes.js";
import alertRoutes from "./routes/alert.routes.js";
import trendingRoutes from "./routes/trending.routes.js";
import startAlertCron from "./cron/alertCron.js";
import { verifyEmailTransport } from "./utils/sendEmail.js";
import { protect } from "./middleware/authMiddleware.js";
import {
  addOnlineUser,
  emitToUser,
  isUserOnline,
  removeOnlineUserBySocket,
  setSocketServer,
} from "./utils/socketState.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

connectDB();
startReminderJob();
startAlertCron();
verifyEmailTransport();

const app = express();
app.set("trust proxy", 1);

const server = http.createServer(app);

const normalizeOrigin = (value = "") => String(value || "").trim().replace(/\/+$/, "");
const parseAllowedOrigins = () => {
  const raw = process.env.CORS_ORIGINS || process.env.CLIENT_URL || "";
  return [...new Set(raw.split(",").map(normalizeOrigin).filter(Boolean))];
};
const allowedOrigins = parseAllowedOrigins();

const matchesAllowedOrigin = (origin = "") => {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return true;
  if (!allowedOrigins.length) return true;

  return allowedOrigins.some((rule) => {
    if (!rule.includes("*")) {
      return rule === normalizedOrigin;
    }

    const escapedRule = rule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${escapedRule}$`, "i").test(normalizedOrigin);
  });
};

const corsOptions = {
  origin: (origin, callback) => {
    if (process.env.NODE_ENV !== "production") {
      callback(null, true);
      return;
    }

    if (matchesAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
};

const normalizeSocketId = (value) => String(value || "").trim();
const getSocketToken = (socket) => {
  const authToken = socket?.handshake?.auth?.token;
  if (typeof authToken === "string" && authToken.trim()) {
    return authToken.replace(/^Bearer\s+/i, "").trim();
  }

  const headerToken = socket?.handshake?.headers?.authorization;
  if (typeof headerToken === "string" && headerToken.trim()) {
    return headerToken.replace(/^Bearer\s+/i, "").trim();
  }

  return "";
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/streaming", streamingRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/availability-alerts", availabilityAlertRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/trending", trendingRoutes);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${randomUUID()}${path.extname(file.originalname)}`);
  },
});
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Only JPG, PNG, WEBP, and GIF image uploads are allowed"));
      return;
    }
    cb(null, true);
  },
});

app.post("/api/chat/upload", protect, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  return res.json({ filePath: `/uploads/${req.file.filename}` });
});

app.get("/", (req, res) => {
  res.send("CineCircle API is running");
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "File size exceeds 5MB limit" });
    }
    return res.status(400).json({ message: err.message || "Upload failed" });
  }

  if (
    typeof err?.message === "string" &&
    err.message.includes("Only JPG, PNG, WEBP, and GIF image uploads are allowed")
  ) {
    return res.status(400).json({ message: err.message });
  }

  console.error(`Error: ${err.message}`);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({ message: err.message || "Internal Server Error" });
});

const io = new Server(server, {
  cors: corsOptions,
});
setSocketServer(io);

io.use(async (socket, next) => {
  try {
    const token = getSocketToken(socket);
    if (!token) {
      return next(new Error("Unauthorized"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = normalizeSocketId(decoded?.id);
    if (!userId) {
      return next(new Error("Unauthorized"));
    }

    const user = await User.findById(userId).select("_id");
    if (!user) {
      return next(new Error("Unauthorized"));
    }

    socket.data.userId = String(user._id);
    return next();
  } catch (error) {
    return next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  const socketUserId = normalizeSocketId(socket.data?.userId);
  if (!socketUserId) {
    socket.disconnect(true);
    return;
  }

  const becameOnline = addOnlineUser(socketUserId, socket.id);
  if (becameOnline) {
    io.emit("userOnline", socketUserId);
  }

  socket.on("addUser", () => {
    const online = addOnlineUser(socketUserId, socket.id);
    if (online) {
      io.emit("userOnline", socketUserId);
    }
  });

  socket.on("sendMessage", async (payload = {}) => {
    try {
      const receiverId = normalizeSocketId(payload.receiverId);
      const messageText = typeof payload.text === "string" ? payload.text.trim() : "";
      const image = typeof payload.image === "string" ? payload.image.trim() : "";
      const replyTo = normalizeSocketId(payload.replyTo);

      if (!receiverId) return;
      if (!messageText && !image) return;

      const message = await Message.create({
        sender: socketUserId,
        receiver: receiverId,
        text: messageText,
        image,
        replyTo: replyTo || undefined,
      });

      await message.populate("replyTo");

      emitToUser(receiverId, "receiveMessage", message);
      socket.emit("receiveMessage", message);
    } catch (error) {
      console.error("Socket message error:", error.message);
    }
  });

  socket.on("typing", ({ receiverId } = {}) => {
    const targetId = normalizeSocketId(receiverId);
    if (!targetId) return;
    emitToUser(targetId, "typing", { senderId: socketUserId });
  });

  socket.on("stopTyping", ({ receiverId } = {}) => {
    const targetId = normalizeSocketId(receiverId);
    if (!targetId) return;
    emitToUser(targetId, "stopTyping", { senderId: socketUserId });
  });

  socket.on("checkOnlineStatus", (userId, callback) => {
    if (typeof callback === "function") {
      callback(isUserOnline(userId));
    }
  });

  socket.on("markMessagesSeen", async (payload = {}) => {
    try {
      const senderId = normalizeSocketId(payload.senderId);
      const receiverId = normalizeSocketId(payload.receiverId);
      const peerId = normalizeSocketId(payload.peerId);
      const otherUserId = [senderId, receiverId, peerId].find(
        (candidate) => candidate && candidate !== socketUserId
      );

      if (!otherUserId) return;

      await Message.updateMany(
        { sender: otherUserId, receiver: socketUserId, seen: false },
        { $set: { seen: true } }
      );

      emitToUser(otherUserId, "messagesSeen", { senderId: socketUserId });
    } catch (error) {
      console.error("Error marking messages as seen:", error);
    }
  });

  socket.on("editMessage", async ({ messageId, newText } = {}) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;
      if (String(message.sender) !== socketUserId) return;

      message.text = String(newText || "").trim();
      if (!message.text) return;
      message.isEdited = true;
      await message.save();

      emitToUser(message.receiver, "messageUpdated", message);
      emitToUser(message.sender, "messageUpdated", message);
    } catch (error) {
      console.error("Error editing message:", error);
    }
  });

  socket.on("toggleReaction", async ({ messageId, emoji } = {}) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;
      const userCanAccessMessage =
        String(message.sender) === socketUserId || String(message.receiver) === socketUserId;
      if (!userCanAccessMessage) return;
      if (!String(emoji || "").trim()) return;

      const existingReactionIndex = message.reactions.findIndex(
        (reaction) => reaction.user.toString() === socketUserId && reaction.emoji === emoji
      );

      if (existingReactionIndex > -1) {
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        message.reactions.push({ user: socketUserId, emoji });
      }

      await message.save();

      emitToUser(message.sender, "messageReactionUpdated", message);
      emitToUser(message.receiver, "messageReactionUpdated", message);
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  });

  socket.on("togglePin", async ({ messageId } = {}) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;
      const userCanAccessMessage =
        String(message.sender) === socketUserId || String(message.receiver) === socketUserId;
      if (!userCanAccessMessage) return;

      message.pinned = !message.pinned;
      await message.save();
      await message.populate("replyTo");

      emitToUser(message.sender, "messagePinned", message);
      emitToUser(message.receiver, "messagePinned", message);
    } catch (error) {
      console.error("Error toggling pin:", error);
    }
  });

  // Legacy client event support
  socket.on("sendNotification", ({ recipientId, senderName, type, movieTitle }) => {
    emitToUser(recipientId, "getNotification", { senderName, type, movieTitle });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    const { userId, becameOffline } = removeOnlineUserBySocket(socket.id);
    if (becameOffline && userId) {
      io.emit("userOffline", userId);
    }
  });
});

const PORT = process.env.PORT || 5000;

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Another backend instance is already running. Stop the old process or use a different PORT.`
    );
    process.exit(0);
  }
  throw error;
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running with Socket.io on port ${PORT}`);
});
