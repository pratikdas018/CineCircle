import axios from "axios";

const DEFAULT_TMDB_BASE_URL = "https://api.themoviedb.org/3";
const DEFAULT_TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 2;
const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

const normalizeSecret = (value = "") => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  const wrappedByDoubleQuotes = trimmed.startsWith("\"") && trimmed.endsWith("\"");
  const wrappedBySingleQuotes = trimmed.startsWith("'") && trimmed.endsWith("'");
  if (wrappedByDoubleQuotes || wrappedBySingleQuotes) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
};

const readFirstEnvValue = (...names) => {
  for (const name of names) {
    const value = normalizeSecret(process.env[name]);
    if (value) return value;
  }

  return "";
};

const normalizeBearerToken = (value = "") =>
  normalizeSecret(value).replace(/^Bearer\s+/i, "").trim();

const looksLikeTmdbV3ApiKey = (value = "") => /^[a-f0-9]{32}$/i.test(String(value || ""));

const extractApiKeyFromValue = (value = "") => {
  const normalized = normalizeSecret(value);
  if (!normalized) return "";

  const directMatch = normalized.match(/[a-f0-9]{32}/i);
  if (looksLikeTmdbV3ApiKey(normalized)) return normalized;

  if (/^api_key=/i.test(normalized)) {
    return normalizeSecret(normalized.slice("api_key=".length));
  }

  const queryMatch = normalized.match(/[?&]api_key=([a-f0-9]{32})/i);
  if (queryMatch?.[1]) return queryMatch[1];

  if (directMatch?.[0] && directMatch[0].length === 32) return directMatch[0];
  return "";
};

const extractReadTokenFromValue = (value = "") => {
  const normalized = normalizeBearerToken(value);
  if (!normalized) return "";

  if (/^(access_token|token)=/i.test(normalized)) {
    return normalizeBearerToken(normalized.slice(normalized.indexOf("=") + 1));
  }

  const queryMatch = normalized.match(/[?&](access_token|token)=([^&\s]+)/i);
  if (queryMatch?.[2]) return normalizeBearerToken(queryMatch[2]);

  return normalized;
};

const getApiKey = () =>
  extractApiKeyFromValue(readFirstEnvValue("TMDB_API_KEY", "TMDB_V3_API_KEY", "TMDB_KEY"));
const getReadAccessToken = () =>
  extractReadTokenFromValue(
    readFirstEnvValue(
      "TMDB_READ_ACCESS_TOKEN",
      "TMDB_ACCESS_TOKEN",
      "TMDB_TOKEN",
      "TMDB_BEARER_TOKEN",
      "TMDB_API_READ_ACCESS_TOKEN",
      "TMDB_V4_READ_ACCESS_TOKEN",
      "TMDB_V4_TOKEN"
    )
  );

const getAuthCandidates = () => {
  const rawApiKeyValue = readFirstEnvValue("TMDB_API_KEY", "TMDB_V3_API_KEY", "TMDB_KEY");
  const apiKeyValue = extractApiKeyFromValue(rawApiKeyValue);
  const readAccessToken = getReadAccessToken();
  const candidates = [];

  if (apiKeyValue) {
    candidates.push({ type: "api_key", value: apiKeyValue });

    // Accept tokens accidentally placed in TMDB_API_KEY.
    if (!readAccessToken && !looksLikeTmdbV3ApiKey(rawApiKeyValue)) {
      const tokenFromApiKeyVar = extractReadTokenFromValue(rawApiKeyValue);
      if (tokenFromApiKeyVar) {
        candidates.push({ type: "bearer", value: tokenFromApiKeyVar });
      }
    }
  } else if (!readAccessToken) {
    const tokenFromApiKeyVar = extractReadTokenFromValue(rawApiKeyValue);
    if (tokenFromApiKeyVar) {
      candidates.push({ type: "bearer", value: tokenFromApiKeyVar });
    }
  }

  if (readAccessToken) {
    candidates.push({ type: "bearer", value: readAccessToken });
  }

  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = `${candidate.type}:${candidate.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

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

const hasTmdbCredentials = () => getAuthCandidates().length > 0;
export const hasTmdbAuth = () => hasTmdbCredentials();
export const hasTmdbApiKey = () => hasTmdbCredentials();

const isRetryableError = (error) => {
  const status = Number(error?.response?.status || 0);
  if (RETRYABLE_STATUS_CODES.has(status)) return true;
  return !status;
};

const toWrappedTmdbError = (error) => {
  const status = Number(error?.response?.status || 0);
  const detail = error?.response?.data?.status_message || error?.message || "Request failed";
  const wrappedError = new Error(
    status ? `TMDB request failed (${status}): ${detail}` : `TMDB request failed: ${detail}`
  );
  wrappedError.status = status || 500;
  return wrappedError;
};

export const tmdbRequest = async (path, params = {}, options = {}) => {
  const authCandidates = getAuthCandidates();

  if (!authCandidates.length) {
    throw new Error(
      "TMDB credentials are not configured (set TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN)"
    );
  }

  const includeLanguage = options.includeLanguage !== false;
  const retries =
    Number.isInteger(options.retries) && options.retries >= 0
      ? options.retries
      : DEFAULT_RETRIES;
  const timeout = Math.max(1_000, Number(options.timeout || getTimeoutMs()));
  const sharedParams = {
    ...(includeLanguage ? { language: "en-US" } : {}),
    ...params,
  };

  let lastError = null;
  for (let authIndex = 0; authIndex < authCandidates.length; authIndex += 1) {
    const auth = authCandidates[authIndex];

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const queryParams =
          auth.type === "api_key" ? { ...sharedParams, api_key: auth.value } : sharedParams;

        const requestConfig = {
          params: queryParams,
          timeout,
          ...(auth.type === "bearer"
            ? { headers: { Authorization: `Bearer ${auth.value}` } }
            : {}),
        };

        const { data } = await axios.get(`${getTmdbBaseUrl()}${path}`, requestConfig);
        return data;
      } catch (error) {
        lastError = error;

        if (attempt < retries && isRetryableError(error)) {
          await sleep(Math.min(300 * 2 ** attempt, 2_000));
          continue;
        }

        const status = Number(error?.response?.status || 0);
        const hasFallbackAuth = authIndex < authCandidates.length - 1;
        if (status === 401 && hasFallbackAuth) {
          break;
        }

        throw toWrappedTmdbError(error);
      }
    }
  }

  throw toWrappedTmdbError(lastError || new Error("TMDB request failed"));
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
