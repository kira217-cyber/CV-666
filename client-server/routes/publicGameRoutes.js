import express from "express";
import axios from "axios";
import mongoose from "mongoose";

import Game from "../models/Game.js";
import Category from "../models/Category.js";
import GameProvider from "../models/GameProvider.js";

const router = express.Router();

const ORACLE_GAME_API_BASE = "https://oraclegames.net/api/game";

const ORACLE_GAME_DATA_KEY = process.env.ORACLE_GAME_DATA_KEY || "1189baca156e1bbbecc3b26651a63565";

const validObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const toBool = (value) => {
  return value === true || value === "true" || value === "1" || value === 1;
};

const getFileUrl = (req, path = "") => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  return `${req.protocol}://${req.get("host")}${
    path.startsWith("/") ? path : `/${path}`
  }`;
};

const getOracleImage = (oracleGame = {}, type = "thumbnail") => {
  if (type === "original") {
    return oracleGame.original || oracleGame.images?.original || "";
  }

  if (type === "height") {
    return oracleGame.height || oracleGame.images?.height || "";
  }

  return (
    oracleGame.thumbnail ||
    oracleGame.images?.thumbnail ||
    oracleGame.original ||
    oracleGame.images?.original ||
    ""
  );
};

const normalizeOracleGames = (data) => {
  const games = Array.isArray(data?.games) ? data.games : [];

  const map = new Map();

  games.forEach((game) => {
    const id = String(game?.game_uid || game?.gameUId || "").trim();

    if (id) {
      map.set(id, {
        gameId: id,
        gameName: game.name || "",
        provider: game.provider || "",
        category: game.category || "",
        thumbnail: game.thumbnail || "",
        height: game.height || "",
        original: game.original || "",
        images: {
          thumbnail: game.thumbnail || "",
          height: game.height || "",
          original: game.original || "",
        },
      });
    }
  });

  return map;
};

const fetchOracleGamesByProvider = async (providerId) => {
  try {
    const { data } = await axios.get(`${ORACLE_GAME_API_BASE}/${providerId}`, {
      headers: {
        "x-oraclegamedata-key": ORACLE_GAME_DATA_KEY,
      },
      timeout: 30000,
    });

    return normalizeOracleGames(data);
  } catch {
    return new Map();
  }
};

const formatGame = async (req, game, oracleMap) => {
  const obj = game.toObject ? game.toObject() : game;

  const oracleGame = oracleMap.get(String(obj.gameId)) || {};
  const customImage = obj.image ? getFileUrl(req, obj.image) : "";
  const oracleImage = getOracleImage(oracleGame, obj.oracleImageType);

  return {
    ...obj,

    gameName: oracleGame.gameName || obj.gameId,
    gameImage: customImage || oracleImage || "/placeholder-game.png",

    oracle: {
      name: oracleGame.gameName || "",
      image: oracleImage || "",
      provider: oracleGame.provider || "",
      category: oracleGame.category || "",
    },
  };
};

/* ======================================================
   PUBLIC GAMES
   GET /api/public-games
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
      page = "",
      limit = "",
    } = req.query || {};

    const query = {};

    if (status) query.status = status;

    if (categoryId) {
      if (!validObjectId(categoryId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid categoryId",
        });
      }

      query.categoryId = categoryId;
    }

    if (providerDbId) {
      if (!validObjectId(providerDbId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid providerDbId",
        });
      }

      query.providerDbId = providerDbId;
    }

    if (isHot !== "") query.isHot = toBool(isHot);
    if (isHome !== "") query.isHome = toBool(isHome);
    if (isJackpot !== "") query.isJackpot = toBool(isJackpot);

    let gameQuery = Game.find(query)
      .populate("categoryId")
      .populate("providerDbId")
      .sort({ createdAt: 1 });

    const hasPagination = page !== "" || limit !== "";

    let total = 0;
    let pageNum = 1;
    let limitNum = 0;

    if (hasPagination) {
      pageNum = Math.max(Number(page) || 1, 1);
      limitNum = Math.max(Number(limit) || 30, 1);

      total = await Game.countDocuments(query);

      gameQuery = gameQuery.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const games = await gameQuery;

    const providerCodes = [
      ...new Set(
        games
          .map((game) => game?.providerDbId?.providerId)
          .filter(Boolean)
          .map((item) => String(item).toUpperCase()),
      ),
    ];

    const oracleMaps = await Promise.all(
      providerCodes.map(async (providerId) => ({
        providerId,
        map: await fetchOracleGamesByProvider(providerId),
      })),
    );

    const oracleMapByProvider = new Map();

    oracleMaps.forEach((item) => {
      oracleMapByProvider.set(item.providerId, item.map);
    });

    const formattedGames = await Promise.all(
      games.map((game) => {
        const providerId = String(
          game?.providerDbId?.providerId || "",
        ).toUpperCase();
        const oracleMap = oracleMapByProvider.get(providerId) || new Map();

        return formatGame(req, game, oracleMap);
      }),
    );

    return res.json({
      success: true,
      data: hasPagination
        ? {
            games: formattedGames,
            meta: {
              page: pageNum,
              limit: limitNum,
              total,
              totalPages: Math.ceil(total / limitNum) || 1,
            },
          }
        : formattedGames,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

/* ======================================================
   PUBLIC ACTIVE CATEGORIES
   GET /api/public-games/categories/active
====================================================== */

router.get("/categories/active", async (req, res) => {
  try {
    const categories = await Category.find({
      isActive: true,
    }).sort({ createdAt: 1 });

    return res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

/* ======================================================
   PUBLIC ACTIVE PROVIDERS
   GET /api/public-games/providers/active?categoryId=
====================================================== */

router.get("/providers/active", async (req, res) => {
  try {
    const { categoryId = "" } = req.query || {};

    const query = {
      status: "active",
    };

    if (categoryId) query.categoryId = categoryId;

    const providers = await GameProvider.find(query)
      .populate("categoryId")
      .sort({ createdAt: 1 });

    return res.json({
      success: true,
      data: providers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

export default router;
