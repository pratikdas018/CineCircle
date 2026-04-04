import { hasTmdbApiKey, tmdbRequest } from "./tmdb.js";

const normalize = (value = "") => String(value).trim().toLowerCase();
const getProviderGroups = (regionData = {}) => {
  return [
    ...(regionData.flatrate || []),
    ...(regionData.rent || []),
    ...(regionData.buy || []),
  ];
};

export const resolveTmdbMovieId = async (movieId) => {
  const raw = String(movieId || "").trim();
  if (!raw) return null;
  if (!raw.startsWith("tt")) return raw;

  if (!hasTmdbApiKey()) {
    return null;
  }

  const findResponse = await tmdbRequest(
    `/find/${raw}`,
    { external_source: "imdb_id" },
    { includeLanguage: false }
  );

  const match = findResponse?.movie_results?.[0];
  return match?.id ? String(match.id) : null;
};

export const fetchProvidersByRegion = async (movieId, region = "IN") => {
  if (!hasTmdbApiKey()) {
    return { providers: [], link: "", available: false, resolvedMovieId: null };
  }

  const resolvedMovieId = await resolveTmdbMovieId(movieId);
  if (!resolvedMovieId) {
    return { providers: [], link: "", available: false, resolvedMovieId: null };
  }

  const response = await tmdbRequest(
    `/movie/${resolvedMovieId}/watch/providers`,
    {},
    { includeLanguage: false }
  );

  const allRegions = response?.results || {};
  const regionData = allRegions[region] || null;
  if (!regionData) {
    return { providers: [], link: "", available: false, resolvedMovieId };
  }

  const providers = getProviderGroups(regionData);
  return {
    providers,
    link: regionData.link || "",
    available: providers.length > 0,
    resolvedMovieId,
  };
};

export const checkProviderAvailability = async ({
  movieId,
  region = "IN",
  providerName = "",
  providerId = null,
}) => {
  const { providers, link, resolvedMovieId } = await fetchProvidersByRegion(movieId, region);
  if (!providers.length) {
    return { isAvailable: false, matchedProvider: null, link, resolvedMovieId };
  }

  const normalizedName = normalize(providerName);
  const matchedProvider = providers.find((provider) => {
    if (providerId && Number(provider.provider_id) === Number(providerId)) {
      return true;
    }
    if (!normalizedName) return false;
    return normalize(provider.provider_name) === normalizedName;
  });

  return {
    isAvailable: Boolean(matchedProvider),
    matchedProvider: matchedProvider || null,
    link,
    resolvedMovieId,
  };
};
