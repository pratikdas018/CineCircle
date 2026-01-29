import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import path from "path";
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


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
connectDB();
startReminderJob();


const app = express();
const server = http.createServer(app); // 🔥 Create HTTP server for Socket.io

// 🔧 CORS Configuration
const corsOptions = {
  origin: (origin, callback) => callback(null, true), // Allow all origins dynamically
  credentials: true,
};

// 🌍 Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 🧪 Test Route
app.get("/", (req, res) => {
  res.send("🎬 CineCircle API is running...");
});

// 🛣️ API Routes
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

// ================= SOCKET.IO =================
const io = new Server(server, {
  cors: corsOptions,
});

// Store online users
let onlineUsers = {};

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // User joins
  socket.on("addUser", (userId) => {
    onlineUsers[userId] = socket.id;
  });

  // Send message
  socket.on("sendMessage", async ({ senderId, receiverId, text }) => {
    try {
      const message = await Message.create({
        sender: senderId,
        receiver: receiverId,
        text,
      });

      // Send to receiver if online
      const receiverSocket = onlineUsers[receiverId];
      if (receiverSocket) {
        io.to(receiverSocket).emit("receiveMessage", message);
      }

      // Send back to sender
      socket.emit("receiveMessage", message);
    } catch (error) {
      console.error("Socket message error:", error.message);
    }
  });

  // Typing indicators
  socket.on("typing", ({ senderId, receiverId }) => {
    const receiverSocket = onlineUsers[receiverId];
    if (receiverSocket) {
      io.to(receiverSocket).emit("typing", { senderId });
    }
  });

  socket.on("stopTyping", ({ senderId, receiverId }) => {
    const receiverSocket = onlineUsers[receiverId];
    if (receiverSocket) {
      io.to(receiverSocket).emit("stopTyping", { senderId });
    }
  });

  // User disconnects
  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
    for (const userId in onlineUsers) {
      if (onlineUsers[userId] === socket.id) {
        delete onlineUsers[userId];
      }
    }
  });
});
// ============================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running with Socket.io on port ${PORT}`);
});
