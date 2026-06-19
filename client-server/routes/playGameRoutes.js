import express from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import Admin from "../models/Admin.js";

const router = express.Router();

const ORACLE_GAME_LAUNCH_URL =
  process.env.ORACLE_GAME_LAUNCH_URL ||
  "https://oraclegames.net/api/getgameurl";

const ORACLE_LAUNCH_KEY = "4895677890656568745";

const requireAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const id =
      decoded?.id ||
      decoded?._id ||
      decoded?.userId ||
      decoded?.user?._id ||
      decoded?.user?.id;

    if (!id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    req.user = { id };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

const makeGamePlayName = () => {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const bytes = crypto.randomBytes(10);

  let name = "";

  for (let i = 0; i < 10; i += 1) {
    name += letters[bytes[i] % letters.length];
  }

  return name;
};

const isValidGamePlayName = (value = "") => {
  return /^[a-z]{10}$/.test(String(value || "").trim());
};

const getOrCreateGamePlayName = async (user) => {
  if (isValidGamePlayName(user.userGamePlayName)) {
    return String(user.userGamePlayName).trim().toLowerCase();
  }

  for (let i = 0; i < 50; i += 1) {
    const name = makeGamePlayName();

    const exists = await Admin.exists({
      userGamePlayName: name,
    });

    if (!exists) {
      user.userGamePlayName = name;
      await user.save();
      return name;
    }
  }

  throw new Error("Failed to generate unique game play username");
};

const extractLaunchUrl = (responseData) => {
  return (
    responseData?.launch_url ||
    responseData?.launchUrl ||
    responseData?.gameUrl ||
    responseData?.url ||
    responseData?.data?.launch_url ||
    responseData?.data?.launchUrl ||
    responseData?.data?.gameUrl ||
    responseData?.data?.url ||
    ""
  );
};

router.post("/playgame", requireAuth, async (req, res) => {
  try {
    const { gameID, game_uid, gameId } = req.body || {};

    const gameUId = String(game_uid || gameID || gameId || "").trim();

    if (!gameUId) {
      return res.status(400).json({
        success: false,
        message: "game_uid is required",
      });
    }

    const user = await Admin.findById(req.user?.id).select(
      "username userId whatsapp phone balance isActive currency userGamePlayName role",
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

    if (!ORACLE_LAUNCH_KEY) {
      return res.status(500).json({
        success: false,
        message: "ORACLE_LAUNCH_KEY missing in .env",
      });
    }

    let balance = Number(user.balance ?? 0);

    if (!Number.isFinite(balance) || balance < 0) {
      balance = 0;
    }

    const userGamePlayName = await getOrCreateGamePlayName(user);

    const payload = {
      amount: String(Math.max(0, Math.floor(balance))),
      username: userGamePlayName,
      game_uid: gameUId,
    };

    const response = await axios.post(ORACLE_GAME_LAUNCH_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        "x-oracle-key": ORACLE_LAUNCH_KEY,
      },
      timeout: 30000,
    });

    const gameUrl = extractLaunchUrl(response.data);

    if (!gameUrl || typeof gameUrl !== "string") {
      return res.status(502).json({
        success: false,
        message: "No launch_url received from Oracle API",
        error: response.data,
      });
    }

    return res.json({
      success: true,
      gameUrl,
      launch_url: gameUrl,
      used: {
        game_uid: gameUId,
        username: userGamePlayName,
        amount: payload.amount,
      },
    });
  } catch (error) {
    console.error("PlayGame API Error:", error.response?.data || error.message);

    return res.status(error.response?.status || 500).json({
      success: false,
      message:
        error?.response?.data?.message ||
        error.message ||
        "Failed to launch game",
      error: error.response?.data || error.message,
    });
  }
});

export default router;
