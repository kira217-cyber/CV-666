import express from "express";
import axios from "axios";
import mongoose from "mongoose";

import Game from "../models/Game.js";
import Category from "../models/Category.js";
import GameProvider from "../models/GameProvider.js";

const router = express.Router();

/* ======================================================
   ORACLE CONFIGURATION
====================================================== */

const ORACLE_GAME_API_BASE = "https://oraclegames.net/api/game";

const ORACLE_GAME_DATA_KEY =
  process.env.ORACLE_GAME_DATA_KEY ||
  "1189baca156e1bbbecc3b26651a63565";

/* ======================================================
   PAGINATION CONFIGURATION
====================================================== */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/* ======================================================
   CACHE CONFIGURATION
====================================================== */

const ORACLE_CACHE_TTL = 10 * 60 * 1000;
const PUBLIC_LIST_CACHE_TTL = 5 * 60 * 1000;

const oracleProviderCache = new Map();
const oraclePendingRequests = new Map();

let categoryCache = {
  data: null,
  expiresAt: 0,
};

const providerCache = new Map();

/* ======================================================
   HELPERS
====================================================== */

const validObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const toBool = (value) => {
  return (
    value === true ||
    value === "true" ||
    value === "1" ||
    value === 1
  );
};

const getPositiveInteger = (value, fallback) => {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return parsedValue;
};

const getPagination = (page, limit) => {
  const pageNum = getPositiveInteger(page, DEFAULT_PAGE);

  const requestedLimit = getPositiveInteger(
    limit,
    DEFAULT_LIMIT,
  );

  const limitNum = Math.min(requestedLimit, MAX_LIMIT);

  return {
    pageNum,
    limitNum,
    skip: (pageNum - 1) * limitNum,
  };
};

