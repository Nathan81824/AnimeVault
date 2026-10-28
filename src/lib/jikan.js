const ANILIST_API = "https://graphql.anilist.co";

const CACHE_DURATION = 5 * 60 * 1000;
const REQUEST_TIMEOUT = 15000;

const cache = new Map();
const pendingRequests = new Map();

const PAGE_INFO = `
  pageInfo {
    currentPage
    hasNextPage
    lastPage
    total
  }
`;

const ANIME_FIELDS = `
  id
  idMal
  title {
    romaji
    english
    native
  }
  description(asHtml: false)
  episodes
  duration
  status
  season
  seasonYear
  format
  genres
  averageScore
  meanScore
  popularity
  favourites
  trending
  isAdult
  countryOfOrigin
  source
  startDate { year month day }
  endDate { year month day }
  coverImage {
    extraLarge
    large
    medium
    color
  }
  bannerImage
  studios(isMain: true) {
    nodes {
      id
      name
      isAnimationStudio
    }
  }
  siteUrl
  trailer {
    id
    site
    thumbnail
  }
`;

// Lighter fields for recommendation cards (keeps the details query small)
const CARD_FIELDS = `
  id
  idMal
  title {
    romaji
    english
    native
  }
  episodes
  format
  genres
  averageScore
  seasonYear
  coverImage {
    extraLarge
    large
    medium
    color
  }
  siteUrl
`;

const SEARCH_QUERY = `
  query SearchAnime(
    $search: String
    $page: Int
    $perPage: Int
    $sort: [MediaSort]
    $isAdult: Boolean
  ) {
    Page(page: $page, perPage: $perPage) {
      ${PAGE_INFO}
      media(search: $search, type: ANIME, sort: $sort, isAdult: $isAdult) {
        ${ANIME_FIELDS}
      }
    }
  }
`;

const POPULAR_QUERY = `
  query PopularAnime(
    $page: Int
    $perPage: Int
    $sort: [MediaSort]
    $isAdult: Boolean
  ) {
    Page(page: $page, perPage: $perPage) {
      ${PAGE_INFO}
      media(type: ANIME, sort: $sort, isAdult: $isAdult) {
        ${ANIME_FIELDS}
      }
    }
  }
`;

const DETAILS_QUERY = `
  query AnimeDetails($id: Int) {
    Media(id: $id, type: ANIME) {
      ${ANIME_FIELDS}

      recommendations(page: 1, perPage: 12, sort: [RATING_DESC]) {
        nodes {
          mediaRecommendation {
            ${CARD_FIELDS}
          }
        }
      }

      relations {
        edges {
          relationType
          node {
            id
            type
            format
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
            }
            siteUrl
          }
        }
      }

      characters(page: 1, perPage: 8, sort: [ROLE, RELEVANCE]) {
        edges {
          role
          node {
            id
            name { full }
            image {
              large
              medium
            }
          }
        }
      }

      staff(page: 1, perPage: 8, sort: [RELEVANCE]) {
        edges {
          role
          node {
            id
            name { full }
            image {
              large
              medium
            }
          }
        }
      }
    }
  }
`;

const MAL_ID_QUERY = `
  query AnimeByMalId($idMal: Int) {
    Media(idMal: $idMal, type: ANIME) {
      ${ANIME_FIELDS}
    }
  }
`;

const TRENDING_QUERY = `
  query TrendingAnime($page: Int, $perPage: Int, $isAdult: Boolean) {
    Page(page: $page, perPage: $perPage) {
      ${PAGE_INFO}
      media(
        type: ANIME
        sort: [TRENDING_DESC, POPULARITY_DESC]
        isAdult: $isAdult
      ) {
        ${ANIME_FIELDS}
      }
    }
  }
`;

const SEASONAL_QUERY = `
  query SeasonalAnime(
    $page: Int
    $perPage: Int
    $season: MediaSeason
    $seasonYear: Int
    $isAdult: Boolean
  ) {
    Page(page: $page, perPage: $perPage) {
      ${PAGE_INFO}
      media(
        type: ANIME
        season: $season
        seasonYear: $seasonYear
        sort: [POPULARITY_DESC]
        isAdult: $isAdult
      ) {
        ${ANIME_FIELDS}
      }
    }
  }
`;

/* ---------- helpers ---------- */

const cleanText = (value) =>
  typeof value === "string" ? value.trim() : "";

// AniList can still return stray tags like <br>, so strip them
const cleanDescription = (value) =>
  cleanText(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .trim();

const safeNumber = (value, fallback = null) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const validUrl = (value) => {
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
};

const getCache = (key) => {
  const entry = cache.get(key);

  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }

  return entry.data;
};

const setCache = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });

  if (cache.size > 150) {
    const oldestKey = cache.keys().next().value;

    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }

  return data;
};

