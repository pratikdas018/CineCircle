import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: false,
    },
    googleId: {
      type: String,
    },
    avatar: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      required: false,
    },
    otpHash: {
      type: String,
      required: false,
    },
    otpExpires: {
      type: Date,
      required: false,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
    otpLockUntil: {
      type: Date,
      required: false,
    },
    otpLastSentAt: {
      type: Date,
      required: false,
    },

    // ✅ Accepted Friends
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // 📨 Pending Friend Requests (people who sent YOU requests)
    friendRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
