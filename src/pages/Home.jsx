
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTrendingAnime } from "../lib/jikan";

const FALLBACK_ANIME = [
  {
    id: 1,
    title: "Solo Leveling",
    titleEnglish: "Solo Leveling",
    synopsis:
      "A hunter discovers a mysterious system that allows him to grow stronger beyond every limit.",
    image: null,
    bannerImage: null,
    score: 86,
    status: "RELEASING",
    genres: ["Action", "Fantasy"],
    episodes: 12,
  },
  {
    id: 16498,
    title: "Attack on Titan",
    titleEnglish: "Attack on Titan",
    synopsis:
      "Humanity fights for survival behind enormous walls while uncovering secrets about the world.",
    image: null,
    bannerImage: null,
    score: 85,
    status: "FINISHED",
    genres: ["Action", "Drama"],
    episodes: 25,
  },
  {
    id: 101922,
    title: "Demon Slayer",
    titleEnglish: "Demon Slayer",
    synopsis:
      "A young swordsman joins the fight against demons to protect the people he loves.",
    image: null,
    bannerImage: null,
    score: 85,
    status: "FINISHED",
    genres: ["Action", "Fantasy"],
    episodes: 26,
  },
];

const getTitle = (anime) =>
  anime?.titleEnglish ||
  anime?.title ||
  anime?.titleRomaji ||
  "Unknown Anime";

const getImage = (anime) =>
  anime?.bannerImage ||
  anime?.image ||
  anime?.coverImage?.extraLarge ||
  anime?.coverImage?.large ||
  anime?.coverImage?.medium ||
  null;

const getCover = (anime) =>
  anime?.image ||
  anime?.coverImage?.large ||
  anime?.coverImage?.extraLarge ||
  anime?.bannerImage ||
  null;

const getDescription = (anime) => {
  const description = anime?.synopsis || anime?.description || "";

  if (!description) {
    return "Discover new adventures, unforgettable characters, and your next favourite anime on AnimeVault.";
  }

  return description.replace(/<[^>]*>/g, "").trim();
};

