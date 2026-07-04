import express from "express";
import mongoose from "mongoose";
import DailyBonusClaim from "../models/DailyBonusClaim.js";

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// GET /api/daily-bonus/admin/claims
router.get("/claims", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 15,
      q = "",
      status = "",
      settingId = "",
      from = "",
      to = "",
    } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 15));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (status) filter.status = status;

    if (settingId && isValidObjectId(settingId)) {
      filter.setting = settingId;
    }

    if (q) {
      filter.userIdentity = { $regex: String(q).trim(), $options: "i" };
    }

    if (from || to) {
      filter.claimedAt = {};
      if (from) filter.claimedAt.$gte = new Date(from);

      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.claimedAt.$lte = toDate;
      }
    }

    const [claims, total] = await Promise.all([
      DailyBonusClaim.find(filter)
        .populate(
          "user",
          "username whatsapp email firstName lastName balance role",
        )
        .populate("setting", "title periodDays amount")
        .sort({ claimedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      DailyBonusClaim.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: claims,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error("Get daily bonus claims error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load daily bonus claims",
    });
  }
});

// GET /api/daily-bonus/admin/users/:userId/claims
router.get("/users/:userId/claims", async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 15 } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 15));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (isValidObjectId(userId)) {
      filter.user = userId;
    } else {
      filter.userIdentity = userId;
    }

    const [claims, total] = await Promise.all([
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
      data: claims,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error("Get single user daily bonus claims error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load user daily bonus claims",
    });
  }
});

export default router;
