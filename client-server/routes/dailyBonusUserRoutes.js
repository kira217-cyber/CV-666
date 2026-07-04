import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import DailyBonusSetting from "../models/DailyBonusSetting.js";
import DailyBonusClaim from "../models/DailyBonusClaim.js";
import OraclePayDeposit from "../models/OraclePayDeposit.js";

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const num = (value) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
};

const requireUserAuth = async (req, res, next) => {
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

    if (!id || !isValidObjectId(id)) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    const user = await Admin.findById(id);

    if (!user || !user.isActive || user.role !== "user") {
      return res.status(401).json({
        success: false,
        message: "User not found or inactive",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
};

const getUserIdentities = (user) => {
  return [
    String(user._id),
    user.username,
    user.whatsapp,
    user.email,
    user.userGamePlayName,
  ].filter(Boolean);
};

const hasPaidDeposit = async (user) => {
  const identities = getUserIdentities(user);

  const deposit = await OraclePayDeposit.findOne({
    userIdentity: { $in: identities },
    status: "PAID",
  }).lean();

  return Boolean(deposit);
};

const getLastClaim = async ({ userId, settingId }) => {
  return DailyBonusClaim.findOne({
    user: userId,
    setting: settingId,
    status: "claimed",
  })
    .sort({ periodEnd: -1, claimedAt: -1 })
    .lean();
};

const getPeriod = async ({ user, setting }) => {
  const now = new Date();

  const lastClaim = await getLastClaim({
    userId: user._id,
    settingId: setting._id,
  });

  const periodStart = lastClaim?.periodEnd
    ? new Date(lastClaim.periodEnd)
    : new Date(setting.createdAt);

  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + Number(setting.periodDays || 1));

  return {
    periodStart,
    periodEnd,
    nextClaimAt: periodEnd,
    canClaimByDate: now >= periodEnd,
    lastClaim,
  };
};

const calculateClaimPreview = async ({ user, setting }) => {
  const depositEligible = await hasPaidDeposit(user);
  const period = await getPeriod({ user, setting });
  const claimAmount = Math.max(0, num(setting.amount));

  return {
    setting,
    depositEligible,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    nextClaimAt: period.nextClaimAt,
    canClaimByDate: period.canClaimByDate,
    claimAmount,
    canClaim: depositEligible && period.canClaimByDate && claimAmount > 0,
  };
};

// GET /api/daily-bonus/user/available
router.get("/available", requireUserAuth, async (req, res) => {
  try {
    const settings = await DailyBonusSetting.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .lean();

    const data = await Promise.all(
      settings.map((setting) =>
        calculateClaimPreview({
          user: req.user,
          setting,
        }),
      ),
    );

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get user daily bonuses error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load daily bonuses",
    });
  }
});

// POST /api/daily-bonus/user/claim/:settingId
router.post("/claim/:settingId", requireUserAuth, async (req, res) => {
  try {
    const { settingId } = req.params;

    if (!isValidObjectId(settingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid setting id",
      });
    }

    const setting = await DailyBonusSetting.findOne({
      _id: settingId,
      isActive: true,
    });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: "Daily bonus setting not found or inactive",
      });
    }

    const preview = await calculateClaimPreview({
      user: req.user,
      setting,
    });

    if (!preview.depositEligible) {
      return res.status(400).json({
        success: false,
        message:
          "You need at least one successful deposit to claim daily bonus",
      });
    }

    if (!preview.canClaimByDate) {
      return res.status(400).json({
        success: false,
        message: "Daily bonus period is not completed yet",
        data: {
          periodStart: preview.periodStart,
          periodEnd: preview.periodEnd,
          nextClaimAt: preview.nextClaimAt,
        },
      });
    }

    if (preview.claimAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Claim amount must be greater than 0",
      });
    }

    const alreadyClaimed = await DailyBonusClaim.findOne({
      user: req.user._id,
      setting: setting._id,
      periodStart: preview.periodStart,
      periodEnd: preview.periodEnd,
    });

    if (alreadyClaimed) {
      return res.status(409).json({
        success: false,
        message: "Daily bonus already claimed for this period",
      });
    }

    const claim = await DailyBonusClaim.create({
      user: req.user._id,
      userIdentity: req.user.username,
      setting: setting._id,
      settingTitle: setting.title,
      periodDays: setting.periodDays,
      periodStart: preview.periodStart,
      periodEnd: preview.periodEnd,
      claimAmount: preview.claimAmount,
      status: "claimed",
      claimedAt: new Date(),
    });

    const updatedUser = await Admin.findByIdAndUpdate(
      req.user._id,
      {
        $inc: {
          balance: preview.claimAmount,
        },
      },
      { returnDocument: "after" },
    ).select("username whatsapp email balance role");

    return res.json({
      success: true,
      message: "Daily bonus claimed successfully",
      data: {
        claim,
        user: updatedUser,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Daily bonus already claimed for this period",
      });
    }

    console.error("Claim daily bonus error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to claim daily bonus",
    });
  }
});

// GET /api/daily-bonus/user/history
router.get("/history", requireUserAuth, async (req, res) => {
  try {
    const { page = 1, limit = 15 } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 15));
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      user: req.user._id,
    };

    const [history, total] = await Promise.all([
      DailyBonusClaim.find(filter)
        .populate("setting", "title periodDays amount")
        .sort({ claimedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      DailyBonusClaim.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: history,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error("Get user daily bonus history error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load daily bonus history",
    });
  }
});

export default router;
