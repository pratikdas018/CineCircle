import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import axios from "axios";
import crypto from "crypto";
import { sendEmail, sendPasswordResetEmail } from "../utils/sendEmail.js";
import { enqueueEmailTask } from "../utils/emailQueue.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCK_MS = 15 * 60 * 1000;
const RESET_PASSWORD_TTL_MS = 15 * 60 * 1000;
const RESET_PASSWORD_COOLDOWN_MS = 60 * 1000;
const MIN_PASSWORD_LENGTH = 6;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const getInitialRole = (email) => {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(normalizeEmail(email)) ? "admin" : "user";
};

const isAdminEmail = (email) => getInitialRole(email) === "admin";

const isAdminPasswordValid = (password) => {
  const adminPass = process.env.ADMIN_PASS;
  return Boolean(adminPass) && password === adminPass;
};

const adminNameFromEmail = (email) => {
  const localPart = String(email || "").split("@")[0] || "admin";
  return localPart.replace(/[._-]+/g, " ").trim() || "admin";
};

const buildAuthPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar || "",
  role: user.role || "user",
  token: generateToken(user._id),
});

const ensureAdminRoleFromEmail = (user) => {
  const shouldBeAdmin = getInitialRole(user.email) === "admin";
  if (shouldBeAdmin && user.role !== "admin") {
    user.role = "admin";
    return true;
  }
  return false;
};

const getOtpSecret = () => process.env.OTP_SECRET || process.env.JWT_SECRET || "sceneit_otp_secret";
const getResetSecret = () =>
  process.env.RESET_PASSWORD_SECRET || process.env.OTP_SECRET || process.env.JWT_SECRET || "sceneit_reset_secret";

const hashOtp = (email, otp) =>
  crypto
    .createHmac("sha256", getOtpSecret())
    .update(`${normalizeEmail(email)}:${String(otp).trim()}`)
    .digest("hex");
const hashResetToken = (token) =>
  crypto
    .createHmac("sha256", getResetSecret())
    .update(`reset:${String(token || "").trim()}`)
    .digest("hex");

const generateOtp = () => crypto.randomInt(100000, 999999).toString();
const generateResetToken = () => crypto.randomBytes(32).toString("hex");

const clearOtpState = (user) => {
  user.otp = undefined;
  user.otpHash = undefined;
  user.otpExpires = undefined;
  user.otpAttempts = 0;
  user.otpLockUntil = undefined;
  user.otpLastSentAt = undefined;
};

const clearResetState = (user) => {
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpires = undefined;
  user.resetPasswordLastSentAt = undefined;
};

const setOtpState = (user, otp) => {
  user.otp = undefined;
  user.otpHash = hashOtp(user.email, otp);
  user.otpExpires = new Date(Date.now() + OTP_TTL_MS);
  user.otpAttempts = 0;
  user.otpLockUntil = undefined;
  user.otpLastSentAt = new Date();
};

const setResetState = (user, token) => {
  user.resetPasswordTokenHash = hashResetToken(token);
  user.resetPasswordExpires = new Date(Date.now() + RESET_PASSWORD_TTL_MS);
  user.resetPasswordLastSentAt = new Date();
};

const isOtpLocked = (user) => {
  if (!user?.otpLockUntil) return false;
  return new Date(user.otpLockUntil).getTime() > Date.now();
};

const secondsUntilDate = (dateValue) => {
  const millis = new Date(dateValue).getTime() - Date.now();
  return Math.max(1, Math.ceil(millis / 1000));
};

const canResendOtp = (user) => {
  if (!user?.otpLastSentAt) return true;
  const elapsed = Date.now() - new Date(user.otpLastSentAt).getTime();
  return elapsed >= OTP_RESEND_COOLDOWN_MS;
};

const canRequestPasswordReset = (user) => {
  if (!user?.resetPasswordLastSentAt) return true;
  const elapsed = Date.now() - new Date(user.resetPasswordLastSentAt).getTime();
  return elapsed >= RESET_PASSWORD_COOLDOWN_MS;
};

const getResendCooldownSeconds = (user) => {
  if (!user?.otpLastSentAt) return 0;
  const nextAllowedTime = new Date(user.otpLastSentAt).getTime() + OTP_RESEND_COOLDOWN_MS;
  return Math.max(1, Math.ceil((nextAllowedTime - Date.now()) / 1000));
};

