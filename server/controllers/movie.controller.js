import axios from "axios";


import Watchlist from "../models/Watchlist.js";
import Review from "../models/Review.js";

const OMDB_API_KEY = process.env.TMDB_API_KEY; // Using the key you stored in this variable

export const getRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;
    const watched = await Watchlist.find({ user: userId });
    const movieIds = watched.map((m) => m.movieId);

    if (movieIds.length === 0) return res.json([]);

    const randomMovieId = movieIds[Math.floor(Math.random() * movieIds.length)];

    // 1. Get details of a random movie from watchlist to find its genre
    const movieDetails = await axios.get(`https://www.omdbapi.com/?i=${randomMovieId}&apikey=${OMDB_API_KEY}`);
    
    if (movieDetails.data.Response === "False") return res.json([]);

    // 2. Use the first genre to search for similar movies (Discovery mode)
    const genre = movieDetails.data.Genre.split(",")[0].trim();
    const recommendations = await axios.get(`https://www.omdbapi.com/?s=${genre}&apikey=${OMDB_API_KEY}`);

    if (recommendations.data.Response === "True") {
      // Return results in OMDb format (Title, Year, imdbID, Poster)
      res.json(recommendations.data.Search.slice(0, 10));
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error("Recommendation Error:", error.message);
    res.json([]); // Return empty array instead of 500 to keep UI stable
  }
};

// 🔍 Search Movies
export const searchMovies = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(400).json({ message: "Query is required" });

    const response = await axios.get(`https://www.omdbapi.com/?s=${query}&apikey=${OMDB_API_KEY}`);
    
    if (response.data.Response === "True") {
      res.json(response.data.Search);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error("Search Error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// 🎬 Get Movie Details
export const getMovieDetails = async (req, res) => {
  try {
    const movieId = req.params.id;

    const response = await axios.get(`https://www.omdbapi.com/?i=${movieId}&plot=full&apikey=${OMDB_API_KEY}`);
    
    res.json(response.data);
  } catch (error) {
    console.error("Movie Details Error:", error.message);
    res.status(500).json({ message: error.message });
  }
};
