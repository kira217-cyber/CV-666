import express from "express";
import mongoose from "mongoose";
import Admin from "../models/Admin.js";
import GameHistory from "../models/GameHistory.js";

const router = express.Router();

/**
 * GET /api/game-history/user/:userId
 */
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "10", 10), 1),
      100,
    );

    const provider = String(req.query.provider || "all").trim();
    const date = String(req.query.date || "").trim();

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    const user = await Admin.findById(userId).select("username").lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const query = {
      username: user.username,
    };

    if (provider && provider !== "all") {
      query.provider_code = provider.toUpperCase();
    }

    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);

      query.createdAt = {
        $gte: start,
        $lte: end,
      };
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      GameHistory.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      GameHistory.countDocuments(query),
    ]);

    const providers = await GameHistory.distinct("provider_code", {
      username: user.username,
    });

    return res.json({
      success: true,
      data,
      providers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Game history fetch error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

export default router;