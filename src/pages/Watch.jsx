import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAnimeDetails } from "../lib/jikan";
import { getAnimeEpisodeInfo } from "../lib/episodes";
import {
  isYouTubeLookupConfigured,
  resolveEpisodeVideo,
} from "../lib/videoSources";

function safeHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value.trim());

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

const YT_EMBED_PREFIX = "https://www.youtube-nocookie.com/embed/";

// Source already attached to the episode (catalog or YouTube URL from AniList)
function getPlayableSource(episode) {
  if (!episode || !episode.playableInVault) return null;

  const embedUrl = safeHttpUrl(episode.embedUrl);

  if (embedUrl && embedUrl.startsWith(YT_EMBED_PREFIX)) {
    return {
      type: "embed",
      url: embedUrl,
      provider:
        episode.sourceType === "catalog" ? "AnimeVault catalog" : "YouTube",
      attribution: null,
      watchUrl:
        episode.sourceType === "catalog" || episode.sourceType === "youtube"
          ? safeHttpUrl(episode.url)
          : null,
    };
  }

  const videoUrl = safeHttpUrl(episode.videoUrl);

  if (videoUrl) {
    return {
      type: "video",
      url: videoUrl,
      provider: "AnimeVault catalog",
      attribution: null,
      watchUrl: null,
    };
  }

  return null;
}

function getTrailerSource(anime) {
  const embedUrl = safeHttpUrl(anime?.trailer?.embedUrl);

  if (embedUrl && embedUrl.startsWith(YT_EMBED_PREFIX)) {
    return { type: "embed", url: embedUrl };
  }

  return null;
}

