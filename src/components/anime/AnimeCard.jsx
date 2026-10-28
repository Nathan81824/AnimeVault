
import { Link } from "react-router-dom";
import { Star, Play } from "lucide-react";

export default function AnimeCard({ anime }) {
  if (!anime) return null;

  const id = anime.id || anime.malId || anime.idMal;

  if (!id) return null;

  const title =
    anime.titleEnglish ||
    anime.title ||
    anime.titleRomaji ||
    anime.title?.english ||
    anime.title?.romaji ||
    "Untitled Anime";

  const image =
    anime.image ||
    anime.coverImage?.extraLarge ||
    anime.coverImage?.large ||
    anime.coverImage?.medium ||
    anime.images?.jpg?.large_image_url ||
    anime.images?.jpg?.image_url ||
    "";

  const rawScore = Number(
    anime.averageScore ?? anime.score ?? anime.meanScore
  );

  const score =
    Number.isFinite(rawScore) && rawScore > 0
      ? (rawScore / 10).toFixed(1)
      : "N/A";

  const year =
    anime.seasonYear ||
    anime.startDate?.year ||
    anime.year ||
    null;

  const type = anime.format || anime.type || "Anime";

  const episodeCount = anime.episodes;

  const subtitle = episodeCount
    ? `${episodeCount} episodes`
    : anime.status
      ? String(anime.status).replaceAll("_", " ").toLowerCase()
      : "Anime series";

  return (
    <article className="group min-w-0 overflow-hidden rounded-2xl border border-white/5 bg-vault-surface transition duration-300 hover:-translate-y-1 hover:border-vault-purple/40 hover:shadow-xl hover:shadow-vault-purple/10">
      <Link
        to={`/anime/${id}`}
        aria-label={`View details for ${title}`}
        className="block"
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-white/5">
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
            <div className="flex h-full items-center justify-center px-3 text-center text-sm text-vault-muted">
              No poster available
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20 opacity-80 transition group-hover:opacity-100" />

          <span className="absolute left-2 top-2 max-w-[65%] truncate rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs font-medium capitalize text-white backdrop-blur">
            {type.replaceAll("_", " ").toLowerCase()}
          </span>

          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1 text-xs font-semibold text-yellow-400 backdrop-blur">
            <Star size={12} className="fill-current" />
            {score}
          </span>

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
            <div className="min-w-0">
              {year && (
                <p className="mb-1 text-xs text-gray-300">
                  {year}
                </p>
              )}

              <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white">
                {title}
              </h3>
            </div>

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vault-purple text-white transition group-hover:scale-110">
              <Play size={15} fill="currentColor" />
            </span>
          </div>
        </div>
      </Link>

      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <span className="truncate text-xs capitalize text-vault-muted">
          {subtitle}
        </span>

        <Link
          to={`/watch/${id}`}
          aria-label={`Watch ${title}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-vault-purple/30 px-3 py-1.5 text-xs font-semibold text-vault-accent transition hover:bg-vault-purple hover:text-white"
        >
          <Play size={12} fill="currentColor" />
          Watch
        </Link>
      </div>
    </article>
  );
}
