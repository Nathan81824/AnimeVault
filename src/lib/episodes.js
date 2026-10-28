import {
  getYouTubeEmbedUrl,
  getYouTubeVideoId,
  getManifestSource,
  getManifestEpisodeNumbers,
  safeHttpUrl,
} from "./videoSources";

const ANILIST_API = "https://graphql.anilist.co";

const CACHE_DURATION = 5 * 60 * 1000;
const REQUEST_TIMEOUT = 15000;

const cache = new Map();
const pendingRequests = new Map();

const EPISODES_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      episodes
      title {
        romaji
        english
      }
      trailer {
        id
        site
        thumbnail
      }
      streamingEpisodes {
        title
        thumbnail
        url
        site
      }
      externalLinks {
        site
        url
        type
      }
    }
  }
`;

function isValidId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0;
}

function normalizeEpisodeTitle(title, number) {
  const fallback = `Episode ${number}`;

  if (typeof title !== "string" || !title.trim()) {
    return fallback;
  }

  const cleaned = title
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return fallback;

  const escapedNumber = String(number).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const repeatedPrefix = new RegExp(
    `^(?:episode\\s+${escapedNumber}\\s*[-:–—]?\\s*){2,}`,
    "i"
  );

  return cleaned.replace(repeatedPrefix, `Episode ${number} - `);
}

// AniList titles look like "Episode 1 - Ryomen Sukuna". Prefer the real
// number over array position, which can be wrong if entries are unordered.
function parseEpisodeNumber(title) {
  if (typeof title !== "string") return null;

  const match = title.match(/\b(?:episode|ep)\.?\s*(\d+)\b/i);
  const number = match ? Number(match[1]) : null;

  return Number.isInteger(number) && number > 0 ? number : null;
}

function normalizeExternalLink(link) {
  const url = safeHttpUrl(link?.url);

  if (!url) return null;

  return {
    site: link?.site || "Streaming service",
    url,
    type: link?.type || null,
  };
}

function normalizeStreamingEpisode(episode, fallbackNumber, anilistId) {
  const number = parseEpisodeNumber(episode?.title) ?? fallbackNumber;
  const url = safeHttpUrl(episode?.url);

  // Source priority: your verified catalog, then a YouTube URL listed by AniList.
  const managed = getManifestSource(anilistId, number);
  const embedUrl = managed?.embedUrl || getYouTubeEmbedUrl(url);
  const videoUrl = managed?.videoUrl || null;

  let sourceType = "external";
  if (managed) sourceType = "catalog";
  else if (embedUrl) sourceType = "youtube";

  return {
    id: `anilist-episode-${number}`,
    number,
    title: normalizeEpisodeTitle(episode?.title, number),
    thumbnail: safeHttpUrl(episode?.thumbnail),
    url,
    embedUrl,
    videoUrl,
    playableInVault: Boolean(embedUrl || videoUrl),
    sourceType,
    site: episode?.site || null,
  };
}

// Used only when AniList lists no episodes but you have catalog videos.
function buildManifestEpisodes(anilistId) {
  return getManifestEpisodeNumbers(anilistId)
    .map((number) => {
      const source = getManifestSource(anilistId, number);
      if (!source) return null;

      return {
        id: `catalog-episode-${number}`,
        number,
        title: `Episode ${number}`,
        thumbnail: null,
        url: null,
        embedUrl: source.embedUrl,
        videoUrl: source.videoUrl,
        playableInVault: true,
        sourceType: "catalog",
        site: null,
      };
    })
    .filter(Boolean);
}

function buildTrailerEpisode(trailer, animeTitle) {
  if (
    !trailer ||
    String(trailer.site || "").toLowerCase() !== "youtube" ||
    !trailer.id
  ) {
    return null;
  }

  const embedUrl = getYouTubeEmbedUrl(
    `https://www.youtube.com/watch?v=${encodeURIComponent(trailer.id)}`
  );

  if (!embedUrl) return null;

  return {
    id: "anilist-trailer",
    number: 1,
    title: `${animeTitle} - Official Trailer`,
    thumbnail: safeHttpUrl(trailer.thumbnail),
    url: `https://www.youtube.com/watch?v=${encodeURIComponent(trailer.id)}`,
    embedUrl,
    videoUrl: null,
    playableInVault: true,
    sourceType: "trailer",
    site: "YouTube",
  };
}

