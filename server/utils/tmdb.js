import axios from "axios";

const DEFAULT_TMDB_BASE_URL = "https://api.themoviedb.org/3";
const DEFAULT_TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 2;
const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

const getApiKey = () => process.env.TMDB_API_KEY?.trim();
const getTimeoutMs = () => {
  const parsed = Number(process.env.TMDB_TIMEOUT_MS);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(parsed, 30_000);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getTmdbBaseUrl = () =>
  process.env.TMDB_BASE_URL?.trim() || DEFAULT_TMDB_BASE_URL;

export const getTmdbImageBaseUrl = () =>
  process.env.TMDB_IMAGE_BASE_URL?.trim() || DEFAULT_TMDB_IMAGE_BASE_URL;

export const hasTmdbApiKey = () => Boolean(getApiKey());

const isRetryableError = (error) => {
  const status = Number(error?.response?.status || 0);
  if (RETRYABLE_STATUS_CODES.has(status)) return true;
  return !status;
};

export const tmdbRequest = async (path, params = {}, options = {}) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("TMDB_API_KEY is not configured");
  }

  const includeLanguage = options.includeLanguage !== false;
  const retries =
    Number.isInteger(options.retries) && options.retries >= 0
      ? options.retries
      : DEFAULT_RETRIES;
  const timeout = Math.max(1_000, Number(options.timeout || getTimeoutMs()));

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const queryParams = {
        api_key: apiKey,
        ...(includeLanguage ? { language: "en-US" } : {}),
        ...params,
      };

      const { data } = await axios.get(`${getTmdbBaseUrl()}${path}`, {
        params: queryParams,
        timeout,
      });

      return data;
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !isRetryableError(error)) {
        break;
      }

      await sleep(Math.min(300 * 2 ** attempt, 2_000));
    }
  }

  const status = Number(lastError?.response?.status || 0);
  const detail = lastError?.response?.data?.status_message || lastError?.message || "Request failed";
  const wrappedError = new Error(
    status ? `TMDB request failed (${status}): ${detail}` : `TMDB request failed: ${detail}`
  );
  wrappedError.status = status || 500;
  throw wrappedError;
};

const formatDate = (dateValue = "") => {
  if (!dateValue) return "N/A";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toOneDecimal = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric) || numeric <= 0) return "N/A";
  return numeric.toFixed(1);
};

export const mapTmdbMovieToCard = (movie = {}) => {
  const id = movie.id ? String(movie.id) : "";
  const imdbId = movie.imdb_id || movie.imdbID || "";
  const routeId = imdbId || id;
  const year = movie.release_date ? String(movie.release_date).slice(0, 4) : "N/A";

  return {
    imdbID: routeId,
    tmdbID: id,
    Title: movie.title || movie.name || "Untitled",
    Year: year || "N/A",
    Poster: movie.poster_path ? `${getTmdbImageBaseUrl()}${movie.poster_path}` : "N/A",
    Type: "movie",
  };
};

export const mapTmdbMovieToDetails = (movie = {}, fallbackId = "") => {
  const trailer = (movie.videos?.results || []).find(
    (video) => video.site === "YouTube" && video.type === "Trailer"
  );

  const castNames = (movie.credits?.cast || []).slice(0, 10).map((member) => member.name);
  const directorName =
    (movie.credits?.crew || []).find((member) => member.job === "Director")?.name || "N/A";
  const imdbID = movie.external_ids?.imdb_id || fallbackId || (movie.id ? String(movie.id) : "");

  return {
    imdbID,
    tmdbID: movie.id ? String(movie.id) : "",
    Title: movie.title || "Untitled",
    Year: movie.release_date ? String(movie.release_date).slice(0, 4) : "N/A",
    Released: formatDate(movie.release_date),
    Runtime: movie.runtime ? `${movie.runtime} min` : "N/A",
    Genre: (movie.genres || []).map((genre) => genre.name).join(", ") || "N/A",
    Director: directorName,
    Actors: castNames.join(", ") || "N/A",
    Plot: movie.overview || "Plot not available.",
    Language: (movie.spoken_languages || []).map((language) => language.english_name).join(", ") || "N/A",
    Poster: movie.poster_path ? `${getTmdbImageBaseUrl()}${movie.poster_path}` : "N/A",
    imdbRating: toOneDecimal(movie.vote_average),
    Ratings: [
      {
        Source: "TMDB",
        Value: movie.vote_average ? `${toOneDecimal(movie.vote_average)}/10` : "N/A",
      },
      {
        Source: "TMDB Votes",
        Value: movie.vote_count ? `${movie.vote_count} votes` : "N/A",
      },
    ],
    TrailerKey: trailer?.key || null,
    Response: "True",
  };
};
