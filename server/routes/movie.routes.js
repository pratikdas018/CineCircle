import express from "express";
import {
  getExploreMovies,
  getMovieDetails,
  getRecommendations,
  getTrendingMovies,
  searchMovies,
} from "../controllers/movie.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/search", searchMovies);
router.get("/trending", getTrendingMovies);
router.get("/explore", getExploreMovies);
router.get("/recommendations/me", protect, getRecommendations);
router.get("/:id", getMovieDetails);

export default router;
