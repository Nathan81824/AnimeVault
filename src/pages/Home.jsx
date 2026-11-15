
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Play,
  ChevronLeft,
  ChevronRight,
  Star,
  ArrowRight,
  Sparkles,
  Clapperboard,
  Flame,
  Eye,
  Compass,
  Volume2,
  VolumeX,
  Heart,
  Clock,
  RotateCcw,
  MessageCircle,
  Activity,
  ArrowUpRight,
} from "lucide-react";

import { getTrendingAnime } from "../lib/jikan";
import { supabase } from "../lib/supabase";
import shortService from "../features/shorts/services/shortsService";
import { useAnimeStore } from "../features/anime/animeStore";

const FALLBACK_ANIME = [
  {
    id: 1,
    title: "Solo Leveling",
    synopsis: "A hunter discovers a mysterious system that allows him to grow stronger beyond every limit.",
    score: 86,
    status: "RELEASING",
    genres: ["Action", "Fantasy"],
    episodes: 12,
  },
  {
    id: 16498,
    title: "Attack on Titan",
    synopsis: "Humanity fights for survival behind enormous walls while uncovering secrets about the world.",
    score: 85,
    status: "FINISHED",
    genres: ["Action", "Drama"],
    episodes: 25,
  },
  {
    id: 101922,
    title: "Demon Slayer",
    synopsis: "A young swordsman joins the fight against demons to protect the people he loves.",
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
  anime?.anime_title ||
  "Unknown Anime";

const getImage = (anime) =>
  anime?.bannerImage ||
  anime?.image ||
  anime?.anime_image ||
  anime?.coverImage?.extraLarge ||
  anime?.coverImage?.large ||
  anime?.coverImage?.medium ||
  null;

const getCover = (anime) =>
  anime?.image ||
  anime?.anime_image ||
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

const formatCount = (value) => {
  const count = Number(value ?? 0);

  if (!Number.isFinite(count)) return "0";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;

  return count.toLocaleString();
};

const formatTime = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
};

const formatActivityTime = (date) => {
  if (!date) return "Recently";

  const timestamp = new Date(date).getTime();

  if (!Number.isFinite(timestamp)) return "Recently";

  const difference = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(difference / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(date).toLocaleDateString();
};

const getYoutubeId = (value) => {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const parts = parsed.pathname.split("/").filter(Boolean);

    let id = null;

    if (hostname === "youtu.be") {
      id = parts[0];
    } else if (
      ["youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com"].includes(hostname)
    ) {
      if (parsed.pathname === "/watch") {
        id = parsed.searchParams.get("v");
      } else if (["embed", "shorts", "live", "v"].includes(parts[0])) {
        id = parts[1];
      }
    }

    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
};

const shuffleShorts = (items) => {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled;
};

function SectionHeading({ eyebrow, title, subtitle, icon: Icon, link }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-3 flex items-center gap-2">
          {Icon && <Icon size={15} className="text-orange-500" />}
          <span className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-orange-500">
            {eyebrow}
          </span>
        </div>

        <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-2 text-sm leading-6 text-zinc-400">{subtitle}</p>
        )}
      </div>

      {link && (
        <Link
          to={link}
          className="group inline-flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-2.5 text-xs font-bold text-orange-400 transition hover:border-orange-500/50 hover:bg-orange-500/10"
        >
          View all
          <ArrowRight size={15} className="transition group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

function HeroSlider({ animeList }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState({});

  const slides = animeList.filter((anime) => anime?.id).slice(0, 6);
  const displaySlides = slides.length ? slides : FALLBACK_ANIME;
  const activeAnime = displaySlides[activeIndex] || displaySlides[0];

  const background = imageErrors[activeAnime.id] ? null : getImage(activeAnime);

  const nextSlide = useCallback(() => {
    setActiveIndex((current) => (current + 1) % displaySlides.length);
  }, [displaySlides.length]);

  const previousSlide = useCallback(() => {
    setActiveIndex((current) => (current - 1 + displaySlides.length) % displaySlides.length);
  }, [displaySlides.length]);

  useEffect(() => {
    setActiveIndex(0);
  }, [animeList.length]);

  useEffect(() => {
    if (displaySlides.length < 2) return undefined;

    const timer = window.setInterval(nextSlide, 7500);
    return () => window.clearInterval(timer);
  }, [nextSlide, displaySlides.length]);

  return (
    <section className="relative isolate min-h-[590px] overflow-hidden bg-[#090909] sm:min-h-[650px] lg:min-h-[720px]">
      {background && (
        <img
          key={activeAnime.id}
          src={background}
          alt=""
          className="absolute inset-0 -z-30 h-full w-full object-cover"
          onError={() => setImageErrors((current) => ({ ...current, [activeAnime.id]: true }))}
        />
      )}

      <div className="absolute inset-0 -z-20 bg-gradient-to-r from-[#090909] via-[#090909]/85 to-[#090909]/30" />
      <div className="absolute inset-0 -z-20 bg-gradient-to-t from-[#090909] via-transparent to-black/35" />
      <div className="absolute -left-40 top-10 -z-10 h-96 w-96 rounded-full bg-orange-600/15 blur-[130px]" />

      <div className="mx-auto flex min-h-[590px] max-w-7xl items-center px-5 pb-28 pt-28 sm:min-h-[650px] sm:px-8 lg:min-h-[720px] lg:px-12">
        <div key={activeAnime.id} className="max-w-3xl animate-[heroEnter_500ms_ease-out]">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/40 bg-orange-500/15 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">
              <Sparkles size={13} />
              Featured anime
            </span>

            <span className="rounded-full border border-white/15 bg-black/35 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/75">
              {formatStatus(activeAnime.status)}
            </span>
          </div>

          <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-orange-400">
            Discover your next adventure
          </p>

          <h1 className="max-w-3xl text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
            {getTitle(activeAnime)}
            <span className="text-orange-500">.</span>
          </h1>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-zinc-300">
            {activeAnime.score > 0 && (
              <span className="inline-flex items-center gap-1.5 font-bold text-white">
                <Star size={16} fill="currentColor" className="text-orange-400" />
                {(activeAnime.score / 10).toFixed(1)}
              </span>
            )}

            {activeAnime.seasonYear && <span>{activeAnime.seasonYear}</span>}
            {activeAnime.format && <span>{formatStatus(activeAnime.format)}</span>}
            {activeAnime.episodes && <span>{activeAnime.episodes} Episodes</span>}
          </div>

          <p className="mt-6 max-w-2xl text-sm leading-8 text-zinc-300 sm:text-base">
            {getDescription(activeAnime).length > 240
              ? `${getDescription(activeAnime).slice(0, 240).trim()}...`
              : getDescription(activeAnime)}
          </p>

          {activeAnime.genres?.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {activeAnime.genres.slice(0, 4).map((genre) => (
                <span key={genre} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300">
                  {genre}
                </span>
              ))}
            </div>
          )}

          <div className="mt-9 flex flex-wrap gap-3">
            <Link to={`/watch/${activeAnime.id}`} className="inline-flex items-center gap-3 rounded-xl bg-orange-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-orange-600/20 transition hover:-translate-y-1 hover:bg-orange-500">
              <Play size={17} fill="currentColor" />
              Explore Anime
            </Link>

            <Link to={`/anime/${activeAnime.id}`} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-sm font-bold text-white transition hover:border-orange-500/60 hover:bg-orange-500/10">
              More Details
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {displaySlides.length > 1 && (
        <div className="absolute bottom-8 left-5 right-5 flex items-center justify-between sm:left-8 sm:right-8 lg:left-12 lg:right-12">
          <div className="flex items-center gap-2">
            {displaySlides.map((anime, index) => (
              <button
                key={anime.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show ${getTitle(anime)}`}
                aria-current={index === activeIndex ? "true" : undefined}
                className={`h-1.5 rounded-full transition-all duration-300 ${index === activeIndex ? "w-10 bg-orange-500" : "w-5 bg-white/35 hover:bg-orange-300"}`}
              />
            ))}

            <span className="ml-2 text-xs font-semibold text-white/50">
              {activeIndex + 1} / {displaySlides.length}
            </span>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={previousSlide} aria-label="Previous anime" className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/40 text-white transition hover:border-orange-500 hover:bg-orange-600">
              <ChevronLeft size={20} />
            </button>

            <button type="button" onClick={nextSlide} aria-label="Next anime" className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/40 text-white transition hover:border-orange-500 hover:bg-orange-600">
              <ChevronRight size={20} />
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
      <div className="relative aspect-[3/4.2] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#171717] transition duration-300 group-hover:-translate-y-1 group-hover:border-orange-500/50 group-hover:shadow-xl group-hover:shadow-orange-950/30">
        {image ? (
          <img src={image} alt={title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" onError={(event) => { event.currentTarget.style.display = "none"; }} />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-orange-700/40 to-[#151515] p-4 text-center">
            <span className="font-bold text-white">{title}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />

        {anime.score > 0 && (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/75 px-2.5 py-1.5 text-xs font-bold text-white">
            <Star size={12} fill="currentColor" className="text-orange-400" />
            {(anime.score / 10).toFixed(1)}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-4">
          {anime.genres?.[0] && (
            <span className="mb-2 inline-block rounded-md bg-orange-600 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white">
              {anime.genres[0]}
            </span>
          )}

          <h3 className="line-clamp-2 text-sm font-bold leading-5 text-white sm:text-base">{title}</h3>
          <p className="mt-2 text-[11px] text-zinc-400">
            {formatStatus(anime.status)}{anime.episodes ? ` · ${anime.episodes} Episodes` : ""}
          </p>
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition duration-300 group-hover:opacity-100">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-orange-600/90 text-white">
            <Play size={17} fill="currentColor" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function AnimeSection({ title, subtitle, animeList, loading, viewAllTo }) {
  if (!loading && animeList.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12">
      <SectionHeading eyebrow="Anime collection" title={title} subtitle={subtitle} icon={Flame} link={viewAllTo} />

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="aspect-[3/4.2] animate-pulse rounded-2xl bg-[#171717]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {animeList.map((anime) => <AnimeCard key={anime.id} anime={anime} />)}
        </div>
      )}
    </section>
  );
}

function FavoritesSection({ favorites, loading }) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12">
      <SectionHeading eyebrow="Your personal collection" title="Your Favorites" subtitle="The anime you've saved to your vault." icon={Heart} link="/my-vault" />

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="aspect-[3/4.2] animate-pulse rounded-2xl bg-[#171717]" />)}
        </div>
      ) : favorites.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {favorites.map((anime) => <AnimeCard key={anime.id} anime={anime} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-orange-500/20 bg-orange-500/[0.04] px-6 py-10 text-center">
          <Heart size={30} className="mx-auto mb-4 text-orange-500" />
          <h3 className="text-lg font-bold text-white">Your favorites will appear here</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
            Save anime from their details pages and they will show up in this collection.
          </p>
          <Link to="/search" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-xs font-bold text-white transition hover:bg-orange-500">
            Discover Anime
            <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </section>
  );
}

function ContinueWatchingSection({ progress, loading }) {
  const unfinished = (Array.isArray(progress) ? progress : [])
    .filter((item) => {
      const duration = Number(item.duration_seconds || 0);
      const position = Number(item.position_seconds || 0);

      return item.anime_id && !item.completed && position > 0 && (!duration || position < duration);
    })
    .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12">
      <SectionHeading
        eyebrow="Pick up where you left off"
        title="Continue Watching"
        subtitle="Your anime journey continues right where you stopped."
        icon={Clock}
        link="/my-vault"
      />

      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-52 w-72 shrink-0 animate-pulse rounded-2xl bg-[#171717]" />
          ))}
        </div>
      ) : unfinished.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {unfinished.slice(0, 6).map((item) => {
            const duration = Number(item.duration_seconds || 0);
            const position = Number(item.position_seconds || 0);
            const percentage = duration > 0 ? Math.min(100, Math.max(0, (position / duration) * 100)) : 0;
            const title = getTitle(item);
            const image = getCover(item);

            return (
              <Link
                key={`${item.anime_id}-${item.episode_number || 1}`}
                to={`/watch/${item.anime_id}`}
                className="group flex min-w-0 gap-4 overflow-hidden rounded-2xl border border-white/10 bg-[#151515] p-3 transition hover:-translate-y-1 hover:border-orange-500/50 hover:bg-[#1b1714]"
              >
                <div className="relative h-40 w-28 shrink-0 overflow-hidden rounded-xl bg-[#242424]">
                  {image ? (
                    <img src={image} alt={title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                  ) : (
                    <div className="flex h-full items-center justify-center p-2 text-center">
                      <Clapperboard size={24} className="text-orange-500" />
                    </div>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-orange-600 text-white">
                      <Play size={17} fill="currentColor" />
                    </span>
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center py-2">
                  <span className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Continue watching</span>
                  <h3 className="line-clamp-2 text-sm font-bold leading-5 text-white transition group-hover:text-orange-400 sm:text-base">{title}</h3>
                  <p className="mt-2 text-xs text-zinc-400">Episode {item.episode_number || 1}</p>

                  <div className="mt-auto pt-5">
                    <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
                      <span>{duration > 0 ? `${formatTime(position)} / ${formatTime(duration)}` : "Progress saved"}</span>
                      {duration > 0 && <span>{Math.round(percentage)}%</span>}
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${percentage}%` }} />
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-orange-400">
                      <RotateCcw size={13} />
                      Resume episode
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-orange-500/20 bg-orange-500/[0.04] px-6 py-10 text-center">
          <Clock size={30} className="mx-auto mb-4 text-orange-500" />
          <h3 className="text-lg font-bold text-white">Nothing to continue yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
            Start watching an anime and your saved viewing progress will appear here.
          </p>
          <Link to="/trending" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-xs font-bold text-white transition hover:bg-orange-500">
            Find Anime
            <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </section>
  );
}

const ACTIVITY_TYPES = {
  like: {
    label: "Liked your Short",
    description: "Liked your Short",
    icon: Heart,
    color: "text-pink-400",
    background: "bg-pink-500/10",
    border: "border-pink-500/20",
  },
  comment: {
    label: "Commented on your Short",
    description: "Commented on your Short",
    icon: MessageCircle,
    color: "text-green-400",
    background: "bg-green-500/10",
    border: "border-green-500/20",
  },
};

function ChannelActivityCard({ activity }) {
  const profile = activity.profile;
  const displayName = profile?.display_name || profile?.username || "AnimeVault user";
  const username = profile?.username ? `@${profile.username}` : "AnimeVault user";
  const ActivityIcon = activity.typeInfo.icon;
  const initial = displayName.trim().charAt(0).toUpperCase() || "A";
  const channelLink = `/channel/${encodeURIComponent(activity.actor_id)}`;

  return (
    <Link to={channelLink} aria-label={`Visit ${displayName}'s channel`} className="group relative flex w-[285px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121212] p-4 transition duration-300 hover:-translate-y-1 hover:border-orange-500/40 hover:bg-[#19130f] hover:shadow-xl hover:shadow-orange-950/20 sm:w-[310px]">
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-orange-500/[0.07] blur-3xl transition group-hover:bg-orange-500/15" />

      <div className="relative flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="h-12 w-12 overflow-hidden rounded-full bg-gradient-to-br from-orange-500 to-orange-950 p-[2px]">
            <div className="h-full w-full overflow-hidden rounded-full bg-[#171717]">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} loading="lazy" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-base font-black text-orange-400">{initial}</div>
              )}
            </div>
          </div>

          <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-[#121212] bg-[#24201c]">
            <ActivityIcon size={11} className={activity.typeInfo.color} />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-white transition group-hover:text-orange-300">{displayName}</h3>
          <p className="mt-1 truncate text-[11px] text-zinc-500">{username}</p>
        </div>

        <ArrowUpRight size={16} className="shrink-0 text-zinc-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-orange-400" />
      </div>

      <div className="relative mt-5 flex items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold ${activity.typeInfo.background} ${activity.typeInfo.border} ${activity.typeInfo.color}`}>
          <ActivityIcon size={12} />
          {activity.typeInfo.label}
        </span>

        <span className="shrink-0 text-[10px] font-medium text-zinc-600">{formatActivityTime(activity.created_at)}</span>
      </div>

      <div className="relative mt-4 min-h-[66px]">
        <p className="text-xs leading-5 text-zinc-400">
          <span className="font-semibold text-orange-300">{displayName}</span>{" "}
          {activity.typeInfo.description}{" "}
          <span className="font-semibold text-zinc-200">{activity.short_title || "Untitled Short"}</span>
        </p>

        {activity.type === "comment" && activity.comment && (
          <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2.5">
            <div className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-green-400">
              <MessageCircle size={11} />
              Their comment
            </div>
            <p className="line-clamp-3 break-words text-[11px] leading-5 text-zinc-400">"{activity.comment}"</p>
          </div>
        )}
      </div>

      <div className="relative mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <span className="text-[10px] font-semibold text-zinc-600">Community interaction</span>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-400 transition group-hover:gap-2">
          Visit channel
          <ArrowRight size={12} />
        </span>
      </div>
    </Link>
  );
}

function ChannelActivitySection({ activities, loading }) {
  if (!loading && activities.length === 0) return null;

  return (
    <section className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full bg-orange-600/[0.04] blur-[110px]" />

      <div className="relative mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Activity size={15} className="text-orange-500" />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-orange-500">Your creator community</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">People Interacting With Your Content</h2>

            {!loading && activities.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-[10px] font-bold text-orange-400">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                {activities.length} people
              </span>
            )}
          </div>

          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">See the latest six people who liked or commented on your Shorts.</p>
        </div>

        <Link to="/shorts" className="group inline-flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-2.5 text-xs font-bold text-orange-400 transition hover:border-orange-500/50 hover:bg-orange-500/10">
          Explore Shorts
          <ArrowRight size={15} className="transition group-hover:translate-x-1" />
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-52 w-[285px] shrink-0 animate-pulse rounded-2xl border border-white/5 bg-[#171717]" />)}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-5 [scrollbar-color:#f97316_#171717]">
          {activities.slice(0, 6).map((activity) => (
            <ChannelActivityCard key={`${activity.actor_id}-${activity.type}-${activity.short_id}`} activity={activity} />
          ))}
        </div>
      )}

      {!loading && activities.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
          <p className="flex items-center gap-2 text-[10px] text-zinc-600">
            <Heart size={12} className="text-orange-500" />
            Showing the latest interactions on your Shorts.
          </p>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-600">
            <Activity size={12} className="text-orange-500" />
            Your creator community
          </span>
        </div>
      )}
    </section>
  );
}

function getShortVideoUrl(short) {
  return short.videoUrl || short.video_url || short.video || short.url || "";
}

function getShortThumbnail(short, youtubeId) {
  return (
    short.thumbnailUrl ||
    short.thumbnail_url ||
    short.thumbnail ||
    short.cover_image ||
    short.coverImage ||
    short.preview_url ||
    short.previewUrl ||
    short.poster ||
    (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : "")
  );
}

function getActualViewCount(result, fallback = 0) {
  if (typeof result === "number") return result;
  if (!result || result.success === false) return fallback;

  const count = result.viewCount ?? result.view_count ?? result.count ?? result.views ?? result.data?.count;

  return count === undefined || count === null ? fallback : Number(count);
}

function ShortCard({ short }) {
  const [previewing, setPreviewing] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const videoRef = useRef(null);
  const iframeRef = useRef(null);

  const shortId = short.id || short.short_id;
  const title = short.title || short.caption || short.description || "Watch this Short";
  const videoUrl = getShortVideoUrl(short);
  const youtubeUrl = short.youtubeUrl || short.youtube_url || videoUrl;
  const youtubeId = getYoutubeId(youtubeUrl);
  const isYouTube = Boolean(youtubeId);
  const isDirectVideo = Boolean(videoUrl) && !isYouTube;
  const thumbnail = getShortThumbnail(short, youtubeId);

  const views = Number(short.viewCount ?? short.view_count ?? short.views ?? 0);

  const creatorId =
    short.creator_id ||
    short.user_id ||
    short.userId ||
    short.creator?.id ||
    short.profile?.id ||
    null;

  const creatorProfile = short.profile || short.creator || null;
  const creatorName = creatorProfile?.display_name || creatorProfile?.username || short.creator_name || short.username || "AnimeVault creator";
  const creatorUsername = creatorProfile?.username ? `@${creatorProfile.username}` : short.username ? `@${short.username}` : "Creator";
  const creatorAvatar = creatorProfile?.avatar_url || null;
  const creatorInitial = creatorName.trim().charAt(0).toUpperCase() || "A";
  const channelLink = creatorId ? `/channel/${encodeURIComponent(creatorId)}` : "/channels";

  const youtubeEmbedUrl = youtubeId
    ? `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=0&playsinline=1&controls=0&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
    : "";

  const sendYoutubeCommand = useCallback((command) => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;

    frame.contentWindow.postMessage(
      JSON.stringify({ event: "command", func: command, args: [] }),
      "https://www.youtube-nocookie.com",
    );
  }, []);

  const startPreview = () => {
    setPreviewing(true);

    if (videoRef.current && isDirectVideo && !videoFailed) {
      videoRef.current.muted = muted;
      videoRef.current.play().catch(() => {});
    }
  };

  const stopPreview = () => {
    setPreviewing(false);

    if (videoRef.current) {
      videoRef.current.pause();
      try {
        videoRef.current.currentTime = 0;
      } catch {
        // Video may not be ready yet.
      }
    }
  };

  const toggleMute = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const nextMuted = !muted;
    setMuted(nextMuted);

    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      if (previewing && !nextMuted) videoRef.current.play().catch(() => {});
    }

    if (isYouTube) sendYoutubeCommand(nextMuted ? "mute" : "unMute");
  };

  useEffect(() => {
    if (!previewing || !isYouTube) return undefined;

    const timer = window.setTimeout(() => {
      sendYoutubeCommand(muted ? "mute" : "unMute");
    }, 500);

    return () => window.clearTimeout(timer);
  }, [previewing, isYouTube, muted, sendYoutubeCommand]);

  return (
    <article onMouseEnter={startPreview} onMouseLeave={stopPreview} onFocus={startPreview} onBlur={stopPreview} className="group relative w-[165px] shrink-0 sm:w-[195px]">
      <Link to={shortId ? `/shorts/${encodeURIComponent(shortId)}` : "/shorts"} state={{ shortId: String(shortId || "") }} aria-label={`Watch ${title}`} className="relative block aspect-[9/16] overflow-hidden rounded-2xl border border-white/10 bg-[#17110e] shadow-lg transition duration-300 hover:-translate-y-1 hover:border-orange-500/60 hover:shadow-xl hover:shadow-orange-950/30">
        {thumbnail && !thumbnailFailed ? (
          <img src={thumbnail} alt={title} loading="lazy" onError={() => setThumbnailFailed(true)} className={`absolute inset-0 h-full w-full object-cover transition duration-500 ${previewing && (isDirectVideo || isYouTube) ? "opacity-0" : "opacity-100 group-hover:scale-105"}`} />
        ) : (
          <div className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#54220b] via-[#21130d] to-black p-4 text-center ${previewing && isDirectVideo ? "opacity-0" : "opacity-100"}`}>
            <Clapperboard size={32} className="mb-3 text-orange-400" />
            <span className="line-clamp-3 text-sm font-bold text-white">{title}</span>
          </div>
        )}

        {isYouTube && previewing && (
          <iframe
            ref={iframeRef}
            key={`${shortId}-${youtubeId}`}
            src={youtubeEmbedUrl}
            title={`Preview: ${title}`}
            onLoad={() => sendYoutubeCommand(muted ? "mute" : "unMute")}
            className="pointer-events-none absolute inset-0 h-full w-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}

        {isDirectVideo && (
          <video
            ref={videoRef}
            src={videoUrl}
            muted={muted}
            loop
            playsInline
            preload="metadata"
            onError={() => setVideoFailed(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${previewing && !videoFailed ? "opacity-100" : !thumbnail || thumbnailFailed ? "opacity-100" : "opacity-0"}`}
          />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/20" />

        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-orange-400/30 bg-orange-600 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-white">
          <Play size={10} fill="currentColor" />
          Short
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="line-clamp-2 text-sm font-bold leading-5 text-white">{title}</h3>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-white/75">
            <Eye size={13} className="text-orange-400" />
            {formatCount(views)} views
          </p>
        </div>
      </Link>

      <div className="mt-3 flex min-w-0 items-center gap-2.5 px-1">
        <Link to={channelLink} aria-label={`Visit ${creatorName}'s channel`} title={`Visit ${creatorName}'s channel`} className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-orange-500/60 bg-[#21140d] transition hover:border-orange-400 hover:ring-2 hover:ring-orange-500/20">
          {creatorAvatar ? (
            <img src={creatorAvatar} alt={creatorName} loading="lazy" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs font-black text-orange-400">{creatorInitial}</span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <Link to={channelLink} className="block truncate text-xs font-bold text-white transition hover:text-orange-400" title={creatorName}>{creatorName}</Link>
          <p className="mt-0.5 truncate text-[10px] text-zinc-500">{creatorUsername}</p>
        </div>
      </div>

      <button type="button" onClick={toggleMute} onMouseDown={(event) => event.stopPropagation()} aria-label={muted ? "Unmute preview" : "Mute preview"} title={muted ? "Turn sound on" : "Turn sound off"} className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/75 text-white shadow-lg backdrop-blur-sm transition hover:border-orange-400 hover:bg-orange-600">
        {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
      </button>
    </article>
  );
}

function ShortsSection({ shorts, loading }) {
  if (!loading && shorts.length === 0) return null;

  return (
    <section className="relative mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-orange-600/5 blur-[100px]" />

      <SectionHeading eyebrow="Community videos" title="Anime Shorts" subtitle="Quick anime moments, edits, and clips from the community." icon={Clapperboard} link="/shorts" />

      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="aspect-[9/16] w-[165px] shrink-0 animate-pulse rounded-2xl bg-[#171717] sm:w-[195px]" />)}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-5 [scrollbar-color:#f97316_#171717]">
          {shorts.map((short) => <ShortCard key={short.id || short.short_id} short={short} />)}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const [anime, setAnime] = useState([]);
  const [shorts, setShorts] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [channelActivities, setChannelActivities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [shortsLoading, setShortsLoading] = useState(true);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  const [error, setError] = useState("");
  const [watchProgressLoading, setWatchProgressLoading] = useState(true);

  const watchProgress = useAnimeStore((state) => state.watchProgress);
  const fetchWatchProgress = useAnimeStore((state) => state.fetchWatchProgress);

  const loadHomeAnime = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getTrendingAnime({ page: 1, perPage: 12 });
      setAnime(Array.isArray(data) ? data : data?.results || []);
    } catch {
      setAnime([]);
      setError("Anime could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHomeFavorites = useCallback(async () => {
    setFavoritesLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!user) {
        setFavorites([]);
        return;
      }

      const { data, error: favoritesError } = await supabase
        .from("saved_anime")
        .select("id, anime_id, anime_title, anime_image, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12);

      if (favoritesError) throw favoritesError;

      setFavorites((data || []).filter((item) => item.anime_id).map((item) => ({
        id: item.anime_id,
        title: item.anime_title || "Saved Anime",
        titleEnglish: item.anime_title || "Saved Anime",
        image: item.anime_image || null,
        coverImage: { large: item.anime_image || null },
      })));
    } catch (err) {
      console.error("Could not load saved anime:", err);
      setFavorites([]);
    } finally {
      setFavoritesLoading(false);
    }
  }, []);

  const loadChannelActivity = useCallback(async () => {
    setActivityLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!user) {
        setChannelActivities([]);
        return;
      }

      const { data: myShorts, error: myShortsError } = await supabase
        .from("shorts")
        .select("id, user_id, title, caption")
        .eq("user_id", user.id);

      if (myShortsError) throw myShortsError;

      if (!myShorts?.length) {
        setChannelActivities([]);
        return;
      }

      const shortMap = new Map(myShorts.map((short) => [
        String(short.id),
        { short_id: short.id, short_title: short.title || short.caption || "Untitled Short" },
      ]));

      const myShortIds = myShorts.map((short) => short.id);

      const [likesResult, commentsResult] = await Promise.all([
        supabase.from("short_likes").select("short_id, user_id, created_at").in("short_id", myShortIds).neq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
        supabase.from("short_comments").select("id, short_id, user_id, content, created_at").in("short_id", myShortIds).neq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
      ]);

      if (likesResult.error) throw likesResult.error;
      if (commentsResult.error) throw commentsResult.error;

      const rawActivities = [];

      (likesResult.data || []).forEach((item) => {
        const short = shortMap.get(String(item.short_id));
        if (!short || !item.user_id) return;

        rawActivities.push({
          actor_id: item.user_id,
          type: "like",
          short_id: item.short_id,
          short_title: short.short_title,
          created_at: item.created_at,
        });
      });

      (commentsResult.data || []).forEach((item) => {
        const short = shortMap.get(String(item.short_id));
        if (!short || !item.user_id) return;

        rawActivities.push({
          actor_id: item.user_id,
          type: "comment",
          short_id: item.short_id,
          short_title: short.short_title,
          created_at: item.created_at,
          comment: item.content || "",
        });
      });

      rawActivities.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      const latestByPerson = new Map();

      rawActivities.forEach((activity) => {
        if (!latestByPerson.has(activity.actor_id)) latestByPerson.set(activity.actor_id, activity);
      });

      const latestActivities = Array.from(latestByPerson.values())
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 6);

      if (!latestActivities.length) {
        setChannelActivities([]);
        return;
      }

      const actorIds = latestActivities.map((activity) => activity.actor_id);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", actorIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));

      setChannelActivities(latestActivities.map((activity) => ({
        ...activity,
        profile: profileMap.get(activity.actor_id) || null,
        typeInfo: ACTIVITY_TYPES[activity.type],
      })).filter((activity) => activity.profile && activity.typeInfo));
    } catch (err) {
      console.error("Could not load people interacting with your content:", err);
      setChannelActivities([]);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const loadHomeShorts = useCallback(async () => {
    setShortsLoading(true);

    try {
      const result = await shortService.getPublishedShorts({ limit: 16, offset: 0 });

      if (!result?.success) throw new Error(result?.error || "Unable to load published Shorts.");

      const publishedShorts = result.shorts || [];

      const creatorIds = [...new Set(publishedShorts.map((short) =>
        short.creator_id || short.user_id || short.userId || short.creator?.id || short.profile?.id
      ).filter(Boolean))];

      let profileMap = new Map();

      if (creatorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", creatorIds);

        if (profilesError) {
          console.error("Could not load Short creator profiles:", profilesError);
        } else {
          profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
        }
      }

      const shortsWithProfiles = publishedShorts.map((short) => {
        const creatorId = short.creator_id || short.user_id || short.userId || short.creator?.id || short.profile?.id || null;

        return {
          ...short,
          creator_id: creatorId,
          profile: (creatorId && profileMap.get(creatorId)) || short.profile || short.creator || null,
        };
      });

      const shortsWithViews = await Promise.all(shortsWithProfiles.map(async (short) => {
        const id = short.id || short.short_id;

        if (!id || typeof shortService.getViewCount !== "function") return short;

        try {
          const viewResult = await shortService.getViewCount(id);
          const actualViews = getActualViewCount(viewResult, short.viewCount ?? short.view_count ?? 0);

          return { ...short, viewCount: actualViews, view_count: actualViews };
        } catch (viewError) {
          console.error(`Could not load views for Short ${id}:`, viewError);
          return short;
        }
      }));

      setShorts(shuffleShorts(shortsWithViews));
    } catch (err) {
      console.error("Home Shorts error:", err);
      setShorts([]);
    } finally {
      setShortsLoading(false);
    }
  }, []);

  const loadWatchProgress = useCallback(async () => {
    setWatchProgressLoading(true);

    try {
      if (typeof fetchWatchProgress === "function") {
        await fetchWatchProgress();
      }
    } catch (err) {
      console.error("Could not load watch progress:", err);
    } finally {
      setWatchProgressLoading(false);
    }
  }, [fetchWatchProgress]);

  useEffect(() => {
    loadHomeAnime();
    loadHomeShorts();
    loadHomeFavorites();
    loadChannelActivity();
    loadWatchProgress();
  }, [
    loadHomeAnime,
    loadHomeShorts,
    loadHomeFavorites,
    loadChannelActivity,
    loadWatchProgress,
  ]);

  const uniqueAnime = anime.filter((item, index, list) =>
    item?.id && list.findIndex((other) => String(other?.id) === String(item.id)) === index
  );

  const trendingAnime = uniqueAnime.slice(0, 6);
  const popularAnime = uniqueAnime.slice(6, 12);

  return (
    <main className="min-h-screen overflow-hidden bg-[#090909] text-white">
      <HeroSlider animeList={uniqueAnime} />

      {error && (
        <div className="mx-auto mt-6 flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <p className="text-sm text-zinc-400">{error}</p>
          <button type="button" onClick={loadHomeAnime} className="rounded-xl border border-orange-500/30 px-4 py-2.5 text-xs font-bold text-orange-400 transition hover:bg-orange-500/10">
            Try again
          </button>
        </div>
      )}

      <div className="relative">
        <ShortsSection shorts={shorts} loading={shortsLoading} />

        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
        </div>

        <ChannelActivitySection activities={channelActivities} loading={activityLoading} />

        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
        </div>

        <ContinueWatchingSection progress={watchProgress} loading={watchProgressLoading} />

        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
        </div>

        <AnimeSection title="Trending right now" subtitle="The anime everyone's talking about." animeList={trendingAnime} loading={loading} viewAllTo="/trending" />

        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
        </div>

        <FavoritesSection favorites={favorites} loading={favoritesLoading} />

        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
        </div>

        <AnimeSection title="More anime to explore" subtitle="Find your next favourite story." animeList={popularAnime} loading={loading} viewAllTo="/popular" />
      </div>

      <section className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-8 lg:px-12">
        <div className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-[#211006] via-[#17110e] to-[#111111] p-8 sm:p-12">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-orange-600/10 blur-[100px]" />

          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-xl">
              <div className="mb-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                <Compass size={15} />
                Explore the vault
              </div>

              <h2 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
                Your next favourite anime is waiting.
              </h2>

              <p className="mt-4 max-w-lg text-sm leading-7 text-zinc-400">
                Explore new worlds, discover unforgettable characters, and build your next watchlist with AnimeVault.
              </p>
            </div>

            <Link to="/search" className="group inline-flex shrink-0 items-center gap-3 rounded-xl bg-orange-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-orange-950/30 transition hover:-translate-y-1 hover:bg-orange-500">
              Discover Anime
              <ArrowRight size={17} className="transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>/
    </main>
  );
}
