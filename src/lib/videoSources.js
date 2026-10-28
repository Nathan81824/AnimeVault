import { VIDEO_MANIFEST } from "../data/videoManifest";

const YT_API = "https://www.googleapis.com/youtube/v3";
const API_KEY = (import.meta.env.VITE_YOUTUBE_API_KEY || "").trim();
const CHANNEL_IDS = (import.meta.env.VITE_YOUTUBE_CHANNEL_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean)
  .slice(0, 5);

const REQUEST_TIMEOUT = 10000;
const CACHE_PREFIX = "animevault:yt:v1:";
const HIT_TTL = 24 * 60 * 60 * 1000;
const MISS_TTL = 6 * 60 * 60 * 1000;

export const isYouTubeLookupConfigured = Boolean(
  API_KEY && CHANNEL_IDS.length
);

/* ---------- URL helpers ---------- */

export function safeHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.href;
  } catch {
    return null;
  }
}

const isYouTubeId = (value) =>
  typeof value === "string" && /^[\w-]{11}$/.test(value);

export function getYouTubeVideoId(value) {
  const safeUrl = safeHttpUrl(value);
  if (!safeUrl) return null;

  try {
    const url = new URL(safeUrl);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    let id = null;

    if (hostname === "youtu.be") {
      id = url.pathname.split("/").filter(Boolean)[0] || null;
    } else if (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "youtube-nocookie.com"
    ) {
      if (url.pathname === "/watch") {
        id = url.searchParams.get("v");
      } else {
        id =
          url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ||
          null;
      }
    }

    return isYouTubeId(id) ? id : null;
  } catch {
    return null;
  }
}

export function buildYouTubeEmbedUrl(videoId) {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
    videoId
  )}`;
}

export function getYouTubeEmbedUrl(value) {
  const id = getYouTubeVideoId(value);
  return id ? buildYouTubeEmbedUrl(id) : null;
}

/* ---------- 1. Verified catalog (static) ---------- */

const VIDEO_FILE = /\.(mp4|webm|ogv|ogg|mov|m4v)$/i;

export function getManifestSource(anilistId, number) {
  const entry = VIDEO_MANIFEST?.[anilistId]?.[number];
  const url = safeHttpUrl(typeof entry === "string" ? entry : entry?.url);

  if (!url) return null;

  const embedUrl = getYouTubeEmbedUrl(url);
  if (embedUrl) return { embedUrl, videoUrl: null };

  // <video> plays mp4/webm/ogg natively. HLS (.m3u8) would need hls.js.
  if (VIDEO_FILE.test(new URL(url).pathname)) {
    return { embedUrl: null, videoUrl: url };
  }

  return null;
}

export function getManifestEpisodeNumbers(anilistId) {
  return Object.keys(VIDEO_MANIFEST?.[anilistId] || {})
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b);
}

/* ---------- 2. Official-channel lookup (YouTube Data API) ---------- */

export class VideoLookupError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "VideoLookupError";
    this.code = code;
  }
}

async function ytFetch(endpoint, params) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const qs = new URLSearchParams({ ...params, key: API_KEY });
    const res = await fetch(`${YT_API}/${endpoint}?${qs}`, {
      signal: controller.signal,
    });
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const reason = body?.error?.errors?.[0]?.reason || "";

      if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
        throw new VideoLookupError(
          "quota",
          "The daily video-lookup quota has been used up. Try again tomorrow."
        );
      }

      if (res.status === 400 || res.status === 403) {
        throw new VideoLookupError(
          "config",
          "Video lookup was rejected. Check your YouTube API key, its referrer restrictions, and that YouTube Data API v3 is enabled."
        );
      }

      throw new VideoLookupError(
        "request",
        `Video lookup failed (${res.status}).`
      );
    }

    return body;
  } catch (error) {
    if (error instanceof VideoLookupError) throw error;

    if (error.name === "AbortError") {
      throw new VideoLookupError("timeout", "Video lookup timed out.");
    }

    throw new VideoLookupError(
      "network",
      "Could not reach the video lookup service."
    );
  } finally {
    clearTimeout(timer);
  }
}

function parseIsoDuration(value) {
  const m = String(value || "").match(
    /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/
  );
  if (!m) return 0;
  const [, d = 0, h = 0, min = 0, s = 0] = m.map((v) => Number(v) || 0);
  return d * 86400 + h * 3600 + min * 60 + s;
}

async function fetchCandidates(anime) {
  const query = anime.titleEnglish || anime.titleRomaji || anime.title;
  const ids = new Set();

  for (const channelId of CHANNEL_IDS) {
    const search = await ytFetch("search", {
      part: "snippet",
      type: "video",
      channelId,
      q: query,
      maxResults: "50",
      videoEmbeddable: "true",
      videoSyndicated: "true",
    });

    for (const item of search?.items || []) {
      const id = item?.id?.videoId;
      if (isYouTubeId(id)) ids.add(id);
    }
  }

  const all = [...ids];
  const candidates = [];

  for (let i = 0; i < all.length; i += 50) {
    const details = await ytFetch("videos", {
      part: "snippet,contentDetails,status",
      id: all.slice(i, i + 50).join(","),
      maxResults: "50",
    });

    for (const video of details?.items || []) {
      if (
        video?.status?.embeddable !== true ||
        video?.status?.privacyStatus !== "public" ||
        video?.snippet?.liveBroadcastContent !== "none" ||
        !CHANNEL_IDS.includes(video?.snippet?.channelId)
      ) {
        continue;
      }

      candidates.push({
        id: video.id,
        title: video.snippet.title || "",
        channelTitle: video.snippet.channelTitle || "",
        seconds: parseIsoDuration(video.contentDetails?.duration),
      });
    }
  }

  return candidates;
}

/* cache (localStorage + in-flight de-duplication) */

const inFlight = new Map();
const channelSignature = CHANNEL_IDS.join(",");

function readCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    const ttl = entry.items?.length ? HIT_TTL : MISS_TTL;

    if (
      entry.channels !== channelSignature ||
      Date.now() - entry.t > ttl ||
      !Array.isArray(entry.items)
    ) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return entry.items;
  } catch {
    return null;
  }
}

function writeCache(key, items) {
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ t: Date.now(), channels: channelSignature, items })
    );
  } catch {
    /* storage unavailable: ignore */
  }
}

function getCandidates(anime) {
  const key = anime.anilistId ?? anime.id;
  const cached = readCache(key);

  if (cached) return Promise.resolve(cached);
  if (inFlight.has(key)) return inFlight.get(key);

  const request = fetchCandidates(anime)
    .then((items) => {
      writeCache(key, items);
      return items;
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, request);
  return request;
}

export function clearVideoLookupCache() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/* strict matching: prefer "unavailable" over a wrong video */

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const seasonOf = (norm) => {
  const m =
    norm.match(/\bseason (\d+)\b/) ||
    norm.match(/\b(\d+)(?:st|nd|rd|th) season\b/) ||
    norm.match(/\bs(\d+)\b/);
  return m ? Number(m[1]) : null;
};

const stripSeason = (norm) =>
  norm
    .replace(/\bseason \d+\b/g, " ")
    .replace(/\b\d+(?:st|nd|rd|th) season\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const NOT_AN_EPISODE =
  /\b(trailer|pv|preview|teaser|recap|summary|clips?|creditless|ncop|nced|amv|reaction|review|compilation|promo|making of|behind the scenes)\b/i;
const EPISODE_RANGE = /\bepisodes?\s*\d+\s*(?:-|–|&|,|to)\s*\d+/i;
const DUB = /\bdub(?:bed)?\b/i;

function mentionsEpisode(rawTitle, number) {
  const re = new RegExp(
    `(?:\\b(?:episode|ep)\\.?\\s*|#\\s*|\\bs\\d+\\s*e|\\be)0*${number}(?!\\d)`,
    "i"
  );
  return re.test(rawTitle);
}

