import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import Admin from "../models/Admin.js";
import NineWicketWallet from "../models/NineWicketWallet.js";

const router = express.Router();

/* =========================================================
   HELPERS
========================================================= */

const safeNumber = (value = 0) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.trunc(number * 100) / 100;
};

const normalizePage = (value, fallback = 1) => {
  const number = Number.parseInt(value, 10);

  if (!Number.isFinite(number) || number < 1) {
    return fallback;
  }

  return number;
};

const normalizeLimit = (value, fallback = 20) => {
  const number = Number.parseInt(value, 10);

  if (!Number.isFinite(number) || number < 1) {
    return fallback;
  }

  return Math.min(number, 200);
};

/* =========================================================
   AUTHENTICATION
========================================================= */

const requireAuth = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || "";

    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId =
      decoded?.id ||
      decoded?._id ||
      decoded?.userId ||
      decoded?.user?._id ||
      decoded?.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    const user = await Admin.findById(userId).select(
      "_id username whatsapp role isActive balance userGamePlayName nineWicketUsername",
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isActive !== true) {
      return res.status(403).json({
        success: false,
        message: "Account is not active",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

/* =========================================================
   ADMIN/AFFILIATE AUTHORIZATION
========================================================= */

const requireAdminRole = (req, res, next) => {
  const allowedRoles = ["super-affiliate", "master-affiliate"];

  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to access this resource",
    });
  }

  next();
};

/* =========================================================
   DEFAULT WALLET
========================================================= */

const getDefaultWallet = (user) => {
  return {
    user: user?._id || null,

    username: user?.nineWicketUsername || null,

    totalTransferred: 0,

    totalReturned: 0,

    exposureBalance: 0,

    lastTransferAmount: 0,

    lastReturnedAmount: 0,

    lastTransferAt: null,

    lastReturnedAt: null,

    lastSyncAt: null,

    status: "idle",

    createdAt: null,

    updatedAt: null,
  };
};

/* =========================================================
   FORMAT WALLET
========================================================= */

const formatWallet = (wallet, user = null) => {
  const walletData = wallet?.toObject ? wallet.toObject() : wallet;

  const totalTransferred = safeNumber(walletData?.totalTransferred || 0);

  const totalReturned = safeNumber(walletData?.totalReturned || 0);

  const exposureBalance = Math.max(
    0,
    safeNumber(walletData?.exposureBalance || 0),
  );

  const currentProviderBalance = Math.max(
    0,
    safeNumber(totalTransferred - totalReturned),
  );

  return {
    ...(walletData || getDefaultWallet(user)),

    totalTransferred,

    totalReturned,

    exposureBalance,

    lastTransferAmount: safeNumber(walletData?.lastTransferAmount || 0),

    lastReturnedAmount: safeNumber(walletData?.lastReturnedAmount || 0),

    currentProviderBalance,

    status: walletData?.status || "idle",
  };
};

/* =========================================================
   USER: GET OWN NINE WICKET WALLET
   GET /api/nine-wicket-wallet/me
========================================================= */

router.get("/me", requireAuth, async (req, res) => {
  try {
    const wallet = await NineWicketWallet.findOne({
      user: req.user._id,
    }).lean();

    const walletData = wallet || getDefaultWallet(req.user);

    return res.status(200).json({
      success: true,

      wallet: formatWallet(walletData, req.user),

      user: {
        _id: req.user._id,

        username: req.user.username,

        whatsapp: req.user.whatsapp,

        role: req.user.role,

        balance: safeNumber(req.user.balance),

        userGamePlayName: req.user.userGamePlayName || null,

        nineWicketUsername: req.user.nineWicketUsername || null,
      },
    });
  } catch (error) {
    console.error("Get Own NineWicket Wallet Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to get Nine Wicket wallet",
      error: error.message,
    });
  }
});

/* =========================================================
   ADMIN: GET WALLET SUMMARY
   GET /api/nine-wicket-wallet/admin/summary
========================================================= */

