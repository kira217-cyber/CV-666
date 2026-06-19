import express from "express";
import mongoose from "mongoose";
import axios from "axios";
import fs from "fs";
import path from "path";

import Game from "../models/Game.js";
import Category from "../models/Category.js";
import GameProvider from "../models/GameProvider.js";
import upload from "../config/multer.js";

const router = express.Router();

const ORACLE_GAME_API_BASE = "https://oraclegames.net/api/game";

const ORACLE_GAME_DATA_KEY =
  process.env.ORACLE_GAME_DATA_KEY || "1189baca156e1bbbecc3b26651a63565";

const FLAG_FIELDS = ["isHot", "isHome", "isJackpot"];

const VALID_ORACLE_IMAGE_TYPES = ["thumbnail", "height", "original"];

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const cleanText = (value = "") => String(value || "").trim();

const cleanProviderId = (value = "") => cleanText(value).toUpperCase();

const toBool = (value) => {
  return value === true || value === "true" || value === "1" || value === 1;
};

const cleanOracleImageType = (value = "") => {
  if (VALID_ORACLE_IMAGE_TYPES.includes(value)) return value;
  return "thumbnail";
};

const filePath = (file) => {
  if (!file) return "";
  return `/${file.path.replace(/\\/g, "/")}`;
};

const deleteFile = (filePath = "") => {
  try {
    if (!filePath) return;
    if (String(filePath).startsWith("http")) return;

    const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;

    const fullPath = path.join(process.cwd(), cleanPath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.log("Game image delete error:", error.message);
  }
};

const buildFileUrl = (req, filePath = "") => {
  if (!filePath) return "";
  if (String(filePath).startsWith("http")) return filePath;

  return `${req.protocol}://${req.get("host")}${
    filePath.startsWith("/") ? filePath : `/${filePath}`
  }`;
};

const formatGame = (req, game) => {
  const obj = game.toObject ? game.toObject() : game;

  return {
    ...obj,
    imageUrl: obj.image ? buildFileUrl(req, obj.image) : "",
  };
};

const applyFlags = (target, source = {}) => {
  FLAG_FIELDS.forEach((field) => {
    if (source[field] !== undefined) {
      target[field] = toBool(source[field]);
    }
  });
};

const normalizeOracleGames = (data) => {
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.games)
      ? data.games
      : Array.isArray(data?.data?.games)
        ? data.data.games
        : Array.isArray(data?.data)
          ? data.data
          : [];

  return list
    .filter(
      (game) => game?.game_uid || game?.gameUId || game?.gameId || game?.id,
    )
    .map((game) => ({
      name:
        game.name ||
        game.gameName ||
        game.title ||
        game.game_code ||
        game.gameCode ||
        "",
      gameId: cleanText(
        game.game_uid ||
          game.gameUId ||
          game.gameId ||
          game.gameID ||
          game.id ||
          game._id ||
          "",
      ),
      game_uid: cleanText(
        game.game_uid ||
          game.gameUId ||
          game.gameId ||
          game.gameID ||
          game.id ||
          game._id ||
          "",
      ),
      provider: game.provider || "",
      category: game.category || "",
      status: game.status,
      original:
        game.original ||
        game.images?.original ||
        game.raw?.original ||
        game.image ||
        game.imageUrl ||
        "",
      height:
        game.height ||
        game.images?.height ||
        game.raw?.height ||
        game.image ||
        game.imageUrl ||
        "",
      thumbnail:
        game.thumbnail ||
        game.images?.thumbnail ||
        game.raw?.thumbnail ||
        game.image ||
        game.img ||
        game.icon ||
        game.imageUrl ||
        "",
      raw: game,
    }));
};

/* ======================================================
   FETCH ORACLE GAMES BY PROVIDER ID
   GET /api/games/oracle/:providerId
====================================================== */

router.get("/oracle/:providerId", async (req, res) => {
  try {
    const providerId = cleanProviderId(req.params.providerId);

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "providerId is required",
      });
    }

    const urls = [
      `${ORACLE_GAME_API_BASE}/${providerId}`,
      `https://api.oraclegames.live/api/providers/${providerId}`,
    ];

    let response = null;
    let lastError = null;

    for (const url of urls) {
      try {
        response = await axios.get(url, {
          headers: {
            "x-oraclegamedata-key": ORACLE_GAME_DATA_KEY,
            "x-api-key": ORACLE_GAME_DATA_KEY,
          },
          timeout: 30000,
        });

        if (response) break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!response) {
      return res.status(500).json({
        success: false,
        message:
          lastError?.response?.data?.message ||
          lastError?.message ||
          "Failed to fetch Oracle games",
      });
    }

    const games = normalizeOracleGames(response.data);

    return res.json({
      success: true,
      message: "Oracle games fetched successfully",
      data: {
        provider: response.data?.provider || providerId,
        games,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error?.response?.data?.message ||
        error.message ||
        "Failed to fetch Oracle games",
    });
  }
});