function matchEpisode(anime, number, candidates) {
  const expected = (anime.duration || 24) * 60;
  const minSeconds = Math.max(600, expected * 0.7);
  const maxSeconds = expected * 3;

  const variants = [anime.titleEnglish, anime.titleRomaji]
    .filter(Boolean)
    .map(normalize);

  const animeSeason = variants.map(seasonOf).find((s) => s !== null) ?? null;
  const expectedSeason = animeSeason ?? 1;

  const variantTokens = variants
    .map((v) => stripSeason(v).split(" ").filter(Boolean))
    .filter((tokens) => tokens.length);

  const matches = candidates.filter((c) => {
    if (c.seconds < minSeconds || c.seconds > maxSeconds) return false;
    if (NOT_AN_EPISODE.test(c.title) || EPISODE_RANGE.test(c.title)) {
      return false;
    }
    if (!mentionsEpisode(c.title, number)) return false;

    const norm = normalize(c.title);
    const words = new Set(norm.split(" "));

    const titleMatches = variantTokens.some((tokens) =>
      tokens.every((t) => words.has(t))
    );
    if (!titleMatches) return false;

    const candSeason = seasonOf(norm);
    if (candSeason !== null && candSeason !== expectedSeason) return false;
    if (candSeason === null && expectedSeason > 1) return false;

    return true;
  });

  if (!matches.length) return null;

  matches.sort(
    (a, b) =>
      Number(DUB.test(a.title)) - Number(DUB.test(b.title)) ||
      Math.abs(a.seconds - expected) - Math.abs(b.seconds - expected)
  );

  return matches[0];
}

/**
 * Resolve a playable, embeddable video for one episode.
 * Returns { status: "ready", source } or { status: "unavailable", reason }.
 * Throws VideoLookupError on API/network problems.
 */
export async function resolveEpisodeVideo(anime, episode) {
  if (!isYouTubeLookupConfigured) {
    return { status: "unavailable", reason: "not_configured" };
  }

  const number = Number(episode?.number);

  if (!anime || !Number.isInteger(number) || number <= 0) {
    return { status: "unavailable", reason: "no_match" };
  }

  const candidates = await getCandidates(anime);
  const match = matchEpisode(anime, number, candidates);

  if (!match) return { status: "unavailable", reason: "no_match" };

  return {
    status: "ready",
    source: {
      type: "embed",
      url: buildYouTubeEmbedUrl(match.id),
      provider: "YouTube",
      attribution: match.channelTitle,
      watchUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(
        match.id
      )}`,
      label: DUB.test(match.title) ? "English dub" : null,
    },
  };
}