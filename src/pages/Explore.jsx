import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  X,
  Star,
  ChevronLeft,
  ChevronRight,
  Compass,
  Flame,
  Sparkles,
  RefreshCw,
  Clapperboard,
  ArrowUpDown,
} from "lucide-react";
import {
  searchAnime,
  getPopularAnime,
  getTrendingAnime,
} from "../lib/jikan";

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
  { label: "Popularity", value: "popularity" },
  { label: "Highest Rated", value: "score" },
  { label: "Newest", value: "newest" },
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
  null;

const getScore = (anime) => {
  const score = Number(anime?.averageScore ?? anime?.score);

  return Number.isFinite(score) && score > 0 ? score : null;
};

const formatStatus = (status) => {
  if (!status) return "Unknown";

  return String(status)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

function AnimeCard({ anime }) {
  const [imageFailed, setImageFailed] = useState(false);

  const title = getTitle(anime);
  const image = getImage(anime);
  const score = getScore(anime);
  const year = getYear(anime);

  return (
    <Link
      to={`/anime/${anime.id}`}
      className="group block min-w-0"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[#191926]">
        {!imageFailed && image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-3 text-center">
            <Clapperboard
              size={30}
              className="text-purple-400"
            />
            <span className="text-sm font-semibold text-gray-300">
              {title}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-black/20 opacity-75 transition group-hover:opacity-100" />

        {score !== null && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-black/75 px-2 py-1 text-xs font-bold text-yellow-300 backdrop-blur">
            <Star size={12} fill="currentColor" />
            {(score / 10).toFixed(1)}
          </div>
        )}

        {anime.status === "RELEASING" && (
          <span className="absolute left-2 top-2 rounded-md bg-emerald-500/90 px-2 py-1 text-[10px] font-bold text-white">
            AIRING
          </span>
        )}

        {anime.status === "NOT_YET_RELEASED" && (
          <span className="absolute left-2 top-2 rounded-md bg-purple-600/90 px-2 py-1 text-[10px] font-bold text-white">
            UPCOMING
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="line-clamp-2 text-sm font-bold text-white sm:text-base">
            {title}
          </h3>

          <p className="mt-1 text-xs text-gray-300">
            {[
              year,
              anime.format,
              anime.episodes
                ? `${anime.episodes} eps`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Anime"}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {(anime.genres || []).slice(0, 2).map((genre) => (
          <span
            key={genre}
            className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-gray-400"
          >
            {genre}
          </span>
        ))}
      </div>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="aspect-[3/4] rounded-xl bg-white/5" />
          <div className="mt-3 h-3 w-4/5 rounded bg-white/5" />
          <div className="mt-2 h-3 w-2/5 rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(
    searchParams.get("q") || ""
  );

  const [genre, setGenre] = useState(
    searchParams.get("genre") || ""
  );

  const [status, setStatus] = useState(
    searchParams.get("status") || ""
  );

  const [sort, setSort] = useState(
    searchParams.get("sort") || "popularity"
  );

  const [page, setPage] = useState(
    Math.max(1, Number(searchParams.get("page")) || 1)
  );

  const [anime, setAnime] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasNextPage, setHasNextPage] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const loadAnime = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const options = {
        page,
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
        : response?.results || [];

      const pageInfo = response?.pageInfo || null;

      let filtered = [...results];

      if (genre) {
        filtered = filtered.filter((item) =>
          (item.genres || []).some(
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
          (a, b) =>
            (getScore(b) || 0) - (getScore(a) || 0)
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
          (a, b) =>
            (b.popularity || 0) - (a.popularity || 0)
        );
      }

      setAnime(filtered);

      setHasNextPage(
        pageInfo
          ? Boolean(pageInfo.hasNextPage)
          : results.length >= options.perPage
      );

      const nextParams = new URLSearchParams();

      if (query.trim()) nextParams.set("q", query.trim());
      if (genre) nextParams.set("genre", genre);
      if (status) nextParams.set("status", status);
      if (sort !== "popularity") nextParams.set("sort", sort);
      if (page > 1) nextParams.set("page", String(page));

      setSearchParams(nextParams, { replace: true });
    } catch (err) {
      console.error("Failed to load anime:", err);

      setAnime([]);
      setHasNextPage(false);

      setError(
        "We couldn't load anime right now. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [
    query,
    genre,
    status,
    sort,
    page,
    setSearchParams,
  ]);

  useEffect(() => {
    loadAnime();
  }, [loadAnime]);

  const submitSearch = (event) => {
    event.preventDefault();

    if (page !== 1) {
      setPage(1);
    } else {
      loadAnime();
    }
  };

  const clearFilters = () => {
    setQuery("");
    setGenre("");
    setStatus("");
    setSort("popularity");
    setPage(1);
    setSearchParams({});
  };

  const hasFilters = Boolean(
    query.trim() ||
      genre ||
      status ||
      sort !== "popularity"
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

  return (
    <main className="min-h-screen bg-[#09090f] text-white">
      <div className="mx-auto max-w-[1800px] px-5 py-8 sm:px-8 lg:px-12">
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-purple-950/70 via-[#171326] to-[#101018] p-6 sm:p-10">
          <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-purple-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl" />

          <div className="relative">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-purple-300">
              <Compass size={18} />
              Discover
            </div>

            <h1 className="max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">
              Find your next
              <span className="block text-purple-400">
                anime obsession.
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-gray-400 sm:text-base">
              Explore anime, discover hidden gems, and find your
              next favourite story.
            </p>

            <form
              onSubmit={submitSearch}
              className="mt-7 flex max-w-2xl items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-2 pl-4 focus-within:border-purple-500/60"
            >
              <Search
                size={20}
                className="shrink-0 text-gray-500"
              />

              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search anime titles..."
                className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-gray-500"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setPage(1);
                  }}
                  aria-label="Clear search"
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
                >
                  <X size={17} />
                </button>
              )}

              <button
                type="submit"
                className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold transition hover:bg-purple-500"
              >
                Search
              </button>
            </form>
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <Flame size={19} className="text-orange-400" />
            <h2 className="font-bold">Browse genres</h2>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {genres.map((item) => (
              <button
                key={item.value || "all"}
                type="button"
                onClick={() => {
                  setGenre(item.value);
                  setPage(1);
                }}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                  genre === item.value
                    ? "border-purple-500 bg-purple-600 text-white"
                    : "border-white/10 bg-white/[0.03] text-gray-400 hover:border-purple-500/50 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles
                  size={20}
                  className="text-purple-400"
                />
                <h2 className="text-xl font-extrabold sm:text-2xl">
                  {heading}
                </h2>
              </div>

              <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                Discover anime and find your next watch.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltersOpen((current) => !current)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  filtersOpen
                    ? "border-purple-500 bg-purple-500/10 text-purple-300"
                    : "border-white/10 text-gray-300 hover:bg-white/5"
                }`}
              >
                <SlidersHorizontal size={17} />
                Filters
              </button>

              <label className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-gray-300">
                <ArrowUpDown
                  size={16}
                  className="text-gray-500"
                />

                <span className="hidden sm:inline">Sort:</span>

                <select
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value);
                    setPage(1);
                  }}
                  className="max-w-32 bg-transparent text-sm outline-none"
                >
                  {sortOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="bg-[#12121c]"
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {filtersOpen && (
            <div className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-[#12121c] p-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-xs font-semibold text-gray-400">
                Genre

                <select
                  value={genre}
                  onChange={(event) => {
                    setGenre(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-white/10 bg-[#09090f] px-3 py-3 text-sm text-white outline-none focus:border-purple-500"
                >
                  {genres.map((item) => (
                    <option
                      key={item.value || "all"}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-xs font-semibold text-gray-400">
                Airing status

                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-white/10 bg-[#09090f] px-3 py-3 text-sm text-white outline-none focus:border-purple-500"
                >
                  {statusOptions.map((option) => (
                    <option
                      key={option.value || "any"}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-sm font-semibold text-purple-300 transition hover:text-purple-200 sm:col-span-2"
                >
                  <X size={16} />
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
              <p className="text-sm text-red-300">{error}</p>

              <button
                type="button"
                onClick={loadAnime}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/15"
              >
                <RefreshCw size={16} />
                Try again
              </button>
            </div>
          )}

          {loading && !error && <SkeletonGrid />}

          {!loading && !error && anime.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {anime.map((item) => (
                  <AnimeCard key={item.id} anime={item} />
                ))}
              </div>

              <div className="mt-10 flex items-center justify-center gap-4">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => {
                    setPage((current) => Math.max(1, current - 1));
                    window.scrollTo({
                      top: 0,
                      behavior: "smooth",
                    });
                  }}
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft size={17} />
                  Previous
                </button>

                <span className="rounded-xl bg-purple-500/10 px-4 py-3 text-sm font-bold text-purple-300">
                  Page {page}
                </span>

                <button
                  type="button"
                  disabled={!hasNextPage || loading}
                  onClick={() => {
                    setPage((current) => current + 1);
                    window.scrollTo({
                      top: 0,
                      behavior: "smooth",
                    });
                  }}
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Next
                  <ChevronRight size={17} />
                </button>
              </div>
            </>
          )}

          {!loading && !error && anime.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-[#12121c] px-5 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-300">
                <Search size={28} />
              </div>

              <h3 className="mt-5 text-xl font-extrabold">
                No anime found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                Try another title or clear some filters to discover
                more anime.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold transition hover:bg-purple-500"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        <div className="mt-12 flex items-center justify-center gap-2 text-xs text-gray-600">
          <Sparkles size={14} />
          Anime data powered by AniList
        </div>
      </div>
    </main>
  );
}