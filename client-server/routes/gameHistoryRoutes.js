import express from "express";
import mongoose from "mongoose";

import Admin from "../models/Admin.js";
import GameHistory from "../models/GameHistory.js";
import Game from "../models/Game.js";

const router = express.Router();

const RESULT_TYPES = ["win", "loss", "push"];

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toNum = (value = 0) => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

const money = (value = 0) => {
  const n = toNum(value);
  return Math.trunc(n * 100) / 100;
};

const normalizeResultType = (value = "") => {
  const result = String(value || "")
    .trim()
    .toLowerCase();
  return RESULT_TYPES.includes(result) ? result : "";
};

const resultToStatus = (resultType = "") => {
  if (resultType === "win") return "won";
  if (resultType === "loss") return "lost";
  if (resultType === "push") return "push";
  return "-";
};

const resultToOldType = (resultType = "") => {
  if (resultType === "loss") return "BET";
  if (resultType === "win" || resultType === "push") return "SETTLE";
  return "-";
};

const buildDateFilter = (date = "") => {
  if (!date) return null;

  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  return {
    $gte: start,
    $lte: end,
  };
};

const attachGameInfo = async (histories = []) => {
  const gameIds = [
    ...new Set(
      histories
        .map((item) => String(item?.game_uid || "").trim())
        .filter(Boolean),
    ),
  ];

  const games = gameIds.length
    ? await Game.find({
        gameId: { $in: gameIds },
      })
        .populate("providerDbId")
        .populate("categoryId")
        .lean()
    : [];

  const gameMap = new Map();

  games.forEach((game) => {
    gameMap.set(String(game.gameId), game);
  });

  return histories.map((item) => {
    const gameDoc = gameMap.get(String(item.game_uid));
    const providerCode =
      gameDoc?.providerDbId?.providerId ||
      item?.rawPayload?.provider_code ||
      item?.rawPayload?.provider ||
      "";

    const resultType = item.resultType || "push";
    const betAmount = money(item.bet_amount);
    const winAmount = money(item.win_amount);
    const netAmount = money(item.net_amount);

    return {
      ...item,

      game: gameDoc || null,
      provider_code: providerCode || "-",
      game_code: item.game_uid || "-",

      // Version 3 direct aliases
      betAmount,
      winAmount,
      netAmount,
      validBet: betAmount,
      award: winAmount,
      profitLoss: netAmount,

      // Old component compatibility
      username: item.userGamePlayName || item.member_account || "-",
      bet_type: resultToOldType(resultType),
      amount: betAmount,
      status: resultToStatus(resultType),
      transaction_id: item.serial_number || "-",
      verification_key: item.game_round || "-",
    };
  });
};

const buildSummary = (summaryAgg = [], total = 0) => {
  const summary = {
    win: { count: 0, betAmount: 0, winAmount: 0, netAmount: 0 },
    loss: { count: 0, betAmount: 0, winAmount: 0, netAmount: 0 },
    push: { count: 0, betAmount: 0, winAmount: 0, netAmount: 0 },

    totalCount: total,
    totalBetAmount: 0,
    totalWinAmount: 0,
    totalNetAmount: 0,

    // old admin component cards compatibility
    BET: { count: 0, amount: 0 },
    SETTLE: { count: 0, amount: 0 },
    CANCEL: { count: 0, amount: 0 },
    REFUND: { count: 0, amount: 0 },
    totalAmount: 0,
  };

  summaryAgg.forEach((item) => {
    const key = item?._id;

    if (!summary[key]) return;

    const row = {
      count: item.count || 0,
      betAmount: money(item.betAmount),
      winAmount: money(item.winAmount),
      netAmount: money(item.netAmount),
    };

    summary[key] = row;

    summary.totalBetAmount += row.betAmount;
    summary.totalWinAmount += row.winAmount;
    summary.totalNetAmount += row.netAmount;

    if (key === "loss") {
      summary.BET.count += row.count;
      summary.BET.amount += row.betAmount;
    }

    if (key === "win" || key === "push") {
      summary.SETTLE.count += row.count;
      summary.SETTLE.amount += row.winAmount;
    }
  });

  summary.totalAmount = summary.totalBetAmount;

  return summary;
};

/* ======================================================
   ADMIN: ALL GAME HISTORY
   GET /api/game-history
====================================================== */

router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const skip = (page - 1) * limit;

    const search = String(req.query.search || "").trim();
    const resultType = normalizeResultType(
      req.query.resultType || req.query.result_type,
    );

    const betType = String(req.query.bet_type || "")
      .trim()
      .toUpperCase();

    const filter = {};

    if (resultType) {
      filter.resultType = resultType;
    }

    // old filter support
    if (betType === "BET") {
      filter.resultType = "loss";
    }

    if (betType === "SETTLE") {
      filter.resultType = { $in: ["win", "push"] };
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");

      filter.$or = [
        { userId: regex },
        { userGamePlayName: regex },
        { member_account: regex },
        { phone: regex },
        { currency: regex },
        { userRole: regex },
        { game_uid: regex },
        { game_round: regex },
        { serial_number: regex },
        { resultType: regex },
      ];
    }

    const [historiesRaw, total, summaryAgg] = await Promise.all([
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
            _id: "$resultType",
            count: { $sum: 1 },
            betAmount: { $sum: "$bet_amount" },
            winAmount: { $sum: "$win_amount" },
            netAmount: { $sum: "$net_amount" },
          },
        },
      ]),
    ]);

    const histories = await attachGameInfo(historiesRaw);
    const summary = buildSummary(summaryAgg, total);

    return res.json({
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

    return res.status(500).json({
      success: false,
      message: "Failed to fetch game history",
      error: error.message,
    });
  }
});

/* ======================================================
   USER GAME HISTORY
   IMPORTANT: keep this route before /:id
   GET /api/game-history/user/:userId
====================================================== */

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
    const resultType = normalizeResultType(req.query.resultType);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    const user = await Admin.findById(userId)
      .select("username userGamePlayName whatsapp")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const query = {
      user: userId,
    };

    if (resultType) {
      query.resultType = resultType;
    }

    if (provider && provider !== "all") {
      query.game_uid = provider;
    }

    const dateRange = buildDateFilter(date);
    if (dateRange) {
      query.createdAt = dateRange;
    }

    const skip = (page - 1) * limit;

    const [historiesRaw, total, providers] = await Promise.all([
      GameHistory.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      GameHistory.countDocuments(query),

      GameHistory.distinct("game_uid", {
        user: userId,
      }),
    ]);

    const data = await attachGameInfo(historiesRaw);

    return res.json({
      success: true,
      data,
      providers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    console.error("User game history fetch error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* ======================================================
   USER LATEST HISTORY FOR ADMIN USER DETAILS
   GET /api/game-history/user/:userId/latest?limit=10
====================================================== */

router.get("/user/:userId/latest", async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    const historiesRaw = await GameHistory.find({
      user: userId,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const data = await attachGameInfo(historiesRaw);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Latest user game history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch latest user game history",
    });
  }
});

/* ======================================================
   GET SINGLE HISTORY
   GET /api/game-history/:id
====================================================== */

router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid history id",
      });
    }

    const historyRaw = await GameHistory.findById(req.params.id).lean();

    if (!historyRaw) {
      return res.status(404).json({
        success: false,
        message: "Game history not found",
      });
    }

    const [history] = await attachGameInfo([historyRaw]);

    return res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch game history details",
      error: error.message,
    });
  }
});

export default router;
