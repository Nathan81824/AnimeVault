
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  X,
  Star,
  Compass,
  Flame,
  Sparkles,
  RefreshCw,
  Clapperboard,
  ArrowUpDown,
  Bookmark,
  Check,
  LoaderCircle,
  ChevronDown,
  CalendarDays,
  Tv,
  Play,
  Library,
  Filter,
} from "lucide-react";

import {
  searchAnime,
  getPopularAnime,
  getTrendingAnime,
} from "../lib/jikan";

import { supabase } from "../lib/supabase";
import { useAuthStore } from "../features/auth/authStore";

const genres = [
  { label: "All Genres", value: "" },
  { label: "Action", value: "Action" },
  { label: "Adventure", value: "Adventure" },
  { label: "Comedy", value: "Comedy" },
  { label: "Drama", value: "Drama" },
  { label: "Fantasy", value: "Fantasy" },
  { label: "Horror", value: "Horror" },
  { label: "Mystery", value: "Mystery" },
  { label: "Romance", value: "Romance" },
  { label: "Sci-Fi", value: "Sci-Fi" },
  { label: "Sports", value: "Sports" },
  { label: "Supernatural", value: "Supernatural" },
  { label: "Thriller", value: "Thriller" },
];

const sortOptions = [
  { label: "Most Popular", value: "popularity" },
  { label: "Highest Rated", value: "score" },
  { label: "Newest First", value: "newest" },
  { label: "Title A–Z", value: "title" },
];

const statusOptions = [
  { label: "Any Status", value: "" },
  { label: "Currently Airing", value: "RELEASING" },
  { label: "Completed", value: "FINISHED" },
  { label: "Upcoming", value: "NOT_YET_RELEASED" },
];

const getTitle = (anime) =>
  anime?.titleEnglish ||
  anime?.title ||
  anime?.titleRomaji ||
  anime?.titleJapanese ||
  "Unknown Anime";

const getImage = (anime) =>
  anime?.image ||
  anime?.coverImage?.extraLarge ||
  anime?.coverImage?.large ||
  anime?.coverImage?.medium ||
  null;

const getYear = (anime) =>
  anime?.seasonYear ||
  anime?.startDate?.year ||
  anime?.year ||
  null;

const getScore = (anime) => {
  const score = Number(anime?.averageScore ?? anime?.score);

  if (!Number.isFinite(score) || score <= 0) return null;

  return score > 10 ? score / 10 : score;
};

const getGenres = (anime) =>
  (anime?.genres || [])
    .map((genre) =>
      typeof genre === "string" ? genre : genre?.name
    )
    .filter(Boolean);

const getStatusLabel = (status) => {
  if (status === "RELEASING") return "AIRING";
  if (status === "FINISHED") return "COMPLETED";
  if (status === "NOT_YET_RELEASED") return "UPCOMING";
  return null;
};