export default function Watch() {
  const { id } = useParams();

  const [anime, setAnime] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [streamingLinks, setStreamingLinks] = useState([]);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Official-channel lookup state (keyed so stale results are ignored)
  const [lookup, setLookup] = useState({ key: null, status: "idle" });
  const [retryNonce, setRetryNonce] = useState(0);
  const [failedUrl, setFailedUrl] = useState(null);

  const requestIdRef = useRef(0);

  const loadAnime = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isStale = () => requestId !== requestIdRef.current;

    setLoading(true);
    setError("");
    setAnime(null);
    setEpisodes([]);
    setStreamingLinks([]);
    setSelectedEpisodeId(null);
    setShowTrailer(false);
    setFailedUrl(null);

    try {
      const routeId = Number(id);

      if (!Number.isSafeInteger(routeId) || routeId <= 0) {
        throw new Error("The anime ID in this URL is invalid.");
      }

      const animeData = await getAnimeDetails(routeId);

      if (isStale()) return;

      if (!animeData) {
        throw new Error("This anime could not be found.");
      }

      const anilistId = Number(
        animeData.anilistId ?? animeData.idAniList ?? animeData.id
      );

      if (!Number.isSafeInteger(anilistId) || anilistId <= 0) {
        throw new Error("This anime does not have a valid AniList ID.");
      }

      const info = await getAnimeEpisodeInfo(anilistId);

      if (isStale()) return;

      const normalizedEpisodes = (
        Array.isArray(info?.episodes) ? info.episodes : []
      ).map((episode, index) => ({
        ...episode,
        id: episode.id ?? `episode-${index + 1}`,
        number: Number(episode.number) || index + 1,
        title: episode.title?.trim() || `Episode ${index + 1}`,
        thumbnail: safeHttpUrl(episode.thumbnail),
        url: safeHttpUrl(episode.url),
        embedUrl: safeHttpUrl(episode.embedUrl),
        videoUrl: safeHttpUrl(episode.videoUrl),
      }));

      const rawLinks = Array.isArray(info?.streamingLinks)
        ? info.streamingLinks
        : Array.isArray(info?.externalLinks)
          ? info.externalLinks.filter(
              (link) =>
                String(link.type || "").toUpperCase() === "STREAMING"
            )
          : [];

      const normalizedLinks = rawLinks
        .map((link) => ({
          site: link.site || "Streaming service",
          url: safeHttpUrl(link.url),
          type: link.type || "STREAMING",
        }))
        .filter((link) => link.url);

      setAnime(animeData);
      setEpisodes(normalizedEpisodes);
      setStreamingLinks(normalizedLinks);

      const firstPlayable = normalizedEpisodes.find(
        (episode) => episode.playableInVault
      );

      setSelectedEpisodeId(
        firstPlayable?.id ?? normalizedEpisodes[0]?.id ?? null
      );
    } catch (err) {
      if (isStale()) return;

      setError(
        err?.message || "Something went wrong while loading this anime."
      );
    } finally {
      if (!isStale()) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    loadAnime();

    return () => {
      requestIdRef.current += 1;
    };
  }, [loadAnime]);

  const selectedEpisode = useMemo(
    () =>
      episodes.find((episode) => episode.id === selectedEpisodeId) || null,
    [episodes, selectedEpisodeId]
  );

  const selectedIndex = episodes.findIndex(
    (episode) => episode.id === selectedEpisodeId
  );

  const trailerSource = useMemo(() => getTrailerSource(anime), [anime]);
  const staticSource = useMemo(
    () => getPlayableSource(selectedEpisode),
    [selectedEpisode]
  );

  const isTrailerEpisode = selectedEpisode?.sourceType === "trailer";

  // Only look up official channels when nothing playable is attached yet
  const needsLookup = Boolean(
    anime &&
      selectedEpisode &&
      !staticSource &&
      !isTrailerEpisode &&
      isYouTubeLookupConfigured
  );

  const lookupKey = needsLookup
    ? `${anime.id}:${selectedEpisode.id}:${retryNonce}`
    : null;

  useEffect(() => {
    if (!lookupKey) return undefined;

    let cancelled = false;

    setLookup({ key: lookupKey, status: "loading" });

    resolveEpisodeVideo(anime, selectedEpisode)
      .then((result) => {
        if (!cancelled) setLookup({ key: lookupKey, ...result });
      })
      .catch((err) => {
        if (!cancelled) {
          setLookup({
            key: lookupKey,
            status: "error",
            message:
              err?.message || "Could not look up an official video.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
    // lookupKey already encodes anime, episode and retry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupKey]);

  const currentLookup = lookup.key === lookupKey ? lookup : null;
  const lookedUpSource =
    currentLookup?.status === "ready" ? currentLookup.source : null;

  const lookupLoading =
    needsLookup && (!currentLookup || currentLookup.status === "loading");
  const lookupError =
    needsLookup && currentLookup?.status === "error"
      ? currentLookup.message
      : null;

  const episodeSource = staticSource || lookedUpSource;
  const playbackFailed = Boolean(
    episodeSource && failedUrl === episodeSource.url
  );
  const usableEpisodeSource = playbackFailed ? null : episodeSource;

  const showingTrailer = Boolean(
    !usableEpisodeSource && showTrailer && trailerSource
  );
  const playableSource =
    usableEpisodeSource || (showingTrailer ? trailerSource : null);

  // Prefer the episode-specific streaming page over a generic series link
  const episodeLinkUrl = safeHttpUrl(selectedEpisode?.url);
  const externalUrl = episodeLinkUrl || streamingLinks[0]?.url || null;
  const externalSite = episodeLinkUrl
    ? selectedEpisode?.site || "streaming service"
    : streamingLinks[0]?.site || "streaming service";

  const openExternalSource = () => {
    if (externalUrl) {
      window.open(externalUrl, "_blank", "noopener,noreferrer");
    }
  };

  const selectEpisode = (episodeId) => {
    setSelectedEpisodeId(episodeId);
    setShowTrailer(false);
  };

  const goToEpisode = (direction) => {
    const nextIndex = selectedIndex + direction;

    if (nextIndex >= 0 && nextIndex < episodes.length) {
      selectEpisode(episodes[nextIndex].id);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-vault-bg px-4 py-16 text-vault-text">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-vault-purple border-t-transparent" />
          <p className="text-vault-muted">Loading your anime...</p>
        </div>
      </main>
    );
  }

  if (error || !anime) {
    return (
      <main className="min-h-screen bg-vault-bg px-4 py-16 text-vault-text">
        <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-vault-surface p-8 text-center">
          <h1 className="mb-3 text-2xl font-bold">Unable to load anime</h1>

          <p className="mb-6 text-vault-muted">
            {error || "The requested anime could not be found."}
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={loadAnime}
              className="rounded-xl bg-vault-purple px-5 py-3 font-semibold text-white transition hover:opacity-90"
            >
              Try again
            </button>

            <Link
              to="/"
              className="rounded-xl border border-white/10 px-5 py-3 font-semibold transition hover:bg-white/5"
            >
              Back home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const animeTitle =
    anime.titleEnglish || anime.title || anime.titleRomaji || "Anime";

  const counterLabel = !selectedEpisode
    ? "No episodes available"
    : isTrailerEpisode
      ? "Official trailer"
      : `Episode ${selectedEpisode.number} of ${episodes.length}`;

  let unavailableMessage =
    "No official embeddable video was found for this episode. It is most likely available only on the streaming services listed here.";

  if (playbackFailed) {
    unavailableMessage =
      "The video failed to load. It may be blocked in your region or have been removed.";
  } else if (!isYouTubeLookupConfigured) {
    unavailableMessage =
      "No playable source is attached to this episode. You can watch it on the official streaming service instead.";
  }

  return (
    <main className="min-h-screen bg-vault-bg px-4 py-8 text-vault-text sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          to={`/anime/${anime.id}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-vault-muted transition hover:text-vault-text"
        >
          <span aria-hidden="true">←</span>
          Back to anime details
        </Link>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0">
            <div className="mb-5">
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-vault-purple">
                Anime Vault Player
              </p>

              <h1 className="text-2xl font-bold sm:text-3xl">
                {animeTitle}
              </h1>

              <p className="mt-2 text-vault-muted">
                {showingTrailer
                  ? "Official trailer"
                  : selectedEpisode?.title || "No episode selected"}
              </p>
            </div>

            <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
              {playableSource?.type === "video" ? (
                <video
                  key={playableSource.url}
                  className="h-full w-full bg-black"
                  controls
                  playsInline
                  preload="metadata"
                  src={playableSource.url}
                  onError={() => setFailedUrl(playableSource.url)}
                >
                  Your browser does not support HTML video.
                </video>
              ) : playableSource?.type === "embed" ? (
                <iframe
                  key={playableSource.url}
                  src={playableSource.url}
                  title={`${animeTitle} - ${
                    showingTrailer
                      ? "Trailer"
                      : selectedEpisode?.title || "Episode"
                  }`}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : lookupLoading ? (
                <div className="flex h-full flex-col items-center justify-center px-5 py-8 text-center">
                  <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-vault-purple border-t-transparent" />
                  <p className="text-sm text-vault-muted">
                    Looking for an official video...
                  </p>
                </div>
              ) : lookupError ? (
                <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-5 py-8 text-center">
                  <h2 className="mb-2 text-xl font-bold">
                    Couldn't check for a video
                  </h2>

                  <p className="mb-5 max-w-md text-sm leading-6 text-vault-muted">
                    {lookupError}
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setRetryNonce((n) => n + 1)}
                      className="rounded-xl bg-vault-purple px-5 py-3 font-semibold text-white transition hover:opacity-90"
                    >
                      Try again
                    </button>

                    {externalUrl && (
                      <button
                        type="button"
                        onClick={openExternalSource}
                        className="rounded-xl border border-white/10 px-5 py-3 font-semibold transition hover:bg-white/5"
                      >
                        Watch on {externalSite} ↗
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-5 py-8 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-vault-purple/20 text-3xl">
                    ▶
                  </div>

                  <h2 className="mb-2 text-xl font-bold">
                    {selectedEpisode?.title || "Episode videos unavailable"}
                  </h2>

                  <p className="mb-5 max-w-md text-sm leading-6 text-vault-muted">
                    {unavailableMessage}
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {externalUrl && (
                      <button
                        type="button"
                        onClick={openExternalSource}
                        className="rounded-xl bg-vault-purple px-5 py-3 font-semibold text-white transition hover:opacity-90"
                      >
                        Watch on {externalSite} ↗
                      </button>
                    )}

                    {trailerSource && (
                      <button
                        type="button"
                        onClick={() => setShowTrailer(true)}
                        className="rounded-xl border border-white/10 px-5 py-3 font-semibold transition hover:bg-white/5"
                      >
                        ▶ Watch trailer
                      </button>
                    )}
                  </div>

                  {!trailerSource && !externalUrl && (
                    <p className="mt-4 text-sm text-vault-muted">
                      No trailer or streaming link is listed for this anime.
                    </p>
                  )}

                  {import.meta.env.DEV && !isYouTubeLookupConfigured && (
                    <p className="mt-4 max-w-md text-xs leading-5 text-vault-muted">
                      Dev note: set VITE_YOUTUBE_API_KEY and
                      VITE_YOUTUBE_CHANNEL_IDS in .env to enable official
                      channel lookup.
                    </p>
                  )}
                </div>
              )}
            </div>

            {showingTrailer && (
              <button
                type="button"
                onClick={() => setShowTrailer(false)}
                className="mt-3 text-sm text-vault-muted transition hover:text-vault-text"
              >
                ← Back to episode
              </button>
            )}

            {usableEpisodeSource && !isTrailerEpisode && (
              <p className="mt-3 text-xs text-vault-muted">
                Source: {usableEpisodeSource.provider}
                {usableEpisodeSource.attribution
                  ? ` · ${usableEpisodeSource.attribution}`
                  : ""}
                {usableEpisodeSource.label
                  ? ` · ${usableEpisodeSource.label}`
                  : ""}
                {usableEpisodeSource.watchUrl && (
                  <>
                    {" · "}
                    <a
                      href={usableEpisodeSource.watchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline transition hover:text-vault-text"
                    >
                      Open on YouTube ↗
                    </a>
                  </>
                )}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => goToEpisode(-1)}
                disabled={selectedIndex <= 0}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Previous
              </button>

              <span className="text-sm text-vault-muted">{counterLabel}</span>

              <button
                type="button"
                onClick={() => goToEpisode(1)}
                disabled={
                  selectedIndex < 0 || selectedIndex >= episodes.length - 1
                }
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next →
              </button>
            </div>

            {streamingLinks.length > 0 && (
              <section className="mt-8 rounded-2xl border border-white/10 bg-vault-surface p-5">
                <h2 className="mb-3 text-lg font-bold">Streaming services</h2>

                <div className="flex flex-wrap gap-3">
                  {streamingLinks.map((link, index) => (
                    <a
                      key={`${link.site}-${index}`}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium transition hover:border-vault-purple hover:bg-vault-purple/10"
                    >
                      {link.site} ↗
                    </a>
                  ))}
                </div>

                <p className="mt-3 text-xs leading-5 text-vault-muted">
                  Availability varies by service and region. Links open
                  external websites.
                </p>
              </section>
            )}

            <section className="mt-8 rounded-2xl border border-white/10 bg-vault-surface p-5 sm:p-6">
              <h2 className="mb-3 text-xl font-bold">About this anime</h2>

              {anime.description ? (
                <p className="whitespace-pre-line text-sm leading-7 text-vault-muted">
                  {anime.description.replace(/<[^>]*>/g, "")}
                </p>
              ) : (
                <p className="text-sm text-vault-muted">
                  No description is available.
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {(anime.genres || []).map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs text-vault-muted"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </section>
          </section>

          <aside className="h-fit overflow-hidden rounded-2xl border border-white/10 bg-vault-surface">
            <div className="border-b border-white/10 p-5">
              <h2 className="text-lg font-bold">Episodes</h2>

              <p className="mt-1 text-sm text-vault-muted">
                {episodes.length
                  ? `${episodes.length} ${
                      episodes.length === 1 ? "entry" : "entries"
                    } available`
                  : "No episode entries provided by AniList"}
              </p>
            </div>

            {episodes.length > 0 ? (
              <div className="max-h-[650px] overflow-y-auto p-3">
                <div className="space-y-2">
                  {episodes.map((episode) => {
                    const isSelected = episode.id === selectedEpisodeId;
                    const isTrailer = episode.sourceType === "trailer";

                    return (
                      <button
                        key={episode.id}
                        type="button"
                        onClick={() => selectEpisode(episode.id)}
                        aria-current={isSelected ? "true" : undefined}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? "border-vault-purple bg-vault-purple/15"
                            : "border-transparent hover:border-white/10 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/30">
                          {episode.thumbnail ? (
                            <img
                              src={episode.thumbnail}
                              alt=""
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-lg">▶</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-vault-muted">
                            {isTrailer
                              ? "Trailer"
                              : `Episode ${episode.number}`}
                          </p>

                          <p className="line-clamp-2 text-sm font-semibold">
                            {episode.title}
                          </p>

                          {!episode.playableInVault && episode.site && (
                            <p className="mt-0.5 text-[11px] text-vault-muted">
                              Available on {episode.site}
                            </p>
                          )}
                        </div>

                        {isSelected && (
                          <span
                            className="text-vault-purple"
                            aria-label="Selected episode"
                          >
                            ●
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-5">
                <p className="text-sm leading-6 text-vault-muted">
                  AniList does not provide streaming episode entries for every
                  anime. Check the available streaming services
                  {trailerSource ? " or watch the trailer." : "."}
                </p>

                {trailerSource && (
                  <button
                    type="button"
                    onClick={() => setShowTrailer(true)}
                    className="mt-4 rounded-xl bg-vault-purple px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    ▶ Watch trailer
                  </button>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}