const requestAniList = async (query, variables = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(ANILIST_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(
          "Too many requests to AniList. Please wait a moment and try again."
        );
      }

      throw new Error(
        result?.errors?.[0]?.message ||
          `AniList request failed with status ${response.status}`
      );
    }

    if (result?.errors?.length) {
      throw new Error(result.errors.map((e) => e.message).join(", "));
    }

    if (!result?.data) {
      throw new Error("AniList returned no data.");
    }

    return result.data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The AniList request timed out. Please try again.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

// Cache + de-duplicate in-flight requests
const cachedRequest = async (key, query, variables, transform) => {
  const cached = getCache(key);
  if (cached) return cached;

  if (pendingRequests.has(key)) return pendingRequests.get(key);

  const request = requestAniList(query, variables)
    .then((data) => setCache(key, transform(data)))
    .finally(() => pendingRequests.delete(key));

  pendingRequests.set(key, request);
  return request;
};

/* ---------- normalizer ---------- */

export const normalizeAnime = (anime) => {
  if (!anime || typeof anime !== "object") return null;

  const titleRomaji = cleanText(anime.title?.romaji);
  const titleEnglish = cleanText(anime.title?.english);
  const titleNative = cleanText(anime.title?.native);

  const title =
    titleEnglish || titleRomaji || titleNative || "Unknown Anime";

  const studios = (anime.studios?.nodes || []).map((studio) => ({
    id: studio.id,
    name: studio.name,
    isAnimationStudio: Boolean(studio.isAnimationStudio),
  }));

  const recommendations = (anime.recommendations?.nodes || [])
    .map((item) => normalizeAnime(item?.mediaRecommendation))
    .filter(Boolean);

  const relations = (anime.relations?.edges || [])
    .filter((edge) => edge?.node)
    .map((edge) => ({
      relationType: edge.relationType,
      id: edge.node.id,
      type: edge.node.type,
      format: edge.node.format,
      title:
        edge.node.title?.english ||
        edge.node.title?.romaji ||
        edge.node.title?.native ||
        "Unknown Anime",
      titleEnglish: edge.node.title?.english || null,
      titleRomaji: edge.node.title?.romaji || null,
      image:
        validUrl(edge.node.coverImage?.large) ||
        validUrl(edge.node.coverImage?.medium),
      url: validUrl(edge.node.siteUrl),
    }));

  const characters = (anime.characters?.edges || [])
    .filter((edge) => edge?.node)
    .map((edge) => ({
      id: edge.node.id,
      name: edge.node.name?.full || "Unknown Character",
      image:
        validUrl(edge.node.image?.large) ||
        validUrl(edge.node.image?.medium),
      role: edge.role || null,
    }));

  const staff = (anime.staff?.edges || [])
    .filter((edge) => edge?.node)
    .map((edge) => ({
      id: edge.node.id,
      name: edge.node.name?.full || "Unknown Staff",
      image:
        validUrl(edge.node.image?.large) ||
        validUrl(edge.node.image?.medium),
      role: edge.role || null,
    }));

  const startDate = anime.startDate || {};
  const endDate = anime.endDate || {};

  const coverImage = {
    extraLarge: validUrl(anime.coverImage?.extraLarge),
    large: validUrl(anime.coverImage?.large),
    medium: validUrl(anime.coverImage?.medium),
    color: anime.coverImage?.color || null,
  };

  const isYouTubeTrailer =
    anime.trailer?.site?.toLowerCase() === "youtube" && anime.trailer?.id;

  const description = cleanDescription(anime.description);

  return {
    id: safeNumber(anime.id),
    anilistId: safeNumber(anime.id),
    idAniList: safeNumber(anime.id),
    malId: safeNumber(anime.idMal),
    idMal: safeNumber(anime.idMal),

    title,
    titleEnglish: titleEnglish || null,
    titleRomaji: titleRomaji || null,
    titleNative: titleNative || null,

    synopsis: description,
    description,

    episodes: safeNumber(anime.episodes),
    duration: safeNumber(anime.duration),

    status: anime.status || "UNKNOWN",
    season: anime.season || null,
    seasonYear: safeNumber(anime.seasonYear),
    format: anime.format || null,

    genres: Array.isArray(anime.genres) ? anime.genres : [],

    score: safeNumber(anime.averageScore),
    averageScore: safeNumber(anime.averageScore),
    meanScore: safeNumber(anime.meanScore),

    popularity: safeNumber(anime.popularity, 0),
    favourites: safeNumber(anime.favourites, 0),
    trending: safeNumber(anime.trending, 0),

    isAdult: Boolean(anime.isAdult),
    countryOfOrigin: anime.countryOfOrigin || null,
    source: anime.source || null,

    image:
      coverImage.extraLarge ||
      coverImage.large ||
      coverImage.medium ||
      null,

    coverImage,
    bannerImage: validUrl(anime.bannerImage),

    studios,
    studio: studios[0]?.name || "Unknown Studio",

    startDate: {
      year: safeNumber(startDate.year),
      month: safeNumber(startDate.month),
      day: safeNumber(startDate.day),
    },

    endDate: {
      year: safeNumber(endDate.year),
      month: safeNumber(endDate.month),
      day: safeNumber(endDate.day),
    },

    trailer: anime.trailer
      ? {
          id: anime.trailer.id || null,
          site: anime.trailer.site || null,
          thumbnail: validUrl(anime.trailer.thumbnail),
          url: isYouTubeTrailer
            ? `https://www.youtube.com/watch?v=${encodeURIComponent(
                anime.trailer.id
              )}`
            : null,
          embedUrl: isYouTubeTrailer
            ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
                anime.trailer.id
              )}`
            : null,
        }
      : null,

    url: validUrl(anime.siteUrl),

    recommendations,
    relations,
    characters,
    staff,
  };
};

const normalizeList = (items) =>
  Array.isArray(items) ? items.map(normalizeAnime).filter(Boolean) : [];

const normalizePage = (data) => ({
  results: normalizeList(data.Page?.media),
  pageInfo: data.Page?.pageInfo || null,
});

const getPageVariables = (options = {}) => ({
  page: Math.max(1, Math.floor(safeNumber(options.page, 1))),
  perPage: Math.min(
    50,
    Math.max(1, Math.floor(safeNumber(options.perPage, 20)))
  ),
  isAdult: false,
});

/* ---------- public API ---------- */

export const searchAnime = async (search, options = {}) => {
  const searchTerm = cleanText(search);

  if (!searchTerm) return getPopularAnime(options);

  const { page, perPage, isAdult } = getPageVariables(options);

  return cachedRequest(
    `search:${searchTerm.toLowerCase()}:${page}:${perPage}`,
    SEARCH_QUERY,
    {
      search: searchTerm,
      page,
      perPage,
      isAdult,
      sort: ["SEARCH_MATCH", "POPULARITY_DESC"],
    },
    normalizePage
  );
};

export const getPopularAnime = async (options = {}) => {
  const variables = getPageVariables(options);

  return cachedRequest(
    `popular:${variables.page}:${variables.perPage}`,
    POPULAR_QUERY,
    { ...variables, sort: ["POPULARITY_DESC"] },
    normalizePage
  );
};

export const getTrendingAnime = async (options = {}) => {
  const variables = getPageVariables(options);

  return cachedRequest(
    `trending:${variables.page}:${variables.perPage}`,
    TRENDING_QUERY,
    variables,
    normalizePage
  );
};

export const getSeasonalAnime = async (season, year, options = {}) => {
  const variables = getPageVariables(options);
  const selectedSeason = String(season || "").toUpperCase();
  const selectedYear = safeNumber(year);

  if (!["WINTER", "SPRING", "SUMMER", "FALL"].includes(selectedSeason)) {
    throw new Error("Invalid anime season.");
  }

  if (!selectedYear || selectedYear < 1900 || selectedYear > 2100) {
    throw new Error("Invalid anime season year.");
  }

  return cachedRequest(
    `seasonal:${selectedSeason}:${selectedYear}:${variables.page}:${variables.perPage}`,
    SEASONAL_QUERY,
    { ...variables, season: selectedSeason, seasonYear: selectedYear },
    normalizePage
  );
};

export const getAnimeDetails = async (id) => {
  const anilistId = safeNumber(id);

  if (!Number.isInteger(anilistId) || anilistId <= 0) {
    throw new Error("A valid AniList anime ID is required.");
  }

  return cachedRequest(
    `details:${anilistId}`,
    DETAILS_QUERY,
    { id: anilistId },
    (data) => {
      const anime = normalizeAnime(data.Media);

      if (!anime) throw new Error("Anime not found.");

      return anime;
    }
  );
};

export const getAnimeByMalId = async (malId) => {
  const idMal = safeNumber(malId);

  if (!Number.isInteger(idMal) || idMal <= 0) {
    throw new Error("A valid MyAnimeList ID is required.");
  }

  return cachedRequest(
    `mal:${idMal}`,
    MAL_ID_QUERY,
    { idMal },
    (data) => {
      const anime = normalizeAnime(data.Media);

      if (!anime) {
        throw new Error("No anime was found for that MyAnimeList ID.");
      }

      return anime;
    }
  );
};

export const getAnimeRecommendations = async (id) => {
  const anime = await getAnimeDetails(id);
  return anime.recommendations || [];
};

export const clearAnimeCache = () => {
  cache.clear();
  pendingRequests.clear();
};

export const clearAnimeCacheForId = (id) => {
  const anilistId = safeNumber(id);

  if (!anilistId) return;

  cache.delete(`details:${anilistId}`);
  pendingRequests.delete(`details:${anilistId}`);
};

export default {
  searchAnime,
  getPopularAnime,
  getTrendingAnime,
  getSeasonalAnime,
  getAnimeDetails,
  getAnimeByMalId,
  getAnimeRecommendations,
  clearAnimeCache,
  clearAnimeCacheForId,
  normalizeAnime,
};