const formatStatus = (status) => {
  if (!status) return "Anime";

  return String(status)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

function HeroSlider({ animeList }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState({});

  const slides = animeList
    .filter((anime) => anime?.id)
    .slice(0, 3);

  const displaySlides = slides.length > 0 ? slides : FALLBACK_ANIME;
  const activeAnime = displaySlides[activeIndex] || displaySlides[0];
  const background = imageErrors[activeAnime.id]
    ? null
    : getImage(activeAnime);

  const changeSlide = (index) => {
    setActiveIndex(index);
  };

  const nextSlide = () => {
    setActiveIndex((current) => (current + 1) % displaySlides.length);
  };

  const previousSlide = () => {
    setActiveIndex(
      (current) =>
        (current - 1 + displaySlides.length) % displaySlides.length
    );
  };

  useEffect(() => {
    setActiveIndex(0);
  }, [animeList.length]);

  useEffect(() => {
    if (displaySlides.length < 2) return undefined;

    const timer = window.setInterval(nextSlide, 7000);
    return () => window.clearInterval(timer);
  }, [displaySlides.length]);

  return (
    <section
      className="relative isolate flex min-h-[570px] items-center overflow-hidden bg-vault-bg sm:min-h-[620px] lg:min-h-[680px]"
      aria-label="Featured anime"
    >
      {background && (
        <img
          key={activeAnime.id}
          src={background}
          alt=""
          className="absolute inset-0 -z-20 h-full w-full animate-[heroEnter_700ms_ease-out] object-cover object-center"
          onError={() =>
            setImageErrors((current) => ({
              ...current,
              [activeAnime.id]: true,
            }))
          }
        />
      )}

      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#090611] via-[#090611]/85 to-[#090611]/30" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-vault-bg via-transparent to-black/20" />

      <div className="mx-auto w-full max-w-7xl px-5 pb-28 pt-24 sm:px-8 lg:px-12">
        <div
          key={activeAnime.id}
          className="max-w-3xl animate-[heroEnter_500ms_ease-out]"
        >
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-vault-purple/40 bg-vault-purple/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md">
              Featured anime
            </span>

            <span className="rounded-full border border-white/15 bg-black/30 px-3 py-2 text-xs text-white/80">
              {formatStatus(activeAnime.status)}
            </span>
          </div>

          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-vault-purple">
            Your next adventure starts here
          </p>

          <h1 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
            {getTitle(activeAnime)}
            <span className="text-vault-purple">.</span>
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/75">
            {activeAnime.score > 0 && (
              <span className="font-bold text-white">
                <span className="text-yellow-400">★</span>{" "}
                {(activeAnime.score / 10).toFixed(1)}
              </span>
            )}

            {activeAnime.seasonYear && <span>{activeAnime.seasonYear}</span>}

            {activeAnime.format && (
              <span>{formatStatus(activeAnime.format)}</span>
            )}

            {activeAnime.episodes && (
              <span>{activeAnime.episodes} episodes</span>
            )}
          </div>

          <p className="mt-6 max-w-2xl text-sm leading-7 text-white/75 sm:text-base sm:leading-8">
            {getDescription(activeAnime).length > 240
              ? `${getDescription(activeAnime).slice(0, 240).trim()}...`
              : getDescription(activeAnime)}
          </p>

          {activeAnime.genres?.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {activeAnime.genres.slice(0, 3).map((genre) => (
                <span
                  key={genre}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to={`/watch/${activeAnime.id}`}
              className="inline-flex items-center gap-3 rounded-xl bg-vault-purple px-6 py-4 font-bold text-white transition hover:-translate-y-1 hover:shadow-lg hover:shadow-vault-purple/30"
            >
              <span>▶</span>
              Explore Anime
            </Link>

            <Link
              to={`/anime/${activeAnime.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-4 font-semibold text-white transition hover:border-vault-purple/60 hover:bg-white/10"
            >
              More Details <span>↗</span>
            </Link>
          </div>
        </div>
      </div>

      {displaySlides.length > 1 && (
        <div className="absolute bottom-7 left-5 right-5 flex items-center justify-between sm:left-8 sm:right-8 lg:left-12 lg:right-12">
          <div className="flex items-center gap-2">
            {displaySlides.map((anime, index) => (
              <button
                key={anime.id}
                type="button"
                onClick={() => changeSlide(index)}
                aria-label={`Show ${getTitle(anime)}`}
                aria-current={index === activeIndex ? "true" : undefined}
                className={`h-1.5 rounded-full transition-all ${
                  index === activeIndex
                    ? "w-10 bg-vault-purple"
                    : "w-5 bg-white/40 hover:bg-white"
                }`}
              />
            ))}

            <span className="ml-2 text-xs text-white/60">
              {activeIndex + 1} / {displaySlides.length}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={previousSlide}
              aria-label="Previous anime"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white transition hover:bg-vault-purple"
            >
              ←
            </button>

            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next anime"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white transition hover:bg-vault-purple"
            >
              →
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes heroEnter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}

function AnimeCard({ anime }) {
  const title = getTitle(anime);
  const image = getCover(anime);

  return (
    <Link to={`/anime/${anime.id}`} className="group block min-w-0">
      <div className="relative aspect-[3/4.2] overflow-hidden rounded-2xl border border-white/10 bg-vault-surface">
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-vault-purple/40 to-vault-bg p-4 text-center">
            <span className="font-bold text-white">{title}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-90" />

        {anime.score > 0 && (
          <div className="absolute left-3 top-3 rounded-lg bg-black/70 px-2.5 py-1.5 text-xs font-bold text-white">
            <span className="text-yellow-400">★</span>{" "}
            {(anime.score / 10).toFixed(1)}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-4">
          {anime.genres?.[0] && (
            <span className="mb-2 inline-block rounded-md bg-vault-purple/80 px-2 py-1 text-[10px] font-bold uppercase text-white">
              {anime.genres[0]}
            </span>
          )}

          <h3 className="line-clamp-2 text-sm font-bold leading-5 text-white sm:text-base">
            {title}
          </h3>

          <div className="mt-3 text-xs text-white/60">
            {formatStatus(anime.status)}
            {anime.episodes ? ` · ${anime.episodes} episodes` : ""}
          </div>
        </div>
      </div>
    </Link>
  );
}

function AnimeSection({ title, subtitle, animeList, loading, viewAllTo }) {
  if (!loading && animeList.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-6 w-1 rounded-full bg-vault-purple" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-vault-purple">
              AnimeVault selection
            </span>
          </div>

          <h2 className="text-2xl font-black text-vault-text sm:text-3xl">
            {title}
          </h2>

          <p className="mt-2 text-sm text-vault-muted">{subtitle}</p>
        </div>

        {viewAllTo && (
          <Link
            to={viewAllTo}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-vault-text transition hover:border-vault-purple hover:bg-vault-purple/10"
          >
            View all →
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="aspect-[3/4.2] animate-pulse rounded-2xl bg-vault-surface"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {animeList.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const [anime, setAnime] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHomeAnime = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getTrendingAnime({
        page: 1,
        perPage: 12,
      });

      setAnime(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      setAnime([]);
      setError("Anime could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHomeAnime();
  }, [loadHomeAnime]);

  const uniqueAnime = anime.filter(
    (item, index, list) =>
      item?.id && list.findIndex((other) => other?.id === item.id) === index
  );

  const trendingAnime = uniqueAnime.slice(0, 6);
  const popularAnime = uniqueAnime.slice(6, 12);

  return (
    <main className="min-h-screen overflow-hidden bg-vault-bg text-vault-text">
      <HeroSlider animeList={uniqueAnime} />

      {error && (
        <div className="mx-auto mt-6 flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <p className="text-sm text-vault-muted">{error}</p>
          <button
            type="button"
            onClick={loadHomeAnime}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold transition hover:border-vault-purple"
          >
            Retry
          </button>
        </div>
      )}

      <div className="relative">
        <AnimeSection
          title="Trending right now"
          subtitle="Discover anime worth watching."
          animeList={trendingAnime}
          loading={loading}
          viewAllTo="/trending"
        />

        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <AnimeSection
          title="More anime to explore"
          subtitle="Find another story for your watchlist."
          animeList={popularAnime}
          loading={loading}
          viewAllTo="/popular"
        />
      </div>

      <section className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8 lg:px-12">
        <div className="relative overflow-hidden rounded-3xl border border-vault-purple/25 bg-vault-surface p-7 sm:p-10 lg:p-12">
          <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full bg-vault-purple/20 blur-[90px]" />

          <div className="relative flex flex-col items-start justify-between gap-7 md:flex-row md:items-center">
            <div className="max-w-xl">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-vault-purple">
                Enter the vault
              </p>

              <h2 className="text-3xl font-black leading-tight sm:text-4xl">
                Your next favourite anime is waiting.
              </h2>

              <p className="mt-4 max-w-lg leading-7 text-vault-muted">
                Explore new worlds, discover new characters, and build your
                next watchlist with AnimeVault.
              </p>
            </div>

            <Link
              to="/search"
              className="shrink-0 rounded-xl bg-vault-purple px-6 py-4 font-bold text-white transition hover:-translate-y-1 hover:shadow-lg hover:shadow-vault-purple/20"
            >
              Discover Anime →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
