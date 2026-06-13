import express from "express";
import fs from "fs";
import path from "path";
import Game from "../models/Game.js";
import Category from "../models/Category.js";
import GameProvider from "../models/GameProvider.js";
import upload from "../config/multer.js";

const router = express.Router();

const FLAG_FIELDS = ["isHot", "isHome", "isJackpot"];

const toBool = (value) => {
  return value === true || value === "true" || value === "1" || value === 1;
};

const deleteFile = (filePath = "") => {
  try {
    if (!filePath) return;

    const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
    const fullPath = path.join(process.cwd(), cleanPath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.log("Game image delete error:", error.message);
  }
};

// CREATE GAME
router.post("/", async (req, res) => {
  try {
    const { categoryId, providerDbId, gameId, status } = req.body;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!providerDbId) {
      return res.status(400).json({
        success: false,
        message: "Provider is required",
      });
    }

    if (!gameId) {
      return res.status(400).json({
        success: false,
        message: "Game ID is required",
      });
    }

    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const provider = await GameProvider.findById(providerDbId);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    const trimmedGameId = String(gameId).trim();

    const exists = await Game.findOne({
      providerDbId,
      gameId: trimmedGameId,
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "This game already exists in this provider",
      });
    }

    const payload = {
      categoryId,
      providerDbId,
      gameId: trimmedGameId,
      status: status === "inactive" ? "inactive" : "active",
    };

    FLAG_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        payload[field] = toBool(req.body[field]);
      }
    });

    const game = await Game.create(payload);

    const populatedGame = await Game.findById(game._id)
      .populate("categoryId")
      .populate("providerDbId");

    res.status(201).json({
      success: true,
      message: "Game created successfully",
      data: populatedGame,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This game already exists in this provider",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

// GET ALL GAMES
router.get("/", async (req, res) => {
  try {
    const { categoryId, providerDbId, status, isHot, isHome, isJackpot } =
      req.query;

    const query = {};

    if (categoryId) query.categoryId = categoryId;
    if (providerDbId) query.providerDbId = providerDbId;
    if (status) query.status = status;

    const flagQuery = {
      isHot,
      isHome,
      isJackpot,
    };

    Object.entries(flagQuery).forEach(([key, value]) => {
      if (value !== undefined) {
        query[key] = toBool(value);
      }
    });

    const games = await Game.find(query)
      .populate("categoryId")
      .populate("providerDbId")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: games,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

// GET ACTIVE GAMES
router.get("/active", async (req, res) => {
  try {
    const { categoryId, providerDbId, isHot, isHome, isJackpot } = req.query;

    const query = {
      status: "active",
    };

    if (categoryId) query.categoryId = categoryId;
    if (providerDbId) query.providerDbId = providerDbId;

    const flagQuery = {
      isHot,
      isHome,
      isJackpot,
    };

    Object.entries(flagQuery).forEach(([key, value]) => {
      if (value !== undefined) {
        query[key] = toBool(value);
      }
    });

    const games = await Game.find(query)
      .populate("categoryId")
      .populate("providerDbId")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: games,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

// GET SINGLE GAME
router.get("/:id", async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate("categoryId")
      .populate("providerDbId");

    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    res.json({
      success: true,
      data: game,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

// UPDATE GAME
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { status, removeOldImage } = req.body;

    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    if (status) {
      game.status = status === "inactive" ? "inactive" : "active";
    }

    FLAG_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        game[field] = toBool(req.body[field]);
      }
    });

    if (removeOldImage === "true" && game.image) {
      deleteFile(game.image);
      game.image = "";
    }

    if (req.file) {
      if (game.image) {
        deleteFile(game.image);
      }

      game.image = `/${req.file.path.replace(/\\/g, "/")}`;
    }

    await game.save();

    const updatedGame = await Game.findById(game._id)
      .populate("categoryId")
      .populate("providerDbId");

    res.json({
      success: true,
      message: "Game updated successfully",
      data: updatedGame,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

// DELETE GAME
router.delete("/:id", async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    deleteFile(game.image);

    await Game.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Game deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

export default router;