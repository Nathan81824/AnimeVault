
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  RotateCw,
  AlertCircle,
  Clapperboard,
  LoaderCircle,
} from "lucide-react";
import { getAnimeDetails } from "../lib/jikan";

const YOUTUBE_API_URL = "https://www.youtube.com/iframe_api";

const getYouTubeVideoId = (value) => {
  if (!value || typeof value !== "string") return null;

  const input = value.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  try {
    const url = new URL(input);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();

    if (hostname === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "youtube-nocookie.com"
    ) {
      const videoId = url.searchParams.get("v");

      if (videoId) return videoId;

      const parts = url.pathname.split("/").filter(Boolean);

      if (
        ["embed", "shorts", "live", "v"].includes(parts[0]) &&
        parts[1]
      ) {
        return parts[1];
      }
    }
  } catch {
    return null;
  }

  return null;
};

const getTrailerId = (anime) => {
  const trailer = anime?.trailer;

  if (!trailer) return null;

  const possibleValues = [
    trailer.youtube_id,
    trailer.youtubeId,
    trailer.embedUrl,
    trailer.embed_url,
    trailer.url,
    trailer.link,
  ];

  for (const value of possibleValues) {
    const videoId = getYouTubeVideoId(value);

    if (videoId) return videoId;
  }

  return null;
};

const loadYouTubeAPI = () => {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (window.__animeVaultYouTubePromise) {
    return window.__animeVaultYouTubePromise;
  }

  window.__animeVaultYouTubePromise = new Promise((resolve, reject) => {
    let timeout;
    let interval;

    const finish = () => {
      if (window.YT?.Player) {
        clearTimeout(timeout);
        clearInterval(interval);
        resolve(window.YT);
      }
    };

    const previousCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      try {
        previousCallback?.();
      } catch (error) {
        console.error("Previous YouTube callback error:", error);
      }

      finish();
    };

    let script = document.querySelector(
      `script[src="${YOUTUBE_API_URL}"]`
    );

    if (!script) {
      script = document.createElement("script");
      script.src = YOUTUBE_API_URL;
      script.async = true;
      document.head.appendChild(script);
    }

    script.addEventListener("load", finish, { once: true });

    interval = setInterval(finish, 200);

    timeout = setTimeout(() => {
      clearInterval(interval);
      reject(new Error("YouTube player took too long to load."));
    }, 15000);

    finish();
  });

  return window.__animeVaultYouTubePromise;
};

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
};

