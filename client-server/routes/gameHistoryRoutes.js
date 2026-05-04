import express from "express";
import mongoose from "mongoose";
import Admin from "../models/Admin.js";
import GameHistory from "../models/GameHistory.js";

const router = express.Router();

const BET_TYPES = ["BET", "SETTLE", "CANCEL", "REFUND"];

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");


// GET /api/game-history?page=1&limit=50&search=&bet_type=BET
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const skip = (page - 1) * limit;

    const search = String(req.query.search || "").trim();
    const betType = String(req.query.bet_type || "").trim().toUpperCase();

    const filter = {};

    if (betType && BET_TYPES.includes(betType)) {
      filter.bet_type = betType;
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { transaction_id: regex },
        { verification_key: regex },
        { game_code: regex },
        { provider_code: regex },
        { username: regex },
      ];
    }

    const [histories, total, summaryAgg] = await Promise.all([
      GameHistory.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      GameHistory.countDocuments(filter),

      GameHistory.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$bet_type",
            count: { $sum: 1 },
            amount: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const summary = {
      BET: { count: 0, amount: 0 },
      SETTLE: { count: 0, amount: 0 },
      CANCEL: { count: 0, amount: 0 },
      REFUND: { count: 0, amount: 0 },
      totalCount: total,
      totalAmount: 0,
    };

    summaryAgg.forEach((item) => {
      if (summary[item._id]) {
        summary[item._id] = {
          count: item.count || 0,
          amount: item.amount || 0,
        };
        summary.totalAmount += item.amount || 0;
      }
    });

    res.json({
      success: true,
      data: histories,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasPrevPage: page > 1,
        hasNextPage: page < Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Game history fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch game history",
      error: error.message,
    });
  }
});

// GET /api/game-history/:id
router.get("/:id", async (req, res) => {
  try {
    const history = await GameHistory.findById(req.params.id).lean();

    if (!history) {
      return res.status(404).json({
        success: false,
        message: "Game history not found",
      });
    }

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch game history details",
      error: error.message,
    });
  }
});



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