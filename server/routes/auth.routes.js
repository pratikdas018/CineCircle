import express from "express";
import rateLimit from "express-rate-limit";
import {
  registerUser,
  loginUser,
  googleLogin,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";

const router = express.Router();

// General auth limiter to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 12, // Limit each IP to 12 requests per windowMs
  message: { message: "Too many attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyOTPLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  message: { message: "Too many OTP verification attempts. Please try again after 10 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for resending OTP: 5 requests per 10 minutes
const resendOTPLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: { message: "Too many OTP requests. Please try again after 10 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 6,
  message: { message: "Too many password reset requests. Please try again after 10 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetPasswordLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 12,
  message: { message: "Too many reset attempts. Please try again after 10 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.post("/google", googleLogin);
router.post("/verify-otp", verifyOTPLimiter, verifyOTP);
router.post("/resend-otp", resendOTPLimiter, resendOTP);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", resetPasswordLimiter, resetPassword);

export default router;
