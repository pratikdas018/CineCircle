import { getTmdbImageBaseUrl, mapTmdbMovieToCard, tmdbRequest } from "../utils/tmdb.js";

const REGION = (process.env.DEFAULT_REGION || "IN").toUpperCase();
const MAX_ITEMS = 12;
const LOOKBACK_DAYS = 90;
const CACHE_TTL_MS = 30 * 60 * 1000;
const trendingCache = {
  data: [],
  expiresAt: 0,
  pendingPromise: null,
};

const PLATFORM_PREFERENCES = [
  { matcher: /netflix/i, label: "Netflix" },
  { matcher: /(amazon|prime(\s+video)?)/i, label: "Amazon Prime Video" },
  { matcher: /(jiohotstar|hotstar|disney)/i, label: "Disney+ Hotstar" },
  { matcher: /apple\s*tv/i, label: "Apple TV+" },
  { matcher: /zee5/i, label: "ZEE5" },
  { matcher: /sonyliv/i, label: "SonyLIV" },
  { matcher: /jio(cinema)?/i, label: "JioCinema" },
];

const formatDateKey = (value) => String(value || "").slice(0, 10);

const getDateDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDateKey(date.toISOString());
};

const unique = (items = []) => [...new Set(items.filter(Boolean))];

const getProviderGroups = (regionData = {}) => [
  ...(regionData.flatrate || []),
  ...(regionData.ads || []),
  ...(regionData.rent || []),
  ...(regionData.buy || []),
];

const normalizePlatform = (name = "") => {
  const value = String(name).trim();
  if (!value) return "";

  const match = PLATFORM_PREFERENCES.find((platform) => platform.matcher.test(value));
  return match ? match.label : value;
};

const pickPreferredPlatform = (platforms = []) => {
  for (const preference of PLATFORM_PREFERENCES) {
    const match = platforms.find((platform) => preference.matcher.test(platform));
    if (match) return normalizePlatform(match);
  }

  return normalizePlatform(platforms[0] || "");
};

const getProvidersForTitle = async (mediaType, tmdbId) => {
  const data = await tmdbRequest(`/${mediaType}/${tmdbId}/watch/providers`);
  const regionData = data.results?.[REGION];
  if (!regionData) return [];

  return unique(getProviderGroups(regionData).map((provider) => normalizePlatform(provider.provider_name)));
};

const mapMovieRelease = (movie, platforms = []) => {
  const card = mapTmdbMovieToCard(movie);
  const normalizedPlatforms = unique(platforms.map(normalizePlatform));
  const platform = pickPreferredPlatform(normalizedPlatforms);

  return {
    id: `movie-${movie.id}`,
    title: card.Title,
    poster: card.Poster !== "N/A" ? card.Poster : "",
    year: card.Year || "N/A",
    platform: platform || "OTT",
    mediaType: "movie",
    imdbID: card.imdbID || "",
    availableOn: normalizedPlatforms,
    releaseDate: movie.release_date || "",
  };
};

const mapSeriesRelease = (show, platforms = []) => {
  const normalizedPlatforms = unique(platforms.map(normalizePlatform));
  const platform = pickPreferredPlatform(normalizedPlatforms);

  return {
    id: `series-${show.id}`,
    title: show.name || show.original_name || "Untitled Series",
    poster: show.poster_path ? `${getTmdbImageBaseUrl()}${show.poster_path}` : "",
    year: show.first_air_date ? String(show.first_air_date).slice(0, 4) : "N/A",
    platform: platform || "OTT",
    mediaType: "series",
    imdbID: "",
    availableOn: normalizedPlatforms,
    releaseDate: show.first_air_date || "",
  };
};

const loadNewMovies = async (dateFrom) => {
  const data = await tmdbRequest("/discover/movie", {
    include_adult: false,
    include_video: false,
    sort_by: "primary_release_date.desc",
    "primary_release_date.gte": dateFrom,
    "vote_count.gte": 20,
    page: 1,
  });

  const candidates = (data.results || []).slice(0, 10);
  const mapped = await Promise.all(
    candidates.map(async (movie) => {
      try {
        const platforms = await getProvidersForTitle("movie", movie.id);
        if (!platforms.length) return null;
        return mapMovieRelease(movie, platforms);
      } catch {
        return null;
      }
    })
  );

  return mapped.filter(Boolean);
};

const loadNewSeries = async (dateFrom) => {
  const data = await tmdbRequest("/discover/tv", {
    include_adult: false,
    sort_by: "first_air_date.desc",
    "first_air_date.gte": dateFrom,
    "vote_count.gte": 20,
    page: 1,
  });

  const candidates = (data.results || []).slice(0, 10);
  const mapped = await Promise.all(
    candidates.map(async (show) => {
      try {
        const platforms = await getProvidersForTitle("tv", show.id);
        if (!platforms.length) return null;
        return mapSeriesRelease(show, platforms);
      } catch {
        return null;
      }
    })
  );

  return mapped.filter(Boolean);
};

const fetchTrendingReleases = async () => {
  const dateFrom = getDateDaysAgo(LOOKBACK_DAYS);
  const [movieReleases, seriesReleases] = await Promise.all([
    loadNewMovies(dateFrom),
    loadNewSeries(dateFrom),
  ]);

  return [...movieReleases, ...seriesReleases]
    .sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0))
    .slice(0, MAX_ITEMS);
};

const getCachedTrendingReleases = async () => {
  const now = Date.now();
  if (trendingCache.expiresAt > now && trendingCache.data.length) {
    return trendingCache.data;
  }

  if (trendingCache.pendingPromise) {
    return trendingCache.pendingPromise;
  }

  trendingCache.pendingPromise = fetchTrendingReleases()
    .then((data) => {
      trendingCache.data = data;
      trendingCache.expiresAt = Date.now() + CACHE_TTL_MS;
      return data;
    })
    .finally(() => {
      trendingCache.pendingPromise = null;
    });

  return trendingCache.pendingPromise;
};

export const getTrendingMovies = async (req, res) => {
  try {
    const releases = await getCachedTrendingReleases();
    return res.status(200).json(releases);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch OTT new releases" });
  }
};
