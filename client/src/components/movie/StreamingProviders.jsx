import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { toast } from "react-hot-toast";

const StreamingProviders = ({ movieId, movieTitle }) => {
  const region = (import.meta.env.VITE_DEFAULT_REGION || "IN").toUpperCase();
  const [providers, setProviders] = useState([]);
  const [providerLink, setProviderLink] = useState("");
  const [loadingProviderId, setLoadingProviderId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const groupedProviders = useMemo(() => {
    const map = new Map();
    providers.forEach((provider) => {
      map.set(provider.provider_id, provider);
    });
    return [...map.values()];
  }, [providers]);

  const createAlert = async (provider) => {
    try {
      setLoadingProviderId(provider.provider_id);
      await api.post("/api/availability-alerts", {
        movieId,
        movieTitle,
        providerName: provider.provider_name,
        providerId: provider.provider_id,
        region,
      });
      toast.success(`Alert created for ${provider.provider_name}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create alert");
    } finally {
      setLoadingProviderId(null);
    }
  };

  if (isLoading) {
    return <p className="text-slate-500 mt-4">Loading streaming providers...</p>;
  }

  if (!groupedProviders.length) {
    return <p className="text-slate-500 mt-4">No streaming info available for region {region}.</p>;
  }

  return (
    <div className="mt-6 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
      <h2 className="text-xl font-bold mb-3">Where to Watch ({region})</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {groupedProviders.map((provider) => (
          <div
            key={provider.provider_id}
            className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-950/40"
          >
            <a
              href={providerLink || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center hover:scale-105 transition"
            >
              <img
                src={`https://image.tmdb.org/t/p/w200${provider.logo_path}`}
                alt={provider.provider_name}
                className="h-auto w-full max-w-[56px] rounded-lg object-cover shadow-md"
              />
              <span className="mt-2 break-words text-center text-xs font-semibold">{provider.provider_name}</span>
            </a>

            <button
              onClick={() => createAlert(provider)}
              disabled={loadingProviderId === provider.provider_id}
              className="mt-3 w-full text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-1.5 rounded-lg"
            >
              {loadingProviderId === provider.provider_id ? "Saving..." : "Alert me"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StreamingProviders;