const getFileUrl = (req, path = "") => {
  if (!path) return "";

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${req.protocol}://${req.get("host")}${
    path.startsWith("/") ? path : `/${path}`
  }`;
};

const getOracleImage = (
  oracleGame = {},
  type = "thumbnail",
) => {
  if (type === "original") {
    return (
      oracleGame.original ||
      oracleGame.images?.original ||
      ""
    );
  }

  if (type === "height") {
    return (
      oracleGame.height ||
      oracleGame.images?.height ||
      ""
    );
  }

  return (
    oracleGame.thumbnail ||
    oracleGame.images?.thumbnail ||
    oracleGame.original ||
    oracleGame.images?.original ||
    ""
  );
};

/* ======================================================
   ORACLE DATA NORMALIZER
====================================================== */

const normalizeOracleGames = (data) => {
  const games = Array.isArray(data?.games)
    ? data.games
    : [];

  const map = new Map();

  games.forEach((game) => {
    const id = String(
      game?.game_uid ||
        game?.gameUId ||
        game?.gameId ||
        "",
    ).trim();

    if (!id) return;

    map.set(id, {
      gameId: id,

      gameName:
        game?.name ||
        game?.gameName ||
        "",

      provider:
        game?.provider ||
        game?.provider_name ||
        "",

      category:
        game?.category ||
        game?.category_name ||
        "",

      thumbnail:
        game?.thumbnail ||
        game?.images?.thumbnail ||
        "",

      height:
        game?.height ||
        game?.images?.height ||
        "",

      original:
        game?.original ||
        game?.images?.original ||
        "",

      images: {
        thumbnail:
          game?.thumbnail ||
          game?.images?.thumbnail ||
          "",

        height:
          game?.height ||
          game?.images?.height ||
          "",

        original:
          game?.original ||
          game?.images?.original ||
          "",
      },
    });
  });

  return map;
};

/* ======================================================
   FETCH ORACLE GAMES WITH CACHE
====================================================== */

const fetchOracleGamesByProvider = async (providerId) => {
  const normalizedProviderId = String(
    providerId || "",
  )
    .trim()
    .toUpperCase();

  if (!normalizedProviderId) {
    return new Map();
  }

  const now = Date.now();

  const cachedItem = oracleProviderCache.get(
    normalizedProviderId,
  );

  if (
    cachedItem?.data &&
    cachedItem.expiresAt > now
  ) {
    return cachedItem.data;
  }

  /*
   * একই provider-এর জন্য একই সময়ে একাধিক request এলে
   * একটি Oracle request-ই execute হবে।
   */
  if (
    oraclePendingRequests.has(
      normalizedProviderId,
    )
  ) {
    return oraclePendingRequests.get(
      normalizedProviderId,
    );
  }

  const requestPromise = (async () => {
    try {
      const { data } = await axios.get(
        `${ORACLE_GAME_API_BASE}/${encodeURIComponent(
          normalizedProviderId,
        )}`,
        {
          headers: {
            "x-oraclegamedata-key":
              ORACLE_GAME_DATA_KEY,
          },

          timeout: 15000,
        },
      );

      const normalizedGames =
        normalizeOracleGames(data);

      oracleProviderCache.set(
        normalizedProviderId,
        {
          data: normalizedGames,
          expiresAt:
            Date.now() + ORACLE_CACHE_TTL,
        },
      );

      return normalizedGames;
    } catch (error) {
      console.error(
        `Oracle games fetch failed for provider ${normalizedProviderId}:`,
        error?.response?.data ||
          error?.message ||
          error,
      );

      /*
       * API fail করলে expired cache থাকলেও সেটি ব্যবহার হবে।
       */
      if (cachedItem?.data) {
        return cachedItem.data;
      }

      return new Map();
    } finally {
      oraclePendingRequests.delete(
        normalizedProviderId,
      );
    }
  })();

  oraclePendingRequests.set(
    normalizedProviderId,
    requestPromise,
  );

  return requestPromise;
};

/* ======================================================
   FORMAT GAME
====================================================== */

const formatGame = (req, game, oracleMap) => {
  const oracleGame =
    oracleMap.get(String(game?.gameId || "")) ||
    {};

  const customImage = game?.image
    ? getFileUrl(req, game.image)
    : "";

  const oracleImage = getOracleImage(
    oracleGame,
    game?.oracleImageType,
  );

  return {
    ...game,

    gameName:
      oracleGame?.gameName ||
      game?.name ||
      game?.gameId ||
      "Game",

    gameImage:
      customImage ||
      oracleImage ||
      "/placeholder-game.png",

    oracle: {
      name: oracleGame?.gameName || "",
      image: oracleImage || "",
      provider: oracleGame?.provider || "",
      category: oracleGame?.category || "",
    },
  };
};

/* ======================================================
   PUBLIC GAMES
   GET /api/public-games

   Example:
   /api/public-games?page=1&limit=50
   /api/public-games?isHot=true&page=1&limit=50
   /api/public-games?categoryId=ID&page=1&limit=50
====================================================== */

router.get("/", async (req, res) => {
  try {
    const {
      categoryId = "",
      providerDbId = "",
      status = "active",
      isHot = "",
      isHome = "",
      isJackpot = "",
      page = DEFAULT_PAGE,
      limit = DEFAULT_LIMIT,
    } = req.query || {};

    const query = {};

    /*
     * Status filter
     */
    if (status) {
      query.status = String(status).trim();
    }

    /*
     * Category filter
     */
    if (categoryId) {
      if (!validObjectId(categoryId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid categoryId",
        });
      }

      query.categoryId = categoryId;
    }

    /*
     * Provider filter
     */
    if (providerDbId) {
      if (!validObjectId(providerDbId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid providerDbId",
        });
      }

      query.providerDbId = providerDbId;
    }

    /*
     * Boolean filters
     */
    if (isHot !== "") {
      query.isHot = toBool(isHot);
    }

    if (isHome !== "") {
      query.isHome = toBool(isHome);
    }

    if (isJackpot !== "") {
      query.isJackpot = toBool(isJackpot);
    }

    const {
      pageNum,
      limitNum,
      skip,
    } = getPagination(page, limit);

    /*
     * Count এবং game query parallel execute হবে।
     */
    const [total, games] = await Promise.all([
      Game.countDocuments(query),

      Game.find(query)
        .populate({
          path: "categoryId",
        })
        .populate({
          path: "providerDbId",
        })
        .sort({
          createdAt: 1,
          _id: 1,
        })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    /*
     * শুধু current 50 games-এর provider ID সংগ্রহ হবে।
     */
    const providerCodes = [
      ...new Set(
        games
          .map(
            (game) =>
              game?.providerDbId?.providerId,
          )
          .filter(Boolean)
          .map((providerId) =>
            String(providerId)
              .trim()
              .toUpperCase(),
          ),
      ),
    ];

    /*
     * সব প্রয়োজনীয় Oracle provider parallel fetch হবে।
     * Cache থাকলে Oracle API call হবে না।
     */
    const oracleProviderResults =
      await Promise.all(
        providerCodes.map(
          async (providerId) => ({
            providerId,

            gamesMap:
              await fetchOracleGamesByProvider(
                providerId,
              ),
          }),
        ),
      );

    const oracleMapByProvider = new Map();

    oracleProviderResults.forEach(
      ({ providerId, gamesMap }) => {
        oracleMapByProvider.set(
          providerId,
          gamesMap,
        );
      },
    );

    const formattedGames = games.map((game) => {
      const providerId = String(
        game?.providerDbId?.providerId || "",
      )
        .trim()
        .toUpperCase();

      const oracleMap =
        oracleMapByProvider.get(providerId) ||
        new Map();

      return formatGame(
        req,
        game,
        oracleMap,
      );
    });

    const totalPages = Math.max(
      Math.ceil(total / limitNum),
      1,
    );

    return res.status(200).json({
      success: true,

      data: {
        games: formattedGames,

        meta: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,

          hasNextPage:
            pageNum < totalPages,

          hasPreviousPage:
            pageNum > 1,

          nextPage:
            pageNum < totalPages
              ? pageNum + 1
              : null,

          previousPage:
            pageNum > 1
              ? pageNum - 1
              : null,
        },
      },
    });
  } catch (error) {
    console.error(
      "Public games route error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message || "Server error",
    });
  }
});

/* ======================================================
   PUBLIC ACTIVE CATEGORIES
   GET /api/public-games/categories/active
====================================================== */

router.get(
  "/categories/active",
  async (req, res) => {
    try {
      const now = Date.now();

      /*
       * Category cache valid থাকলে database query হবে না।
       */
      if (
        categoryCache.data &&
        categoryCache.expiresAt > now
      ) {
        return res.status(200).json({
          success: true,
          data: categoryCache.data,
        });
      }

      const categories = await Category.find({
        isActive: true,
      })
        .sort({
          order: 1,
          createdAt: 1,
          _id: 1,
        })
        .lean();

      categoryCache = {
        data: categories,
        expiresAt:
          Date.now() +
          PUBLIC_LIST_CACHE_TTL,
      };

      return res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error(
        "Public categories route error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message || "Server error",
      });
    }
  },
);

/* ======================================================
   PUBLIC ACTIVE PROVIDERS
   GET /api/public-games/providers/active
   GET /api/public-games/providers/active?categoryId=ID
====================================================== */

router.get(
  "/providers/active",
  async (req, res) => {
    try {
      const {
        categoryId = "",
      } = req.query || {};

      if (
        categoryId &&
        !validObjectId(categoryId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid categoryId",
        });
      }

      const cacheKey = categoryId
        ? String(categoryId)
        : "all";

      const now = Date.now();

      const cachedProviders =
        providerCache.get(cacheKey);

      /*
       * Provider cache valid থাকলে database query হবে না।
       */
      if (
        cachedProviders?.data &&
        cachedProviders.expiresAt > now
      ) {
        return res.status(200).json({
          success: true,
          data: cachedProviders.data,
        });
      }

      const query = {
        status: "active",
      };

      if (categoryId) {
        query.categoryId = categoryId;
      }

      const providers =
        await GameProvider.find(query)
          .populate({
            path: "categoryId",
          })
          .sort({
            order: 1,
            createdAt: 1,
            _id: 1,
          })
          .lean();

      providerCache.set(cacheKey, {
        data: providers,
        expiresAt:
          Date.now() +
          PUBLIC_LIST_CACHE_TTL,
      });

      return res.status(200).json({
        success: true,
        data: providers,
      });
    } catch (error) {
      console.error(
        "Public providers route error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message || "Server error",
      });
    }
  },
);

export default router;