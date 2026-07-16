import express from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import Admin from "../models/Admin.js";
import NineWicketWallet from "../models/NineWicketWallet.js";

const router = express.Router();

/* =========================================================
   API CONFIGURATION
========================================================= */

const ORACLE_GAME_LAUNCH_URL =
  process.env.ORACLE_GAME_LAUNCH_URL ||
  "https://oraclegames.net/api/getgameurl";

const ORACLE_NINE_WICKET_URL =
  process.env.ORACLE_NINE_WICKET_URL ||
  "https://oraclegames.net/api/ninewicket";

const ORACLE_LAUNCH_KEY =
  process.env.ORACLE_LAUNCH_KEY || "2ab23a348e3bfe2068fc9a9150a874fb";

const NINE_WICKET_GAME_UID =
  process.env.NINE_WICKET_GAME_UID || "48341a3bf62b6dd0814d7129e7e0834b";

/* =========================================================
   LAUNCH LOCK
========================================================= */

/**
 * একই user একই game একসঙ্গে একাধিকবার launch করলে
 * duplicate Nine Wicket transfer বন্ধ করবে।
 */
const launchLocks = new Map();

/* =========================================================
   AUTHENTICATION
========================================================= */

const requireAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";

    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;

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

    req.user = {
      id,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

/* =========================================================
   MONEY HELPERS
========================================================= */

const toMoney = (value = 0) => {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Math.trunc(amount * 100) / 100;
};

/* =========================================================
   USERNAME HELPERS
========================================================= */

const normalizeUsername = (value = "") => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

const makeRandomUsername = (length) => {
  const letters = "abcdefghijklmnopqrstuvwxyz";

  const bytes = crypto.randomBytes(length);

  let username = "";

  for (let index = 0; index < length; index += 1) {
    username += letters[bytes[index] % letters.length];
  }

  return username;
};

/**
 * Normal Oracle username:
 * ঠিক 10টি lowercase English letter।
 */
const isValidOracleUsername = (value = "") => {
  return /^[a-z]{10}$/.test(normalizeUsername(value));
};

/**
 * Nine Wicket username:
 * ঠিক 6টি lowercase English letter।
 */
const isValidNineWicketUsername = (value = "") => {
  return /^[a-z]{6}$/.test(normalizeUsername(value));
};

/* =========================================================
   NORMAL ORACLE USERNAME
========================================================= */

const getOrCreateOracleUsername = async (user) => {
  const existingUsername = normalizeUsername(user.userGamePlayName);

  if (isValidOracleUsername(existingUsername)) {
    if (user.userGamePlayName !== existingUsername) {
      user.userGamePlayName = existingUsername;

      await user.save();
    }

    return existingUsername;
  }

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const generatedUsername = makeRandomUsername(10);

    if (!isValidOracleUsername(generatedUsername)) {
      continue;
    }

    const exists = await Admin.exists({
      userGamePlayName: generatedUsername,
    });

    if (exists) {
      continue;
    }

    try {
      user.userGamePlayName = generatedUsername;

      await user.save();

      return generatedUsername;
    } catch (error) {
      if (error?.code === 11000) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Failed to generate unique 10-letter Oracle username");
};

/* =========================================================
   NINE WICKET USERNAME
========================================================= */

const getOrCreateNineWicketUsername = async (user) => {
  const existingUsername = normalizeUsername(user.nineWicketUsername);

  if (isValidNineWicketUsername(existingUsername)) {
    if (user.nineWicketUsername !== existingUsername) {
      user.nineWicketUsername = existingUsername;

      await user.save();
    }

    return existingUsername;
  }

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const generatedUsername = makeRandomUsername(6);

    if (!isValidNineWicketUsername(generatedUsername)) {
      continue;
    }

    const exists = await Admin.exists({
      nineWicketUsername: generatedUsername,
    });

    if (exists) {
      continue;
    }

    try {
      user.nineWicketUsername = generatedUsername;

      await user.save();

      return generatedUsername;
    } catch (error) {
      if (error?.code === 11000) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Failed to generate unique 6-letter Nine Wicket username");
};

/* =========================================================
   LAUNCH URL HELPER
========================================================= */

const extractLaunchUrl = (responseData) => {
  return (
    responseData?.launch_url ||
    responseData?.launchUrl ||
    responseData?.gameUrl ||
    responseData?.game_url ||
    responseData?.url ||
    responseData?.data?.launch_url ||
    responseData?.data?.launchUrl ||
    responseData?.data?.gameUrl ||
    responseData?.data?.game_url ||
    responseData?.data?.url ||
    ""
  );
};

/* =========================================================
   UPDATE NINE WICKET WALLET AFTER TRANSFER
========================================================= */

const updateNineWicketWalletAfterTransfer = async ({
  userId,
  username,
  amount,
}) => {
  const safeAmount = toMoney(amount);

  const now = new Date();

  const wallet = await NineWicketWallet.findOneAndUpdate(
    {
      user: userId,
    },
    {
      $set: {
        user: userId,

        username,

        lastTransferAmount: safeAmount,

        lastTransferAt: now,

        lastSyncAt: now,

        status: "playing",
      },

      $inc: {
        totalTransferred: safeAmount,
      },

      $setOnInsert: {
        totalReturned: 0,

        exposureBalance: 0,

        lastReturnedAmount: 0,

        lastReturnedAt: null,
      },
    },
    {
      returnDocument: "after",

      upsert: true,

      setDefaultsOnInsert: true,
    },
  );

  return wallet;
};

/* =========================================================
   RESERVE USER BALANCE
========================================================= */

/**
 * Nine Wicket API call করার আগেই local balance
 * atomic operation-এর মাধ্যমে deduct করা হবে।
 *
 * এতে একই balance একাধিক request থেকে transfer হবে না।
 */
const reserveUserBalance = async ({ userId, amount }) => {
  const safeAmount = toMoney(amount);

  if (safeAmount <= 0) {
    return null;
  }

  return Admin.findOneAndUpdate(
    {
      _id: userId,

      role: "user",

      isActive: true,

      balance: {
        $gte: safeAmount,
      },
    },
    {
      $inc: {
        balance: -safeAmount,
      },
    },
    {
      returnDocument: "after",
    },
  ).select("balance");
};

/* =========================================================
   ROLLBACK USER BALANCE
========================================================= */

/**
 * Provider transfer ব্যর্থ হলে reserved balance
 * user-এর local main balance-এ ফেরত যাবে।
 */
const rollbackUserBalance = async ({ userId, amount }) => {
  const safeAmount = toMoney(amount);

  if (safeAmount <= 0) {
    return;
  }

  await Admin.updateOne(
    {
      _id: userId,
    },
    {
      $inc: {
        balance: safeAmount,
      },
    },
  );
};

/* =========================================================
   PLAY GAME ROUTE
   POST /api/play-game/playgame
========================================================= */

router.post("/playgame", requireAuth, async (req, res) => {
  const { gameID, game_uid, gameId } = req.body || {};

  const gameUId = String(game_uid || gameID || gameId || "").trim();

  const lockKey = `${String(req.user?.id || "")}:${gameUId}`;

  let lockCreated = false;

  let nineWicketBalanceReserved = false;

  let reservedNineWicketAmount = 0;

  let reservedNineWicketUserId = null;

  try {
    /* =====================================================
       VALIDATE GAME UID
    ===================================================== */

    if (!gameUId) {
      return res.status(400).json({
        success: false,
        message: "game_uid is required",
      });
    }

    /* =====================================================
       PREVENT DUPLICATE LAUNCH
    ===================================================== */

    if (launchLocks.has(lockKey)) {
      return res.status(409).json({
        success: false,
        message: "Game launch is already processing. Please wait.",
      });
    }

    launchLocks.set(lockKey, Date.now());

    lockCreated = true;

    /* =====================================================
       FIND USER
    ===================================================== */

    const user = await Admin.findById(req.user?.id).select(
      [
        "username",
        "userId",
        "whatsapp",
        "phone",
        "balance",
        "isActive",
        "currency",
        "userGamePlayName",
        "nineWicketUsername",
        "role",
      ].join(" "),
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

    const currentBalance = toMoney(user.balance);

    /* =====================================================
       NINE WICKET GAME
    ===================================================== */

    if (gameUId === NINE_WICKET_GAME_UID) {
      if (currentBalance <= 0) {
        return res.status(400).json({
          success: false,
          message: "Insufficient balance to launch Nine Wicket",
          balance: currentBalance,
        });
      }

      /* ---------------------------------------------------
         CREATE OR GET NINE WICKET USERNAME
      --------------------------------------------------- */

      const generatedUsername = await getOrCreateNineWicketUsername(user);

      const nineWicketUsername = normalizeUsername(generatedUsername);

      if (!isValidNineWicketUsername(nineWicketUsername)) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid Nine Wicket username. Username must be exactly 6 lowercase letters.",

          debug: {
            username: nineWicketUsername,

            usernameLength: nineWicketUsername.length,

            usernameValid: false,
          },
        });
      }

      /**
       * User-এর সম্পূর্ণ available main balance
       * Nine Wicket-এ transfer করা হবে।
       */
      const transferAmount = currentBalance;

      /* ---------------------------------------------------
         STEP 1: RESERVE LOCAL BALANCE
      --------------------------------------------------- */

      const reservedUser = await reserveUserBalance({
        userId: user._id,

        amount: transferAmount,
      });

      if (!reservedUser) {
        return res.status(409).json({
          success: false,

          message:
            "Balance changed while launching Nine Wicket. Please refresh and try again.",
        });
      }

      nineWicketBalanceReserved = true;

      reservedNineWicketAmount = transferAmount;

      reservedNineWicketUserId = user._id;

      const remainingBalance = toMoney(reservedUser.balance);

      /* ---------------------------------------------------
         STEP 2: PREPARE NINE WICKET PAYLOAD
      --------------------------------------------------- */

      const nineWicketPayload = {
        username: nineWicketUsername,

        amount: transferAmount,
      };

      console.log("========== NINE WICKET TRANSFER START ==========");

      console.log("User ID:", String(user._id));

      console.log("Site Username:", String(user.username || ""));

      console.log("Nine Wicket Username:", JSON.stringify(nineWicketUsername));

      console.log("Nine Wicket Username Length:", nineWicketUsername.length);

      console.log(
        "Nine Wicket Username Valid:",
        isValidNineWicketUsername(nineWicketUsername),
      );

      console.log("DB Balance Before Reserve:", currentBalance);

      console.log("DB Balance After Reserve:", remainingBalance);

      console.log("Amount Sending:", transferAmount);

      console.log("Nine Wicket Payload:", nineWicketPayload);

      /* ---------------------------------------------------
         STEP 3: TRANSFER BALANCE TO NINE WICKET
      --------------------------------------------------- */

      const nineWicketResponse = await axios.post(
        ORACLE_NINE_WICKET_URL,

        nineWicketPayload,

        {
          headers: {
            "Content-Type": "application/json",

            "x-oracle-key": ORACLE_LAUNCH_KEY,
          },

          timeout: 30000,
        },
      );

      console.log("Nine Wicket Response:", nineWicketResponse.data);

      const transferStatus = Number(nineWicketResponse.data?.transfer_status);

      const gameUrl = extractLaunchUrl(nineWicketResponse.data);

      /* ---------------------------------------------------
         TRANSFER FAILED
      --------------------------------------------------- */

      if (transferStatus !== 1 || !gameUrl) {
        await rollbackUserBalance({
          userId: user._id,

          amount: transferAmount,
        });

        nineWicketBalanceReserved = false;

        console.error(
          "Nine Wicket transfer failed. Local balance rolled back.",
        );

        return res.status(502).json({
          success: false,

          message:
            nineWicketResponse.data?.message || "Nine Wicket transfer failed",

          error: nineWicketResponse.data,
        });
      }

      /* ---------------------------------------------------
         STEP 4: UPDATE LOCAL NINE WICKET WALLET
      --------------------------------------------------- */

      let wallet = null;

      try {
        wallet = await updateNineWicketWalletAfterTransfer({
          userId: user._id,

          username: nineWicketUsername,

          amount: transferAmount,
        });
      } catch (walletError) {
        /**
         * Provider-এ transfer ইতোমধ্যে সফল হয়েছে।
         * তাই wallet tracking ব্যর্থ হলেও local balance
         * rollback করা যাবে না।
         */
        console.error(
          "Nine Wicket wallet tracking update failed:",
          walletError.message,
        );

        wallet = await NineWicketWallet.findOne({
          user: user._id,
        });
      }

      /**
       * Transfer provider-এ সফল হয়েছে।
       * Main catch block যেন balance rollback না করে।
       */
      nineWicketBalanceReserved = false;

      console.log("Nine Wicket transfer success.");

      console.log("User Local Balance:", remainingBalance);

      console.log("Nine Wicket Wallet:", {
        totalTransferred: Number(wallet?.totalTransferred || 0),

        totalReturned: Number(wallet?.totalReturned || 0),

        exposureBalance: Number(wallet?.exposureBalance || 0),

        status: wallet?.status || "playing",
      });

      console.log("========== NINE WICKET TRANSFER END ==========");

      /* ---------------------------------------------------
         STEP 5: RETURN GAME URL
      --------------------------------------------------- */

      return res.status(200).json({
        success: true,

        gameUrl,

        launch_url: gameUrl,

        game_url: gameUrl,

        provider: "ninewicket",

        openType: "same_tab",

        iframeFallback: false,

        directOpenUrl: gameUrl,

        used: {
          game_uid: gameUId,

          username: nineWicketUsername,

          usernameLength: nineWicketUsername.length,

          amount: transferAmount,

          balanceTransferred: true,

          oldBalance: currentBalance,

          newBalance: remainingBalance,
        },

        nineWicketWallet: {
          totalTransferred: Number(wallet?.totalTransferred || 0),

          totalReturned: Number(wallet?.totalReturned || 0),

          exposureBalance: Number(wallet?.exposureBalance || 0),

          status: wallet?.status || "playing",
        },
      });
    }

    /* =====================================================
       NORMAL ORACLE GAME
    ===================================================== */

    const oracleUsername = await getOrCreateOracleUsername(user);

    if (!isValidOracleUsername(oracleUsername)) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid Oracle username. Username must be exactly 10 lowercase letters.",
      });
    }

    const oraclePayload = {
      amount: String(Math.max(0, Math.floor(currentBalance))),

      username: oracleUsername,

      game_uid: gameUId,
    };

    const oracleResponse = await axios.post(
      ORACLE_GAME_LAUNCH_URL,

      oraclePayload,

      {
        headers: {
          "Content-Type": "application/json",

          "x-oracle-key": ORACLE_LAUNCH_KEY,
        },

        timeout: 30000,
      },
    );

    const gameUrl = extractLaunchUrl(oracleResponse.data);

    if (!gameUrl || typeof gameUrl !== "string") {
      return res.status(502).json({
        success: false,

        message: "No launch_url received from Oracle API",

        error: oracleResponse.data,
      });
    }

    return res.status(200).json({
      success: true,

      gameUrl,

      launch_url: gameUrl,

      game_url: gameUrl,

      provider: "oracle",

      used: {
        game_uid: gameUId,

        username: oracleUsername,

        amount: oraclePayload.amount,
      },
    });
  } catch (error) {
    /* =====================================================
       NINE WICKET RESERVED BALANCE ROLLBACK
    ===================================================== */

    if (
      nineWicketBalanceReserved &&
      reservedNineWicketUserId &&
      reservedNineWicketAmount > 0
    ) {
      try {
        await rollbackUserBalance({
          userId: reservedNineWicketUserId,

          amount: reservedNineWicketAmount,
        });

        nineWicketBalanceReserved = false;

        console.log("Nine Wicket error: reserved local balance rolled back.");
      } catch (rollbackError) {
        console.error(
          "Nine Wicket balance rollback failed:",
          rollbackError.message,
        );
      }
    }

    const providerError = error.response?.data || error.message;

    console.error("PlayGame API Error:", providerError);

    return res.status(error.response?.status || 500).json({
      success: false,

      message:
        error?.response?.data?.message ||
        error.message ||
        "Failed to launch game",

      error: providerError,
    });
  } finally {
    if (lockCreated) {
      launchLocks.delete(lockKey);
    }
  }
});

export default router;