router.get(
  "/admin/summary",
  requireAuth,
  requireAdminRole,
  async (req, res) => {
    try {
      const [
        totalWallets,
        playingWallets,
        exposureWallets,
        settledWallets,
        summaryResult,
      ] = await Promise.all([
        NineWicketWallet.countDocuments(),

        NineWicketWallet.countDocuments({
          status: "playing",
        }),

        NineWicketWallet.countDocuments({
          exposureBalance: {
            $gt: 0,
          },
        }),

        NineWicketWallet.countDocuments({
          status: "settled",
        }),

        NineWicketWallet.aggregate([
          {
            $group: {
              _id: null,

              totalTransferred: {
                $sum: "$totalTransferred",
              },

              totalReturned: {
                $sum: "$totalReturned",
              },

              totalExposure: {
                $sum: "$exposureBalance",
              },
            },
          },
        ]),
      ]);

      const summary = summaryResult[0] || {
        totalTransferred: 0,
        totalReturned: 0,
        totalExposure: 0,
      };

      const totalTransferred = safeNumber(summary.totalTransferred);

      const totalReturned = safeNumber(summary.totalReturned);

      const totalExposure = Math.max(0, safeNumber(summary.totalExposure));

      return res.status(200).json({
        success: true,

        summary: {
          totalWallets,

          playingWallets,

          exposureWallets,

          settledWallets,

          totalTransferred,

          totalReturned,

          totalExposure,

          currentProviderBalance: Math.max(
            0,
            safeNumber(totalTransferred - totalReturned),
          ),
        },
      });
    } catch (error) {
      console.error("NineWicket Wallet Summary Error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Failed to get Nine Wicket wallet summary",
        error: error.message,
      });
    }
  },
);

/* =========================================================
   ADMIN: GET ALL NINE WICKET WALLETS

   GET /api/nine-wicket-wallet
   GET /api/nine-wicket-wallet?page=1&limit=20
   GET /api/nine-wicket-wallet?search=test
   GET /api/nine-wicket-wallet?status=exposure
   GET /api/nine-wicket-wallet?hasExposure=true
========================================================= */

router.get("/", requireAuth, requireAdminRole, async (req, res) => {
  try {
    const page = normalizePage(req.query.page, 1);

    const limit = normalizeLimit(req.query.limit, 20);

    const skip = (page - 1) * limit;

    const search = String(req.query.search || "").trim();

    const status = String(req.query.status || "")
      .trim()
      .toLowerCase();

    const hasExposure = String(req.query.hasExposure || "")
      .trim()
      .toLowerCase();

    const query = {};

    if (status && ["idle", "playing", "exposure", "settled"].includes(status)) {
      query.status = status;
    }

    if (hasExposure === "true") {
      query.exposureBalance = {
        $gt: 0,
      };
    }

    if (hasExposure === "false") {
      query.exposureBalance = {
        $lte: 0,
      };
    }

    if (search) {
      const searchRegex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );

      const matchingUsers = await Admin.find({
        $or: [
          {
            username: searchRegex,
          },
          {
            whatsapp: searchRegex,
          },
          {
            userGamePlayName: searchRegex,
          },
          {
            nineWicketUsername: searchRegex,
          },
        ],
      })
        .select("_id")
        .lean();

      const matchingUserIds = matchingUsers.map((item) => item._id);

      query.$or = [
        {
          username: searchRegex,
        },
        {
          user: {
            $in: matchingUserIds,
          },
        },
      ];
    }

    const [wallets, totalItems] = await Promise.all([
      NineWicketWallet.find(query)
        .populate(
          "user",
          [
            "username",
            "whatsapp",
            "role",
            "isActive",
            "balance",
            "userGamePlayName",
            "nineWicketUsername",
            "createdAt",
          ].join(" "),
        )
        .sort({
          exposureBalance: -1,
          updatedAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      NineWicketWallet.countDocuments(query),
    ]);

    const items = wallets.map((wallet) => formatWallet(wallet));

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return res.status(200).json({
      success: true,

      items,

      pagination: {
        currentPage: page,

        page,

        limit,

        totalItems,

        totalPages,

        hasNextPage: page < totalPages,

        hasPrevPage: page > 1,
      },

      filters: {
        search,

        status: status || null,

        hasExposure:
          hasExposure === "true"
            ? true
            : hasExposure === "false"
              ? false
              : null,
      },
    });
  } catch (error) {
    console.error("Get NineWicket Wallet List Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to get Nine Wicket wallets",
      error: error.message,
    });
  }
});

/* =========================================================
   ADMIN: GET SINGLE USER WALLET
   GET /api/nine-wicket-wallet/:userId
========================================================= */

router.get("/:userId", requireAuth, requireAdminRole, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await Admin.findById(userId)
      .select(
        [
          "username",
          "email",
          "whatsapp",
          "role",
          "isActive",
          "balance",
          "userGamePlayName",
          "nineWicketUsername",
          "createdAt",
          "updatedAt",
        ].join(" "),
      )
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const wallet = await NineWicketWallet.findOne({
      user: user._id,
    }).lean();

    const walletData = wallet || getDefaultWallet(user);

    return res.status(200).json({
      success: true,

      user: {
        ...user,
        balance: safeNumber(user.balance),
      },

      wallet: formatWallet(walletData, user),
    });
  } catch (error) {
    console.error("Get Single NineWicket Wallet Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to get user Nine Wicket wallet",
      error: error.message,
    });
  }
});

export default router;