const isOtpExpired = (user) => {
  if (!user?.otpExpires) return true;
  return new Date(user.otpExpires).getTime() < Date.now();
};

const otpMatches = (user, providedOtp) => {
  const normalizedOtp = String(providedOtp || "").trim();
  if (!normalizedOtp) return false;

  const hashed = hashOtp(user.email, normalizedOtp);
  const hashMatches = Boolean(user.otpHash) && user.otpHash === hashed;
  const legacyMatches = Boolean(user.otp) && user.otp === normalizedOtp;

  return hashMatches || legacyMatches;
};

const queueOtpEmail = async (email, subject, otp) => {
  await enqueueEmailTask(() => sendEmail(email, subject, otp), {
    retries: 3,
    retryDelayMs: 900,
  });
};

const getClientAppUrl = () =>
  (
    process.env.FRONTEND_URL ||
    process.env.APP_URL ||
    process.env.CLIENT_URL ||
    "https://cine-circle-ten.vercel.app"
  ).replace(/\/$/, "");

const queuePasswordResetEmail = async (email, resetLink) => {
  await enqueueEmailTask(() => sendPasswordResetEmail(email, resetLink), {
    retries: 3,
    retryDelayMs: 900,
  });
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists && userExists.isVerified) {
      return res.status(400).json({ message: "User already exists" });
    }

    if (userExists && !userExists.isVerified) {
      if (!canResendOtp(userExists)) {
        return res.status(429).json({
          message: `Please wait ${getResendCooldownSeconds(userExists)}s before requesting another OTP.`,
          email: userExists.email,
        });
      }

      const otp = generateOtp();
      setOtpState(userExists, otp);

      if (!userExists.password) {
        const salt = await bcrypt.genSalt(10);
        userExists.password = await bcrypt.hash(password, salt);
      }

      if (!userExists.name && name) {
        userExists.name = name;
      }

      await userExists.save();

      try {
        await queueOtpEmail(userExists.email, "CineCircle OTP Verification Code", otp);
      } catch {
        return res.status(503).json({
          message: "Could not send OTP email right now. Please try again.",
          email: userExists.email,
        });
      }

      return res.status(200).json({
        message: "Account exists but is unverified. A new OTP has been sent.",
        email: userExists.email,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: getInitialRole(normalizedEmail),
      isVerified: false,
    });

    const otp = generateOtp();
    setOtpState(user, otp);
    await user.save();

    try {
      await queueOtpEmail(user.email, "CineCircle OTP Verification Code", otp);
    } catch {
      return res.status(503).json({
        message: "Account created but OTP email could not be sent. Please resend OTP.",
        email: user.email,
      });
    }

    return res.status(201).json({
      message: "Registration successful. Please check your email for the OTP.",
      email: user.email,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const submittedOtp = String(otp || "").trim();

    if (!normalizedEmail || !submittedOtp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    if (isOtpLocked(user)) {
      return res.status(429).json({
        message: `Too many invalid OTP attempts. Try again in ${secondsUntilDate(user.otpLockUntil)}s.`,
      });
    }

    if (isOtpExpired(user)) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (!otpMatches(user, submittedOtp)) {
      user.otpAttempts = Number(user.otpAttempts || 0) + 1;

      if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
        user.otpAttempts = 0;
        user.otpLockUntil = new Date(Date.now() + OTP_LOCK_MS);
        await user.save();

        return res.status(429).json({
          message: `Too many invalid OTP attempts. Try again in ${secondsUntilDate(user.otpLockUntil)}s.`,
        });
      }

      await user.save();
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    clearOtpState(user);
    ensureAdminRoleFromEmail(user);
    await user.save();

    return res.json(buildAuthPayload(user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const resendOTP = async (req, res) => {
  try {
    const genericSuccessMessage = "If an account exists, a new OTP has been sent.";
    const normalizedEmail = normalizeEmail(req.body?.email);

    if (!normalizedEmail) {
      return res.status(200).json({ message: genericSuccessMessage });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user || user.isVerified) {
      return res.status(200).json({ message: genericSuccessMessage });
    }

    if (isOtpLocked(user)) {
      return res.status(200).json({ message: genericSuccessMessage });
    }

    if (!canResendOtp(user)) {
      return res.status(200).json({ message: genericSuccessMessage });
    }

    const otp = generateOtp();
    setOtpState(user, otp);
    await user.save();

    try {
      await queueOtpEmail(user.email, "CineCircle OTP Code (Resend)", otp);
    } catch {
      return res.status(503).json({ message: "Could not resend OTP right now. Please try again." });
    }

    return res.status(200).json({ message: genericSuccessMessage });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const genericSuccessMessage =
      "If an account exists with this email, a password reset link has been sent.";
    const normalizedEmail = normalizeEmail(req.body?.email);

    if (!normalizedEmail) {
      return res.status(200).json({ message: genericSuccessMessage });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(200).json({ message: genericSuccessMessage });
    }

    if (!canRequestPasswordReset(user)) {
      return res.status(200).json({ message: genericSuccessMessage });
    }

    const resetToken = generateResetToken();
    setResetState(user, resetToken);
    await user.save();

    const resetLink = `${getClientAppUrl()}/reset-password?token=${encodeURIComponent(resetToken)}`;
    try {
      await queuePasswordResetEmail(user.email, resetLink);
    } catch {
      return res.status(503).json({ message: "Could not send reset link right now. Please try again." });
    }

    return res.status(200).json({ message: genericSuccessMessage });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const password = String(req.body?.password || "");

    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long` });
    }

    const tokenHash = hashResetToken(token);
    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.isVerified = true;
    clearResetState(user);
    ensureAdminRoleFromEmail(user);
    await user.save();

    return res.status(200).json({ message: "Password reset successful. Please login." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { accessToken } = req.body;

    const googleResponse = await axios.get(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
    );

    const { sub: googleId, email, name, picture: avatar } = googleResponse.data;
    const normalizedEmail = normalizeEmail(email);

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        name,
        email: normalizedEmail,
        avatar,
        googleId,
        role: getInitialRole(normalizedEmail),
        isVerified: true,
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      if (!user.avatar) user.avatar = avatar;
      ensureAdminRoleFromEmail(user);
      await user.save();
    } else {
      const roleChanged = ensureAdminRoleFromEmail(user);
      if (roleChanged) {
        await user.save();
      }
    }

    return res.json(buildAuthPayload(user));
  } catch (error) {
    return res.status(400).json({ message: "Google authentication failed" });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (isAdminEmail(normalizedEmail) && isAdminPasswordValid(password)) {
      let adminUser = await User.findOne({ email: normalizedEmail });

      if (!adminUser) {
        adminUser = await User.create({
          name: adminNameFromEmail(normalizedEmail),
          email: normalizedEmail,
          role: "admin",
          isVerified: true,
        });
      } else {
        let shouldSave = false;

        if (adminUser.role !== "admin") {
          adminUser.role = "admin";
          shouldSave = true;
        }
        if (!adminUser.isVerified) {
          adminUser.isVerified = true;
          shouldSave = true;
        }
        if (!adminUser.name) {
          adminUser.name = adminNameFromEmail(normalizedEmail);
          shouldSave = true;
        }

        if (shouldSave) {
          await adminUser.save();
        }
      }

      return res.json(buildAuthPayload(adminUser));
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.password) {
      return res.status(400).json({ message: "Use Google sign-in for this account" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      if (isOtpLocked(user)) {
        return res.status(429).json({
          message: `Too many invalid OTP attempts. Try again in ${secondsUntilDate(user.otpLockUntil)}s.`,
          isUnverified: true,
          email: user.email,
        });
      }

      let message = "Please verify your email. A verification OTP has been sent to your inbox.";

      if (canResendOtp(user) || isOtpExpired(user)) {
        const otp = generateOtp();
        setOtpState(user, otp);
        await user.save();

        try {
          await queueOtpEmail(user.email, "CineCircle OTP Verification Code", otp);
        } catch {
          message = "Please verify your email. We could not send OTP right now. Try resend OTP.";
        }
      } else {
        message = `Please verify your email with your latest OTP, or request another OTP in ${getResendCooldownSeconds(user)}s.`;
      }

      return res.status(401).json({
        message,
        isUnverified: true,
        email: user.email,
      });
    }

    if (ensureAdminRoleFromEmail(user)) {
      await user.save();
    }

    return res.json(buildAuthPayload(user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
