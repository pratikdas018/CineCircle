import express from "express";
import { getTrendingMovies } from "../controllers/trending.controller.js";

const router = express.Router();

router.get("/", getTrendingMovies);

export default router;

