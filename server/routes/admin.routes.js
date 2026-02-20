import express from "express";
import {
  generateAIEmailController,
  getEmailLogsController,
  sendBroadcastController,
  deleteReviewAdmin,
  deleteUserAdmin,
  getAdminStats,
  getReviewsAdmin,
  getUsersAdmin,
  updateUserRoleAdmin,
} from "../controllers/adminController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, adminOnly);

router.get("/stats", getAdminStats);
router.get("/users", getUsersAdmin);
router.put("/users/:id/role", updateUserRoleAdmin);
router.delete("/users/:id", deleteUserAdmin);

router.get("/reviews", getReviewsAdmin);
router.delete("/reviews/:id", deleteReviewAdmin);

// Canonical routes required by current Admin Email Panel
router.post("/generate-email", generateAIEmailController);
router.post("/send-broadcast", sendBroadcastController);

// Backward-compatible aliases
router.post("/generate-ai-email", generateAIEmailController);
router.post("/emails/generate", generateAIEmailController);
router.post("/email/generate", generateAIEmailController);
router.post("/emails/broadcast", sendBroadcastController);
router.post("/broadcast-email", sendBroadcastController);
router.post("/email/broadcast", sendBroadcastController);
router.get("/emails/logs", getEmailLogsController);
router.get("/email/logs", getEmailLogsController);

export default router;
