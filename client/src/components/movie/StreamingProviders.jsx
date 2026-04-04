import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import api from "../../services/api";
import { createAlert } from "../../services/movieService";

const DEFAULT_ALERT_PLATFORMS = ["Netflix", "Amazon Prime Video"];

const StreamingProviders = ({ movieId, movieTitle, moviePoster }) => {
  const region = (import.meta.env.VITE_DEFAULT_REGION || "IN").toUpperCase();
  const [providers, setProviders] = useState([]);
  const [providerLink, setProviderLink] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAlert, setIsSavingAlert] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setIsLoading(true);
        const res = await api.get(`/api/streaming/${movieId}?region=${region}`);
        setProviders(res.data.providers || []);
        setProviderLink(res.data.link || "");
      } catch (err) {
        console.error("Error fetching streaming providers", err);
        setProviders([]);
        setProviderLink("");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProviders();
  }, [movieId, region]);

  useEffect(() => {
    setSelectedPlatforms([]);
  }, [movieId]);

  const groupedProviders = useMemo(() => {
    const providerMap = new Map();
    providers.forEach((provider) => {
      providerMap.set(provider.provider_id, provider);
    });
    return [...providerMap.values()];
  }, [providers]);

  const selectablePlatforms = useMemo(() => {
    if (!groupedProviders.length) return DEFAULT_ALERT_PLATFORMS;
    return [...new Set(groupedProviders.map((provider) => provider.provider_name))];
  }, [groupedProviders]);

  const togglePlatform = (platformName) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformName)
        ? prev.filter((platform) => platform !== platformName)
        : [...prev, platformName]
    );
  };

  const handleSetAlert = async () => {
    if (!selectedPlatforms.length) {
      toast.error("Select at least one platform");
      return;
    }

    try {
      setIsSavingAlert(true);
      await createAlert({
        imdbID: movieId,
        title: movieTitle,
        poster: moviePoster,
        platforms: selectedPlatforms,
      });

      toast.success("OTT alert saved");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save alert");
    } finally {
      setIsSavingAlert(false);
    }
  };

  if (isLoading) {
    return <p className="mt-4 text-slate-500">Loading streaming providers...</p>;
  }

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 text-xl font-bold">Where to Watch ({region})</h2>

      {groupedProviders.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {groupedProviders.map((provider) => (
            <a
              key={provider.provider_id}
              href={providerLink || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:scale-105 dark:border-slate-800 dark:bg-slate-950/40"
            >
              <div className="flex flex-col items-center">
                <img
                  src={`https://image.tmdb.org/t/p/w200${provider.logo_path}`}
                  alt={provider.provider_name}
                  className="h-auto w-full max-w-[56px] rounded-lg object-cover shadow-md"
                />
                <span className="mt-2 break-words text-center text-xs font-semibold">
                  {provider.provider_name}
                </span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500">
          No streaming info available for region {region}. You can still set an alert manually.
        </p>
      )}

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Set Alert
        </h3>
        <p className="mt-1 text-sm text-slate-500">Select platform(s) and get notified when available.</p>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {selectablePlatforms.map((platform) => (
            <label
              key={platform}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <input
                type="checkbox"
                checked={selectedPlatforms.includes(platform)}
                onChange={() => togglePlatform(platform)}
                className="h-4 w-4 accent-indigo-600"
              />
              <span className="text-slate-700 dark:text-slate-100">{platform}</span>
            </label>
          ))}
        </div>

        <button
          onClick={handleSetAlert}
          disabled={isSavingAlert}
          className="mt-4 w-full rounded-lg bg-indigo-600 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSavingAlert ? "Saving..." : "Set Alert"}
        </button>
      </div>
    </div>
  );
};

export default StreamingProviders;