function AnimeCard({ anime, saved, saving, onSave }) {
  const [imageFailed, setImageFailed] = useState(false);

  const title = getTitle(anime);
  const image = getImage(anime);
  const score = getScore(anime);
  const year = getYear(anime);
  const animeGenres = getGenres(anime);
  const statusLabel = getStatusLabel(anime.status);

  return (
    <article className="group min-w-0">
      <div className="relative">
        <Link
          to={`/anime/${anime.id}`}
          className="block overflow-hidden rounded-2xl border border-white/[0.06] bg-[#151515] transition duration-300 group-hover:border-orange-500/40 group-hover:shadow-[0_12px_40px_rgba(249,115,22,0.12)]"
        >
          <div className="relative aspect-[3/4] overflow-hidden">
            {!imageFailed && image ? (
              <img
                src={image}
                alt={title}
                loading="lazy"
                onError={() => setImageFailed(true)}
                className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#25160e] to-[#111] p-4 text-center">
                <Clapperboard size={34} className="text-orange-500" />
                <span className="text-sm font-bold text-gray-300">
                  {title}
                </span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/20 opacity-80 transition group-hover:opacity-95" />

            <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
              {statusLabel ? (
                <span
                  className={`rounded-lg border px-2 py-1 text-[9px] font-black tracking-wider backdrop-blur-md ${
                    anime.status === "RELEASING"
                      ? "border-emerald-400/20 bg-emerald-500/80 text-white"
                      : anime.status === "NOT_YET_RELEASED"
                        ? "border-orange-400/20 bg-orange-500/90 text-white"
                        : "border-white/10 bg-black/70 text-gray-200"
                  }`}
                >
                  {statusLabel}
                </span>
              ) : (
                <span />
              )}

              {score !== null && (
                <span className="flex items-center gap-1 rounded-lg border border-orange-400/20 bg-black/75 px-2 py-1 text-xs font-black text-orange-300 backdrop-blur-md">
                  <Star size={12} fill="currentColor" />
                  {score.toFixed(1)}
                </span>
              )}
            </div>

            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white opacity-0 backdrop-blur-md transition duration-300 group-hover:opacity-100">
                <Play size={14} fill="currentColor" />
              </div>

              <h3 className="line-clamp-2 text-sm font-extrabold leading-snug text-white sm:text-base">
                {title}
              </h3>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-medium text-gray-300">
                {year && (
                  <span className="flex items-center gap-1">
                    <CalendarDays size={11} />
                    {year}
                  </span>
                )}

                {anime.format && (
                  <span className="rounded bg-white/10 px-1.5 py-0.5">
                    {anime.format}
                  </span>
                )}

                {anime.episodes && (
                  <span>{anime.episodes} episodes</span>
                )}
              </div>
            </div>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => onSave(anime)}
          disabled={saving}
          title={saved ? "Already in My Vault" : "Save to My Vault"}
          aria-label={
            saved
              ? `${title} is saved`
              : `Save ${title} to My Vault`
          }
          className={`absolute bottom-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl border backdrop-blur-md transition duration-200 ${
            saved
              ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-300"
              : "border-white/20 bg-black/60 text-white hover:border-orange-400/50 hover:bg-orange-500 hover:text-white"
          } disabled:cursor-not-allowed disabled:opacity-70`}
        >
          {saving ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : saved ? (
            <Check size={17} />
          ) : (
            <Bookmark size={17} />
          )}
        </button>
      </div>

      <div className="mt-3 min-w-0 px-0.5">
        <Link
          to={`/anime/${anime.id}`}
          className="line-clamp-1 text-xs font-bold text-gray-200 transition hover:text-orange-400 sm:text-sm"
        >
          {title}
        </Link>

        <div className="mt-2 flex min-h-5 flex-wrap gap-1.5">
          {animeGenres.slice(0, 2).map((genre) => (
            <span
              key={genre}
              className="rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-1 text-[9px] font-semibold text-gray-500"
            >
              {genre}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: 18 }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="aspect-[3/4] rounded-2xl bg-white/[0.05]" />
          <div className="mt-3 h-3 w-4/5 rounded bg-white/[0.06]" />
          <div className="mt-2 h-3 w-2/5 rounded bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onClear }) {
  return (
    <div className="rounded-3xl border border-white/[0.07] bg-gradient-to-br from-[#19130f] to-[#101010] px-5 py-20 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-orange-500/20 bg-orange-500/10 text-orange-400">
        <Search size={32} />
      </div>

      <h3 className="mt-6 text-xl font-black text-white">
        No anime found
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
        We couldn't find anything matching your search.
        Try another title or change your filters.
      </p>

      <button
        type="button"
        onClick={onClear}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400"
      >
        <RefreshCw size={16} />
        Reset Explore
      </button>
    </div>
  );
}

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();

  const user = useAuthStore((state) => state.user);

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [genre, setGenre] = useState(searchParams.get("genre") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "popularity");

  const [anime, setAnime] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [savedAnimeIds, setSavedAnimeIds] = useState([]);
  const [savingAnimeId, setSavingAnimeId] = useState(null);
  const [savedLoading, setSavedLoading] = useState(false);

  const [notice, setNotice] = useState(null);

  const loadSavedAnime = useCallback(async () => {
    if (!user?.id) {
      setSavedAnimeIds([]);
      return;
    }

    setSavedLoading(true);

    try {
      const { data, error } = await supabase
        .from("saved_anime")
        .select("anime_id")
        .eq("user_id", user.id);

      if (error) throw error;

      setSavedAnimeIds(
        (data || []).map((item) => String(item.anime_id))
      );
    } catch (err) {
      console.error("Failed to load saved anime:", err);
      setNotice({
        type: "error",
        message: err.message || "Could not load your saved anime.",
      });
    } finally {
      setSavedLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSavedAnime();
  }, [loadSavedAnime]);

  const handleSaveAnime = async (item) => {
    if (!user?.id) {
      setNotice({
        type: "error",
        message: "Please sign in to save anime to My Vault.",
      });
      return;
    }

    const animeId = String(item.id);

    if (savingAnimeId === animeId) return;

    setSavingAnimeId(animeId);
    setNotice(null);

    try {
      const { data: existing, error: checkError } = await supabase
        .from("saved_anime")
        .select("anime_id")
        .eq("user_id", user.id)
        .eq("anime_id", item.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        setSavedAnimeIds((current) =>
          current.includes(animeId) ? current : [...current, animeId]
        );

        setNotice({
          type: "success",
          message: `${getTitle(item)} is already in My Vault.`,
        });

        return;
      }

      const { error: insertError } = await supabase
        .from("saved_anime")
        .insert({
          user_id: user.id,
          anime_id: item.id,
          anime_title: getTitle(item),
          anime_image: getImage(item),
          anime_status: item.status || null,
          anime_episodes: item.episodes ?? null,
        });

      if (insertError) throw insertError;

      setSavedAnimeIds((current) =>
        current.includes(animeId) ? current : [...current, animeId]
      );

      setNotice({
        type: "success",
        message: `${getTitle(item)} added to My Vault!`,
      });
    } catch (err) {
      console.error("Failed to save anime:", err);

      setNotice({
        type: "error",
        message: err.message || "Could not save this anime. Please try again.",
      });
    } finally {
      setSavingAnimeId(null);
    }
  };

  const loadAnime = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const options = {
        page: 1,
        perPage: 50,
      };

      let response;

      if (query.trim()) {
        response = await searchAnime(query.trim(), options);
      } else if (sort === "popularity" && !genre && !status) {
        response = await getPopularAnime(options);
      } else {
        response = await getTrendingAnime(options);
      }

      const results = Array.isArray(response)
        ? response
        : response?.results || response?.data || [];

      let filtered = [...results];

      if (genre) {
        filtered = filtered.filter((item) =>
          getGenres(item).some(
            (itemGenre) =>
              itemGenre.toLowerCase() === genre.toLowerCase()
          )
        );
      }

      if (status) {
        filtered = filtered.filter(
          (item) => item.status === status
        );
      }

      if (sort === "score") {
        filtered.sort(
          (a, b) => (getScore(b) || 0) - (getScore(a) || 0)
        );
      } else if (sort === "newest") {
        filtered.sort(
          (a, b) => (getYear(b) || 0) - (getYear(a) || 0)
        );
      } else if (sort === "title") {
        filtered.sort((a, b) =>
          getTitle(a).localeCompare(getTitle(b))
        );
      } else {
        filtered.sort(
          (a, b) => (b.popularity || 0) - (a.popularity || 0)
        );
      }

      setAnime(filtered);

      const nextParams = new URLSearchParams();

      if (query.trim()) nextParams.set("q", query.trim());
      if (genre) nextParams.set("genre", genre);
      if (status) nextParams.set("status", status);
      if (sort !== "popularity") nextParams.set("sort", sort);

      setSearchParams(nextParams, { replace: true });
    } catch (err) {
      console.error("Failed to load anime:", err);
      setAnime([]);
      setError(
        "We couldn't load anime right now. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [query, genre, status, sort, setSearchParams]);

  useEffect(() => {
    loadAnime();
  }, [loadAnime]);

  const clearFilters = () => {
    setQuery("");
    setGenre("");
    setStatus("");
    setSort("popularity");
    setSearchParams({});
    setNotice(null);
  };

  const hasFilters = Boolean(
    query.trim() || genre || status || sort !== "popularity"
  );

  const heading = query.trim()
    ? `Results for "${query.trim()}"`
    : genre
      ? `${genre} Anime`
      : status === "RELEASING"
        ? "Currently Airing"
        : status === "NOT_YET_RELEASED"
          ? "Coming Soon"
          : status === "FINISHED"
            ? "Completed Anime"
            : "Explore Anime";

  const savedCount = savedAnimeIds.length;

  const activeFilters = useMemo(
    () =>
      [
        genre && genre,
        status && statusOptions.find((item) => item.value === status)?.label,
        sort !== "popularity" &&
          sortOptions.find((item) => item.value === sort)?.label,
      ].filter(Boolean),
    [genre, status, sort]
  );

  return (
    <main className="min-h-screen overflow-hidden bg-[#090909] text-white">
      <div className="mx-auto max-w-[1900px] px-4 py-6 sm:px-7 sm:py-9 lg:px-10">
        <section className="relative mb-10 overflow-hidden rounded-[28px] border border-orange-500/15 bg-gradient-to-br from-[#291306] via-[#17100b] to-[#101010] p-6 sm:p-10 lg:p-14">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-orange-500/20 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-red-600/10 blur-[100px]" />

          <div className="pointer-events-none absolute right-8 top-8 hidden rotate-12 text-orange-500/[0.07] lg:block">
            <Clapperboard size={210} strokeWidth={1} />
          </div>

          <div className="relative z-10 max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-400 sm:text-xs">
              <Compass size={15} />
              AnimeVault Discovery
            </div>

            <h1 className="text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
              Your next
              <span className="block bg-gradient-to-r from-orange-400 via-orange-500 to-amber-300 bg-clip-text text-transparent">
                obsession starts here.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-gray-400 sm:text-base">
              Explore incredible anime, discover hidden gems,
              and build your personal collection.
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                loadAnime();
              }}
              className="mt-8 flex max-w-2xl items-center gap-2 rounded-2xl border border-white/10 bg-black/50 p-2 pl-4 shadow-2xl transition focus-within:border-orange-500/50"
            >
              <Search size={20} className="shrink-0 text-orange-400" />

              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search anime titles..."
                className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-gray-600"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="rounded-lg p-2 text-gray-500 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={17} />
                </button>
              )}

              <button
                type="submit"
                className="shrink-0 rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400"
              >
                Search
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-5 text-xs font-semibold text-gray-500">
              <span className="flex items-center gap-2">
                <Flame size={15} className="text-orange-400" />
                Discover popular anime
              </span>
              <span className="flex items-center gap-2">
                <Bookmark size={15} className="text-orange-400" />
                Save to your vault
              </span>
              <span className="flex items-center gap-2">
                <Sparkles size={15} className="text-orange-400" />
                Find your next favourite
              </span>
            </div>
          </div>
        </section>

        {notice && (
          <div
            className={`mb-7 flex items-center justify-between gap-3 rounded-2xl border p-4 text-sm ${
              notice.type === "success"
                ? "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-300"
                : "border-red-500/20 bg-red-500/[0.08] text-red-300"
            }`}
          >
            <div className="flex items-center gap-3">
              {notice.type === "success" ? <Check size={18} /> : <X size={18} />}
              <p>{notice.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Dismiss message"
              className="rounded-lg p-1 transition hover:bg-white/10"
            >
              <X size={17} />
            </button>
          </div>
        )}

        <section className="mb-9 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#111] p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
              <Compass size={21} />
            </div>
            <div>
              <p className="text-lg font-black text-white">Explore</p>
              <p className="text-[10px] text-gray-500">Discover anime</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#111] p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
              <Library size={21} />
            </div>
            <div>
              <p className="text-lg font-black text-white">
                {savedLoading ? "..." : savedCount}
              </p>
              <p className="text-[10px] text-gray-500">Saved in My Vault</p>
            </div>
          </div>

          <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#111] p-4 sm:col-span-1">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
              <Tv size={21} />
            </div>
            <div>
              <p className="text-lg font-black text-white">All in one</p>
              <p className="text-[10px] text-gray-500">One continuous anime grid</p>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Flame size={20} className="text-orange-400" />
              <h2 className="text-lg font-black sm:text-xl">Browse genres</h2>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
              Find your vibe
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {genres.map((item) => (
              <button
                key={item.value || "all"}
                type="button"
                onClick={() => setGenre(item.value)}
                className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
                  genre === item.value
                    ? "border-orange-500 bg-orange-500 text-black shadow-[0_4px_20px_rgba(249,115,22,0.2)]"
                    : "border-white/[0.08] bg-white/[0.03] text-gray-400 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={21} className="text-orange-400" />
                <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                  {heading}
                </h2>
              </div>

              <p className="mt-2 text-xs text-gray-500 sm:text-sm">
                Discover anime and add your favourites to My Vault.
              </p>

              {activeFilters.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeFilters.map((item) => (
                    <span
                      key={item}
                      className="rounded-lg border border-orange-500/20 bg-orange-500/[0.08] px-2.5 py-1 text-[10px] font-bold text-orange-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltersOpen((current) => !current)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold transition ${
                  filtersOpen
                    ? "border-orange-500/40 bg-orange-500/10 text-orange-300"
                    : "border-white/10 bg-white/[0.03] text-gray-300 hover:border-orange-500/30 hover:text-orange-300"
                }`}
              >
                <SlidersHorizontal size={16} />
                Filters
                <ChevronDown
                  size={15}
                  className={`transition ${filtersOpen ? "rotate-180" : ""}`}
                />
              </button>

              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs text-gray-300 transition focus-within:border-orange-500/40">
                <ArrowUpDown size={15} className="text-orange-400" />
                <span className="hidden sm:inline">Sort:</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="max-w-32 cursor-pointer bg-transparent text-xs font-bold text-white outline-none"
                >
                  {sortOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="bg-[#151515]"
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {filtersOpen && (
            <div className="mb-7 grid grid-cols-1 gap-4 rounded-2xl border border-orange-500/15 bg-gradient-to-br from-[#1c130c] to-[#111] p-5 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-xs font-bold text-gray-400">
                <span className="flex items-center gap-2">
                  <Filter size={14} className="text-orange-400" />
                  Genre
                </span>
                <select
                  value={genre}
                  onChange={(event) => setGenre(event.target.value)}
                  className="rounded-xl border border-white/10 bg-[#090909] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                >
                  {genres.map((item) => (
                    <option key={item.value || "all"} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-xs font-bold text-gray-400">
                <span className="flex items-center gap-2">
                  <Tv size={14} className="text-orange-400" />
                  Airing status
                </span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="rounded-xl border border-white/10 bg-[#090909] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value || "any"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-xs font-bold text-orange-400 transition hover:text-orange-300 sm:col-span-2"
                >
                  <X size={15} />
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {!loading && !error && anime.length > 0 && (
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
              <p className="text-xs font-medium text-gray-500">
                Showing{" "}
                <span className="font-black text-orange-400">{anime.length}</span>{" "}
                anime results
              </p>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 transition hover:text-orange-400"
                >
                  <X size={13} />
                  Reset
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-3xl border border-red-500/20 bg-red-500/[0.05] p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                <RefreshCw size={25} />
              </div>
              <p className="mt-4 text-sm font-bold text-red-300">{error}</p>
              <button
                type="button"
                onClick={loadAnime}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-xs font-black text-black transition hover:bg-orange-400"
              >
                <RefreshCw size={15} />
                Try again
              </button>
            </div>
          )}

          {loading && !error && <SkeletonGrid />}

          {!loading && !error && anime.length > 0 && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {anime.map((item) => (
                <AnimeCard
                  key={item.id}
                  anime={item}
                  saved={savedAnimeIds.includes(String(item.id))}
                  saving={savingAnimeId === String(item.id)}
                  onSave={handleSaveAnime}
                />
              ))}
            </div>
          )}

          {!loading && !error && anime.length === 0 && (
            <EmptyState onClear={clearFilters} />
          )}
        </section>

        <div className="mt-16 flex flex-col items-center justify-center gap-3 border-t border-white/[0.06] pt-8 text-center">
          <div className="flex items-center gap-2 text-orange-500">
            <Clapperboard size={17} />
            <span className="text-xs font-black tracking-[0.2em]">
              ANIMEVAULT
            </span>
          </div>
          <p className="text-[10px] text-gray-600">
            Discover more. Save your favourites. Build your vault.
          </p>
        </div>
      </div>
    </main>
  );
}