/* ======================================================
   CREATE GAME
   POST /api/games
====================================================== */

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const {
      categoryId,
      providerDbId,
      gameId,
      gameUId,
      oracleImageType,
      status,
    } = req.body || {};

    if (!categoryId || !isValidObjectId(categoryId)) {
      if (req.file) deleteFile(filePath(req.file));

      return res.status(400).json({
        success: false,
        message: "Valid categoryId is required",
      });
    }

    if (!providerDbId || !isValidObjectId(providerDbId)) {
      if (req.file) deleteFile(filePath(req.file));

      return res.status(400).json({
        success: false,
        message: "Valid providerDbId is required",
      });
    }

    const finalGameId = cleanText(gameId || gameUId);

    if (!finalGameId) {
      if (req.file) deleteFile(filePath(req.file));

      return res.status(400).json({
        success: false,
        message: "Game ID is required",
      });
    }

    const category = await Category.findById(categoryId);

    if (!category) {
      if (req.file) deleteFile(filePath(req.file));

      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const provider = await GameProvider.findOne({
      _id: providerDbId,
      categoryId,
    });

    if (!provider) {
      if (req.file) deleteFile(filePath(req.file));

      return res.status(404).json({
        success: false,
        message: "Provider not found under this category",
      });
    }

    const exists = await Game.findOne({
      providerDbId,
      gameId: finalGameId,
    });

    if (exists) {
      if (req.file) deleteFile(filePath(req.file));

      return res.status(409).json({
        success: false,
        message: "This game already exists in this provider",
      });
    }

    const payload = {
      categoryId,
      providerDbId,
      gameId: finalGameId,
      oracleImageType: cleanOracleImageType(oracleImageType),
      image: req.file ? filePath(req.file) : "",
      status: status === "inactive" ? "inactive" : "active",
    };

    applyFlags(payload, req.body);

    const game = await Game.create(payload);

    const populatedGame = await Game.findById(game._id)
      .populate("categoryId")
      .populate("providerDbId");

    return res.status(201).json({
      success: true,
      message: "Game created successfully",
      data: formatGame(req, populatedGame),
    });
  } catch (error) {
    if (req.file) deleteFile(filePath(req.file));

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This game already exists in this provider",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

/* ======================================================
   GET ALL GAMES
   GET /api/games
====================================================== */

router.get("/", async (req, res) => {
  try {
    const {
      categoryId = "",
      providerDbId = "",
      status = "",
      gameId = "",
      oracleImageType = "",
      page = "",
      limit = "",
    } = req.query || {};

    const query = {};

    if (categoryId) {
      if (!isValidObjectId(categoryId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid categoryId",
        });
      }

      query.categoryId = categoryId;
    }

    if (providerDbId) {
      if (!isValidObjectId(providerDbId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid providerDbId",
        });
      }

      query.providerDbId = providerDbId;
    }

    if (status) query.status = status;

    if (gameId) {
      query.gameId = {
        $regex: gameId,
        $options: "i",
      };
    }

    if (oracleImageType && VALID_ORACLE_IMAGE_TYPES.includes(oracleImageType)) {
      query.oracleImageType = oracleImageType;
    }

    FLAG_FIELDS.forEach((field) => {
      if (req.query[field] !== undefined && req.query[field] !== "") {
        query[field] = toBool(req.query[field]);
      }
    });

    const hasPagination = page !== "" || limit !== "";

    if (hasPagination) {
      const pageNum = Math.max(Number(page) || 1, 1);
      const limitNum = Math.max(Number(limit) || 50, 1);
      const skip = (pageNum - 1) * limitNum;

      const [games, total] = await Promise.all([
        Game.find(query)
          .populate("categoryId")
          .populate("providerDbId")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),

        Game.countDocuments(query),
      ]);

      return res.json({
        success: true,
        message: "Games fetched successfully",
        data: {
          games: games.map((item) => formatGame(req, item)),
          meta: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum) || 1,
          },
        },
      });
    }

    const games = await Game.find(query)
      .populate("categoryId")
      .populate("providerDbId")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: games.map((item) => formatGame(req, item)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

/* ======================================================
   GET ACTIVE GAMES
   GET /api/games/active
====================================================== */

router.get("/active", async (req, res) => {
  try {
    const {
      categoryId = "",
      providerDbId = "",
      gameId = "",
      oracleImageType = "",
    } = req.query || {};

    const query = {
      status: "active",
    };

    if (categoryId) query.categoryId = categoryId;
    if (providerDbId) query.providerDbId = providerDbId;

    if (gameId) {
      query.gameId = {
        $regex: gameId,
        $options: "i",
      };
    }

    if (oracleImageType && VALID_ORACLE_IMAGE_TYPES.includes(oracleImageType)) {
      query.oracleImageType = oracleImageType;
    }

    FLAG_FIELDS.forEach((field) => {
      if (req.query[field] !== undefined && req.query[field] !== "") {
        query[field] = toBool(req.query[field]);
      }
    });

    const games = await Game.find(query)
      .populate("categoryId")
      .populate("providerDbId")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: games.map((item) => formatGame(req, item)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

/* ======================================================
   GET SINGLE GAME
   GET /api/games/:id
====================================================== */

router.get("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid game id",
      });
    }

    const game = await Game.findById(req.params.id)
      .populate("categoryId")
      .populate("providerDbId");

    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    return res.json({
      success: true,
      data: formatGame(req, game),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

/* ======================================================
   UPDATE GAME
   PUT /api/games/:id
====================================================== */

router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      if (req.file) deleteFile(filePath(req.file));

      return res.status(400).json({
        success: false,
        message: "Invalid game id",
      });
    }

    const {
      categoryId,
      providerDbId,
      gameId,
      gameUId,
      oracleImageType,
      status,
      removeOldImage,
    } = req.body || {};

    const game = await Game.findById(req.params.id);

    if (!game) {
      if (req.file) deleteFile(filePath(req.file));

      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    const oldImage = game.image;

    if (categoryId !== undefined) {
      if (!isValidObjectId(categoryId)) {
        if (req.file) deleteFile(filePath(req.file));

        return res.status(400).json({
          success: false,
          message: "Invalid categoryId",
        });
      }

      const category = await Category.findById(categoryId);

      if (!category) {
        if (req.file) deleteFile(filePath(req.file));

        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      game.categoryId = categoryId;
    }

    if (providerDbId !== undefined) {
      if (!isValidObjectId(providerDbId)) {
        if (req.file) deleteFile(filePath(req.file));

        return res.status(400).json({
          success: false,
          message: "Invalid providerDbId",
        });
      }

      const provider = await GameProvider.findById(providerDbId);

      if (!provider) {
        if (req.file) deleteFile(filePath(req.file));

        return res.status(404).json({
          success: false,
          message: "Provider not found",
        });
      }

      game.providerDbId = providerDbId;
    }

    if (gameId !== undefined || gameUId !== undefined) {
      const newGameId = cleanText(gameId || gameUId);

      if (!newGameId) {
        if (req.file) deleteFile(filePath(req.file));

        return res.status(400).json({
          success: false,
          message: "Game ID is required",
        });
      }

      const exists = await Game.findOne({
        _id: { $ne: game._id },
        providerDbId: game.providerDbId,
        gameId: newGameId,
      });

      if (exists) {
        if (req.file) deleteFile(filePath(req.file));

        return res.status(409).json({
          success: false,
          message: "This game already exists in this provider",
        });
      }

      game.gameId = newGameId;
    }

    if (oracleImageType !== undefined) {
      game.oracleImageType = cleanOracleImageType(oracleImageType);
    }

    if (status !== undefined) {
      game.status = status === "inactive" ? "inactive" : "active";
    }

    applyFlags(game, req.body);

    if (req.file) {
      game.image = filePath(req.file);
    } else if (removeOldImage === "true") {
      game.image = "";
    }

    await game.save();

    if (req.file && oldImage && !String(oldImage).startsWith("http")) {
      deleteFile(oldImage);
    }

    if (
      removeOldImage === "true" &&
      !req.file &&
      oldImage &&
      !String(oldImage).startsWith("http")
    ) {
      deleteFile(oldImage);
    }

    const updatedGame = await Game.findById(game._id)
      .populate("categoryId")
      .populate("providerDbId");

    return res.json({
      success: true,
      message: "Game updated successfully",
      data: formatGame(req, updatedGame),
    });
  } catch (error) {
    if (req.file) deleteFile(filePath(req.file));

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This game already exists in this provider",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

/* ======================================================
   REMOVE CUSTOM IMAGE ONLY
   PATCH /api/games/:id/remove-image
====================================================== */

router.patch("/:id/remove-image", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid game id",
      });
    }

    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    const oldImage = game.image;
    game.image = "";

    await game.save();

    if (oldImage && !String(oldImage).startsWith("http")) {
      deleteFile(oldImage);
    }

    const updatedGame = await Game.findById(game._id)
      .populate("categoryId")
      .populate("providerDbId");

    return res.json({
      success: true,
      message: "Game custom image removed successfully",
      data: formatGame(req, updatedGame),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

/* ======================================================
   DELETE GAME
   DELETE /api/games/:id
====================================================== */

router.delete("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid game id",
      });
    }

    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    const oldImage = game.image;

    await Game.findByIdAndDelete(req.params.id);

    if (oldImage && !String(oldImage).startsWith("http")) {
      deleteFile(oldImage);
    }

    return res.json({
      success: true,
      message: "Game deleted successfully",
      data: formatGame(req, game),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

export default router;
