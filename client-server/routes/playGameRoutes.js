import express from "express";
import axios from "axios";
import qs from "qs";

import Admin from "../models/Admin.js";
import Game from "../models/Game.js";

const router = express.Router();

const ORACLE_BY_IDS_API = "https://api.oraclegames.live/api/games/by-ids";

const isObjectIdLike = (val) => /^[0-9a-fA-F]{24}$/.test(String(val || ""));

const fetchOracleGameDetailsByIds = async ({ oracleGameId, apiKey }) => {
  const res = await axios.post(
    ORACLE_BY_IDS_API,
    { ids: [String(oracleGameId)] },
    {
      headers: {
        "x-api-key": apiKey,
        Accept: "application/json",
      },
      timeout: 30000,
    },
  );

  const data = res?.data?.data?.[0] || res?.data?.games?.[0] || {};

  return {
    game_code: String(data?.game_code ?? data?.gameCode ?? "").trim(),
    provider_code: String(
      data?.provider?.provider_code ||
        data?.provider?.providerCode ||
        data?.provider_code ||
        data?.providerCode ||
        "",
    )
      .trim()
      .toUpperCase(),
    game_type: String(
      data?.game_type || data?.provider?.gameType || data?.gameType || "",
    )
      .trim()
      .toUpperCase(),
  };
};

router.post("/playgame", async (req, res) => {
  try {
    const { gameID, userId } = req.body || {};

    if (!gameID) {
      return res.status(400).json({
        success: false,
        message: "gameID is required",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "userId is required",
      });
    }

    const user = await Admin.findById(userId).select(
      "username balance isActive role",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role !== "user") {
      return res.status(403).json({
        success: false,
        message: "Only user can play game",
      });
    }

    if (user.isActive !== true) {
      return res.status(403).json({
        success: false,
        message: "Your account is not active",
      });
    }

    const ORACLE_API_KEY = process.env.DSTGAME_TOKEN;

    if (!ORACLE_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "DSTGAME_TOKEN missing in .env",
      });
    }

    let gameDoc = null;

    if (isObjectIdLike(gameID)) {
      gameDoc = await Game.findById(gameID);
    }

    if (!gameDoc) {
      gameDoc = await Game.findOne({ gameId: String(gameID).trim() });
    }

    if (!gameDoc) {
      return res.status(404).json({
        success: false,
        message: "Game not found in DB",
      });
    }

    if (gameDoc.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "This game is inactive",
      });
    }

    const oracleGameId = String(gameDoc.gameId || "").trim();

    const oracleGameDetails = await fetchOracleGameDetailsByIds({
      oracleGameId,
      apiKey: ORACLE_API_KEY,
    });

    const payload = {
      username: String(user.username || "").trim(),
      money: Math.max(0, Math.floor(Number(user.balance) || 0)),
      currency: "BDT",
      game_code: oracleGameDetails.game_code,
      provider_code: oracleGameDetails.provider_code,
      game_type: oracleGameDetails.game_type,
    };

    console.log("Launching game payload:", payload);

    /**
     * =========================
     * ✅ LIVE MODE
     * =========================
     */

    // live
    // const LAUNCH_URL = "https://crazybet99.com/getgameurl/v2";

    // const response = await axios.post(LAUNCH_URL, qs.stringify(payload), {
    //   headers: {
    //     "Content-Type": "application/x-www-form-urlencoded",
    //     "x-dstgame-key": process.env.DSTGAME_KEY || ORACLE_API_KEY,
    //   },
    //   timeout: 30000,
    // });

    // const responseData = response.data;

    /**
     * =========================
     * ✅ TEST MODE
     * =========================
     */

    const LAUNCH_URL =
      process.env.TEST_GAME_LAUNCH_URL ||
      "https://api.oraclegames.live/api/admin/games/launch";

    const response = await axios.post(LAUNCH_URL, payload, {
      headers: {
        "x-dstgame-key": process.env.DSTGAME_KEY || ORACLE_API_KEY,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    const responseData = response.data;

    const gameUrl =
      typeof responseData === "string"
        ? responseData
        : responseData?.url ||
          responseData?.data?.url ||
          responseData?.gameUrl ||
          responseData?.game_url ||
          responseData?.launchUrl ||
          responseData?.data?.launchUrl ||
          "";

    if (!gameUrl) {
      return res.status(502).json({
        success: false,
        message: "No game URL received from launch API",
        error: responseData,
      });
    }

    return res.json({
      success: true,
      gameUrl,
      used: {
        game_db_id: String(gameDoc._id),
        oracle_game_id: oracleGameId,
        username: payload.username,
        money: payload.money,
        currency: payload.currency,
        game_code: payload.game_code,
        provider_code: payload.provider_code,
        game_type: payload.game_type,
      },
    });
  } catch (error) {
    console.error("PlayGame API Error:", error.response?.data || error.message);

    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to launch game",
      error: error.response?.data || error.message,
    });
  }
});

export default router;
