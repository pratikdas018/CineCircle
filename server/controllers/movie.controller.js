import Watchlist from "../models/Watchlist.js";
import { resolveTmdbMovieId } from "../utils/providerAvailability.js";
import {
  hasTmdbApiKey,
  mapTmdbMovieToCard,
  mapTmdbMovieToDetails,
  tmdbRequest,
} from "../utils/tmdb.js";

const normalizePage = (value, fallback = 1) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), 20);
};

const randomPage = (max = 5) => Math.floor(Math.random() * max) + 1;

const toCardList = (movies = []) =>
  (movies || [])
    .map((movie) => mapTmdbMovieToCard(movie))
    .filter((movie) => Boolean(movie.imdbID));

const getTrendingFallback = async () => {
  if (!hasTmdbApiKey()) return [];

  const data = await tmdbRequest("/trending/movie/week", {
    page: randomPage(5),
    include_adult: false,
  });

  return toCardList(data.results || []).slice(0, 10);
};

const assertTmdbConfigured = (res) => {
  if (hasTmdbApiKey()) return true;
  res.status(500).json({
    message: "TMDB credentials are not configured on server (TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN)",
  });
  return false;
};

export const getRecommendations = async (req, res) => {
  try {
    if (!assertTmdbConfigured(res)) return;

    const watchedMovies = await Watchlist.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(15);

    const resolvedWatchlistTmdbIds = [
      ...new Set(
        (
          await Promise.all(
            watchedMovies.map((movie) =>
              resolveTmdbMovieId(movie.movieId).catch(() => null)
            )
          )
        )
          .filter(Boolean)
          .map((id) => String(id))
      ),
    ];

    if (!resolvedWatchlistTmdbIds.length) {
      return res.json(await getTrendingFallback());
    }

    const sampleIds = resolvedWatchlistTmdbIds.slice(0, 5);
    const sampledMovies = await Promise.all(
      sampleIds.map((id) => tmdbRequest(`/movie/${id}`).catch(() => null))
    );

    const genreCounter = new Map();
    sampledMovies.forEach((movie) => {
      (movie?.genres || []).forEach((genre) => {
        const existing = genreCounter.get(genre.id) || {
          id: genre.id,
          name: genre.name,
          count: 0,
        };
        existing.count += 1;
        genreCounter.set(genre.id, existing);
      });
    });

    const sortedGenres = [...genreCounter.values()].sort((a, b) => b.count - a.count);

    if (!sortedGenres.length) {
      return res.json(await getTrendingFallback());
    }

    const topGenres = sortedGenres.slice(0, 3);
    const selectedGenre = topGenres[Math.floor(Math.random() * topGenres.length)];

    const discovered = await tmdbRequest("/discover/movie", {
      with_genres: selectedGenre.id,
      sort_by: "popularity.desc",
      include_adult: false,
      page: randomPage(5),
    });

    const recommendations = toCardList(discovered.results || [])
      .filter((movie) => !resolvedWatchlistTmdbIds.includes(movie.tmdbID))
      .slice(0, 10);

    if (!recommendations.length) {
      return res.json(await getTrendingFallback());
    }

    return res.json(recommendations);
  } catch (error) {
    console.error("Recommendation Error:", error.message);
    return res.json([]);
  }
};

export const searchMovies = async (req, res) => {
  try {
    if (!assertTmdbConfigured(res)) return;

    const query = String(req.query.q || "").trim();
    if (!query) {
      return res.status(400).json({ message: "Query is required" });
    }

    const page = normalizePage(req.query.page, 1);
    const data = await tmdbRequest("/search/movie", {
      query,
      include_adult: false,
      page,
    });

    return res.json(toCardList(data.results || []));
  } catch (error) {
    console.error("Search Error:", error.message);
    return res.status(500).json({ message: error.message || "Failed to search movies" });
  }
};

export const getTrendingMovies = async (req, res) => {
  try {
    if (!assertTmdbConfigured(res)) return;

    const page = normalizePage(req.query.page, 1);
    const data = await tmdbRequest("/trending/movie/week", {
      include_adult: false,
      page,
    });

    return res.json(toCardList(data.results || []).slice(0, 20));
  } catch (error) {
    console.error("Trending Error:", error.message);
    return res.status(500).json({ message: error.message || "Failed to load trending movies" });
  }
};

export const getExploreMovies = async (req, res) => {
  try {
    if (!assertTmdbConfigured(res)) return;

    const page = normalizePage(req.query.page, randomPage(5));
    const data = await tmdbRequest("/discover/movie", {
      sort_by: "popularity.desc",
      include_adult: false,
      page,
    });

    return res.json(toCardList(data.results || []).slice(0, 20));
  } catch (error) {
    console.error("Explore Error:", error.message);
    return res.status(500).json({ message: error.message || "Failed to load explore movies" });
  }
};

export const getMovieDetails = async (req, res) => {
  try {
    if (!assertTmdbConfigured(res)) return;

    const rawMovieId = String(req.params.id || "").trim();
    if (!rawMovieId) {
      return res.status(400).json({ message: "Movie id is required" });
    }

    const resolvedTmdbId = await resolveTmdbMovieId(rawMovieId);
    if (!resolvedTmdbId) {
      return res.status(404).json({ message: "Movie not found" });
    }

    const movie = await tmdbRequest(`/movie/${resolvedTmdbId}`, {
      append_to_response: "credits,videos,external_ids",
    });

    return res.json(mapTmdbMovieToDetails(movie, rawMovieId));
  } catch (error) {
    if (error.response?.status === 404 || error.status === 404) {
      return res.status(404).json({ message: "Movie not found" });
    }

    console.error("Movie Details Error:", error.message);
    return res.status(500).json({ message: error.message || "Failed to fetch movie details" });
  }
};