async function fetchAnimeEpisodeInfo(anilistId) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(ANILIST_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: EPISODES_QUERY,
        variables: { id: anilistId },
      }),
      signal: controller.signal,
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        result?.errors?.[0]?.message ||
          `AniList request failed (${response.status}).`
      );
    }

    if (result?.errors?.length) {
      throw new Error(
        result.errors[0]?.message || "AniList returned an error."
      );
    }

    const anime = result?.data?.Media;

    if (!anime) {
      throw new Error("Anime information was not found on AniList.");
    }

    const animeTitle =
      anime.title?.english || anime.title?.romaji || "Anime";

    const externalLinks = (anime.externalLinks || [])
      .map(normalizeExternalLink)
      .filter(Boolean);

    const streamingLinks = externalLinks.filter(
      (link) => String(link.type || "").toUpperCase() === "STREAMING"
    );

    const seen = new Set();

    let episodes = (
      Array.isArray(anime.streamingEpisodes) ? anime.streamingEpisodes : []
    )
      .map((episode, index) =>
        normalizeStreamingEpisode(episode, index + 1, anilistId)
      )
      .sort((a, b) => a.number - b.number)
      .filter((episode) => {
        if (seen.has(episode.number)) return false;
        seen.add(episode.number);
        return true;
      });

    if (episodes.length === 0) {
      episodes = buildManifestEpisodes(anilistId);
    }

    if (episodes.length === 0) {
      const trailerEpisode = buildTrailerEpisode(anime.trailer, animeTitle);
      if (trailerEpisode) episodes = [trailerEpisode];
    }

    return {
      anilistId: anime.id,
      animeTitle,
      totalEpisodes: Number.isInteger(anime.episodes)
        ? anime.episodes
        : null,
      episodes,
      externalLinks,
      streamingLinks,
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The AniList request timed out. Please try again.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getAnimeEpisodeInfo(anilistId) {
  if (!isValidId(anilistId)) {
    throw new Error("A valid numeric AniList ID is required.");
  }

  const id = Number(anilistId);
  const cached = cache.get(id);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  if (pendingRequests.has(id)) {
    return pendingRequests.get(id);
  }

  const request = fetchAnimeEpisodeInfo(id)
    .then((data) => {
      cache.set(id, { data, timestamp: Date.now() });
      return data;
    })
    .finally(() => {
      pendingRequests.delete(id);
    });

  pendingRequests.set(id, request);

  return request;
}

export async function getEpisodes(anilistId) {
  const info = await getAnimeEpisodeInfo(anilistId);
  return info.episodes;
}

export async function getOfficialStreamingLinks(anilistId) {
  const info = await getAnimeEpisodeInfo(anilistId);
  return info.streamingLinks;
}

export function clearEpisodeCache() {
  cache.clear();
  pendingRequests.clear();
}

export function clearEpisodeCacheForId(anilistId) {
  if (!isValidId(anilistId)) return;

  cache.delete(Number(anilistId));
  pendingRequests.delete(Number(anilistId));
}

export { normalizeEpisodeTitle, getYouTubeVideoId, getYouTubeEmbedUrl };

export default {
  getAnimeEpisodeInfo,
  getEpisodes,
  getOfficialStreamingLinks,
  clearEpisodeCache,
  clearEpisodeCacheForId,
  getYouTubeVideoId,
  getYouTubeEmbedUrl,
  normalizeEpisodeTitle,
};