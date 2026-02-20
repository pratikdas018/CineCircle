import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import Message from "./models/Message.js";

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
import { verifyEmailTransport } from "./utils/sendEmail.js";
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
verifyEmailTransport();

const app = express();
app.set("trust proxy", 1);

const server = http.createServer(app);

const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, "") : "";
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? clientUrl
      : (origin, callback) => callback(null, true),
  credentials: true,
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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

app.post("/api/chat/upload", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  return res.json({ filePath: `/uploads/${req.file.filename}` });
});

app.get("/", (req, res) => {
  res.send("CineCircle API is running");
});

app.use((err, req, res, next) => {
  console.error(`Error: ${err.message}`);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({ message: err.message || "Internal Server Error" });
});

const io = new Server(server, {
  cors: corsOptions,
});
setSocketServer(io);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("addUser", (userId) => {
    const becameOnline = addOnlineUser(userId, socket.id);
    if (becameOnline) {
      io.emit("userOnline", String(userId));
    }
  });

  socket.on("sendMessage", async ({ senderId, receiverId, text, image, replyTo }) => {
    try {
      const message = await Message.create({
        sender: senderId,
        receiver: receiverId,
        text,
        image,
        replyTo,
      });

      await message.populate("replyTo");

      emitToUser(receiverId, "receiveMessage", message);
      socket.emit("receiveMessage", message);
    } catch (error) {
      console.error("Socket message error:", error.message);
    }
  });

  socket.on("typing", ({ senderId, receiverId }) => {
    emitToUser(receiverId, "typing", { senderId });
  });

  socket.on("stopTyping", ({ senderId, receiverId }) => {
    emitToUser(receiverId, "stopTyping", { senderId });
  });

  socket.on("checkOnlineStatus", (userId, callback) => {
    callback(isUserOnline(userId));
  });

  socket.on("markMessagesSeen", async ({ senderId, receiverId }) => {
    try {
      await Message.updateMany(
        { sender: senderId, receiver: receiverId, seen: false },
        { $set: { seen: true } }
      );

      emitToUser(senderId, "messagesSeen", { senderId: receiverId });
    } catch (error) {
      console.error("Error marking messages as seen:", error);
    }
  });

  socket.on("editMessage", async ({ messageId, newText }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      message.text = newText;
      message.isEdited = true;
      await message.save();

      emitToUser(message.receiver, "messageUpdated", message);
      emitToUser(message.sender, "messageUpdated", message);
    } catch (error) {
      console.error("Error editing message:", error);
    }
  });

  socket.on("toggleReaction", async ({ messageId, userId, emoji }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      const existingReactionIndex = message.reactions.findIndex(
        (reaction) => reaction.user.toString() === userId && reaction.emoji === emoji
      );

      if (existingReactionIndex > -1) {
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        message.reactions.push({ user: userId, emoji });
      }

      await message.save();

      emitToUser(message.sender, "messageReactionUpdated", message);
      emitToUser(message.receiver, "messageReactionUpdated", message);
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  });

  socket.on("togglePin", async ({ messageId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

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
