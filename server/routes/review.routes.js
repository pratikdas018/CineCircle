import express from "express";
import {
  addReview,
  getMovieReviews,
  deleteReview,
  getFriendsReviews,
  addComment,
  updateComment,
  deleteComment,
  likeReview
} from "../controllers/review.controller.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/", protect, upload.single("image"), addReview);
router.get("/:movieId", getMovieReviews);
router.delete("/:id", protect, deleteReview);
router.get("/feed/friends", protect, getFriendsReviews);
router.post("/:id/like", protect, likeReview);

// 💬 Comment Routes
router.post("/:id/comments", protect, addComment);
router.put("/:id/comments/:commentId", protect, updateComment);
router.delete("/:id/comments/:commentId", protect, deleteComment);

export default router;