export default function Watch() {
  const { id } = useParams();

  const playerElementRef = useRef(null);
  const playerRef = useRef(null);
  const volumeRef = useRef(80);
  const progressRef = useRef(0);

  const [anime, setAnime] = useState(null);
  const [trailerId, setTrailerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const [showControls, setShowControls] = useState(true);

  const animeTitle =
    anime?.title_english ||
    anime?.title ||
    anime?.title_japanese ||
    "Anime Trailer";

  const animeImage =
    anime?.images?.jpg?.large_image_url ||
    anime?.images?.jpg?.image_url ||
    anime?.image ||
    "";

  useEffect(() => {
    let active = true;

    const fetchAnime = async () => {
      setLoading(true);
      setError("");
      setAnime(null);
      setTrailerId(null);

      try {
        const result = await getAnimeDetails(id);

        if (!active) return;

        const animeData = result?.data || result;

        if (!animeData) {
          throw new Error("Anime information could not be found.");
        }

        setAnime(animeData);

        const videoId = getTrailerId(animeData);

        if (!videoId) {
          setError("No YouTube trailer is available for this anime.");
        } else {
          setTrailerId(videoId);
        }
      } catch (err) {
        console.error("Anime loading error:", err);

        if (active) {
          setError(
            err?.message || "Could not load this anime. Please try again."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    if (id) {
      fetchAnime();
    } else {
      setError("No anime ID was provided.");
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!trailerId || !playerElementRef.current) return;

    let cancelled = false;
    let player = null;

    setPlayerReady(false);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const createPlayer = async () => {
      try {
        const YT = await loadYouTubeAPI();

        if (cancelled || !playerElementRef.current) return;

        player = new YT.Player(playerElementRef.current, {
          width: "100%",
          height: "100%",
          videoId: trailerId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            iv_load_policy: 3,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;

              playerRef.current = event.target;
              event.target.setVolume(volumeRef.current);
              setPlayerReady(true);

              const videoDuration = event.target.getDuration();

              if (videoDuration) {
                setDuration(videoDuration);
              }
            },

            onStateChange: (event) => {
              if (cancelled) return;

              if (event.data === YT.PlayerState.PLAYING) {
                setPlaying(true);
                setPlayerReady(true);
              } else if (
                event.data === YT.PlayerState.PAUSED ||
                event.data === YT.PlayerState.ENDED
              ) {
                setPlaying(false);
              }

              if (event.data === YT.PlayerState.ENDED) {
                setCurrentTime(0);
              }
            },

            onError: (event) => {
              console.error("YouTube player error:", event.data);

              if (!cancelled) {
                setError(
                  "YouTube could not play this trailer. It may be unavailable or restricted."
                );
              }
            },
          },
        });
      } catch (err) {
        console.error("YouTube API error:", err);

        if (!cancelled) {
          setError(
            "The trailer player could not load. Check your connection and try again."
          );
        }
      }
    };

    createPlayer();

    return () => {
      cancelled = true;

      if (playerRef.current === player) {
        playerRef.current = null;
      }

      try {
        player?.destroy();
      } catch {
        // Player may not have finished initializing.
      }

      setPlayerReady(false);
      setPlaying(false);
    };
  }, [trailerId]);

  useEffect(() => {
    if (!playerReady || !playerRef.current) return;

    const interval = setInterval(() => {
      const player = playerRef.current;

      if (!player) return;

      try {
        const time = player.getCurrentTime();
        const videoDuration = player.getDuration();

        if (Number.isFinite(time)) {
          setCurrentTime(time);
          progressRef.current = time;
        }

        if (Number.isFinite(videoDuration) && videoDuration > 0) {
          setDuration(videoDuration);
        }
      } catch {
        // Player may temporarily be unavailable.
      }
    }, 500);

    return () => clearInterval(interval);
  }, [playerReady]);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;

    if (!player || !playerReady) return;

    try {
      if (playing) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    } catch (err) {
      console.error("Playback control error:", err);
    }
  }, [playing, playerReady]);

  const seek = useCallback(
    (amount) => {
      const player = playerRef.current;

      if (!player || !playerReady) return;

      try {
        const current = player.getCurrentTime() || 0;
        const total = player.getDuration() || 0;
        const nextTime = Math.max(0, Math.min(total, current + amount));

        player.seekTo(nextTime, true);
        setCurrentTime(nextTime);
      } catch (err) {
        console.error("Seek error:", err);
      }
    },
    [playerReady]
  );

  const handleProgressChange = (event) => {
    const nextTime = Number(event.target.value);

    setCurrentTime(nextTime);

    try {
      playerRef.current?.seekTo(nextTime, true);
    } catch (err) {
      console.error("Progress error:", err);
    }
  };

  const handleVolumeChange = (event) => {
    const nextVolume = Number(event.target.value);

    volumeRef.current = nextVolume;
    setVolume(nextVolume);

    try {
      playerRef.current?.setVolume(nextVolume);

      if (nextVolume > 0 && muted) {
        playerRef.current?.unMute();
        setMuted(false);
      }

      if (nextVolume === 0) {
        playerRef.current?.mute();
        setMuted(true);
      }
    } catch (err) {
      console.error("Volume error:", err);
    }
  };

  const toggleMute = () => {
    const player = playerRef.current;

    if (!player) return;

    try {
      if (muted) {
        player.unMute();
        player.setVolume(volumeRef.current || 80);
        setMuted(false);
      } else {
        player.mute();
        setMuted(true);
      }
    } catch (err) {
      console.error("Mute error:", err);
    }
  };

  const toggleFullscreen = () => {
    const container = document.getElementById("anime-vault-player");

    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      container.requestFullscreen?.();
    }
  };

  const progressPercentage =
    duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080808] text-white">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-orange-500" />
          <p className="text-sm text-zinc-400">Loading anime trailer...</p>
        </div>
      </div>
    );
  }

  if (error && !trailerId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080808] px-5 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-orange-500" />

          <h1 className="mb-2 text-xl font-bold">
            Trailer unavailable
          </h1>

          <p className="mb-6 text-sm leading-6 text-zinc-400">
            {error}
          </p>

          <Link
            to={`/anime/${id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-400"
          >
            <ArrowLeft size={17} />
            Back to anime
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-10">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Link
            to={`/anime/${id}`}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-orange-500/40 hover:text-white"
          >
            <ArrowLeft size={17} />
            Back
          </Link>

          <div className="flex items-center gap-2 text-sm font-bold tracking-wide">
            <Clapperboard className="h-5 w-5 text-orange-500" />
            <span>
              ANIME<span className="text-orange-500">VAULT</span>
            </span>
          </div>
        </header>

        <section className="mx-auto max-w-6xl">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-500">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                Official trailer
              </div>

              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                {animeTitle}
              </h1>

              <p className="mt-2 text-sm text-zinc-500">
                Watch the official trailer on AnimeVault
              </p>
            </div>

            {anime?.score && (
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm">
                <span className="text-zinc-500">Score </span>
                <span className="font-bold text-orange-400">
                  {anime.score}
                </span>
              </div>
            )}
          </div>

          <div
            id="anime-vault-player"
            className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/50"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >
            {animeImage && !playerReady && (
              <div
                className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center opacity-20 blur-xl"
                style={{ backgroundImage: `url("${animeImage}")` }}
              />
            )}

            <div
              ref={playerElementRef}
              className="absolute inset-0 z-10 h-full w-full"
            />

            {!playerReady && !error && (
              <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/40">
                <LoaderCircle className="h-10 w-10 animate-spin text-orange-500" />
                <p className="text-sm font-medium text-zinc-300">
                  Preparing trailer...
                </p>
              </div>
            )}

            {error && trailerId && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 px-5 text-center">
                <AlertCircle className="mb-3 h-10 w-10 text-orange-500" />
                <p className="max-w-md text-sm text-zinc-300">{error}</p>
                <a
                  href={`https://www.youtube.com/watch?v=${trailerId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-black transition hover:bg-orange-400"
                >
                  Open trailer on YouTube
                </a>
              </div>
            )}

            {playerReady && (
              <div
                className={`absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/90 via-transparent to-black/20 transition-opacity duration-300 ${
                  showControls || !playing
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
              >
                {!playing && (
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label="Play trailer"
                    className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-orange-500 text-black shadow-xl transition hover:scale-110 hover:bg-orange-400"
                  >
                    <Play size={27} fill="currentColor" />
                  </button>
                )}

                <div className="p-4 sm:p-6">
                  <div className="mb-3 flex items-center justify-between text-xs font-medium tabular-nums text-zinc-300">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.1"
                    value={Math.min(currentTime, duration || 100)}
                    onChange={handleProgressChange}
                    aria-label="Trailer progress"
                    className="mb-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-orange-500"
                    style={{
                      background: `linear-gradient(to right, #f97316 ${progressPercentage}%, rgba(255,255,255,0.2) ${progressPercentage}%)`,
                    }}
                  />

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <button
                        type="button"
                        onClick={togglePlay}
                        aria-label={playing ? "Pause trailer" : "Play trailer"}
                        className="rounded-lg p-2 text-white transition hover:bg-white/10 hover:text-orange-400"
                      >
                        {playing ? (
                          <Pause size={21} fill="currentColor" />
                        ) : (
                          <Play size={21} fill="currentColor" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => seek(-10)}
                        aria-label="Go back 10 seconds"
                        className="rounded-lg p-2 text-white transition hover:bg-white/10 hover:text-orange-400"
                      >
                        <RotateCcw size={19} />
                      </button>

                      <button
                        type="button"
                        onClick={() => seek(10)}
                        aria-label="Go forward 10 seconds"
                        className="rounded-lg p-2 text-white transition hover:bg-white/10 hover:text-orange-400"
                      >
                        <RotateCw size={19} />
                      </button>

                      <div className="group/volume flex items-center gap-2">
                        <button
                          type="button"
                          onClick={toggleMute}
                          aria-label={muted ? "Unmute" : "Mute"}
                          className="rounded-lg p-2 text-white transition hover:bg-white/10 hover:text-orange-400"
                        >
                          {muted || volume === 0 ? (
                            <VolumeX size={20} />
                          ) : (
                            <Volume2 size={20} />
                          )}
                        </button>

                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={muted ? 0 : volume}
                          onChange={handleVolumeChange}
                          aria-label="Volume"
                          className="hidden w-20 cursor-pointer accent-orange-500 sm:block"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      aria-label="Toggle fullscreen"
                      className="rounded-lg p-2 text-white transition hover:bg-white/10 hover:text-orange-400"
                    >
                      <Maximize size={20} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:p-5">
            {animeImage && (
              <img
                src={animeImage}
                alt={animeTitle}
                className="h-24 w-16 rounded-lg object-cover"
              />
            )}

            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-white">{animeTitle}</h2>

              <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-500">
                {anime?.synopsis || "Watch the trailer for this anime."}
              </p>
            </div>

            <Link
              to={`/anime/${id}`}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-semibold text-orange-400 transition hover:bg-orange-500 hover:text-black"
            >
              View anime
              <ArrowLeft className="rotate-180" size={16} />
            </Link>
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-zinc-600">
            Trailer playback is provided by YouTube. Some videos may be
            unavailable due to regional restrictions or the video owner's
            settings.
          </p>
        </section>
      </div>
    </main>
  );
}
