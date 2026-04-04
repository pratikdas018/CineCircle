import express from "express";
import { createAlert, deleteAlert, getAlerts } from "../controllers/alert.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createAlert);
router.get("/", protect, getAlerts);
router.delete("/:id", protect, deleteAlert);

export default router;

