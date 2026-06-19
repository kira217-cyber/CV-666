import express from "express";
import Admin from "../models/Admin.js";
import OraclePayDeposit from "../models/OraclePayDeposit.js";
import WithdrawPaymentTransaction from "../models/WithdrawPaymentTransaction.js";
import Game from "../models/Game.js";

const router = express.Router();

const money = (value = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
};

// GET /api/dashboard/stats
router.get("/stats", async (req, res) => {
  try {
    const [
      totalUsers,
      totalActiveUsers,
      totalSuperAffiliates,
      totalMasterAffiliates,
      totalGames,
      depositAgg,
      withdrawAgg,
      pendingWithdraw,
    ] = await Promise.all([
      Admin.countDocuments({ role: "user" }),

      Admin.countDocuments({
        role: "user",
        isActive: true,
      }),

      Admin.countDocuments({
        role: "super-affiliate",
      }),

      Admin.countDocuments({
        role: "master-affiliate",
      }),

      Game.countDocuments({
        status: "active",
      }),

      OraclePayDeposit.aggregate([
        {
          $match: {
            status: "PAID",
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$totalCreditedAmount" },
          },
        },
      ]),

      WithdrawPaymentTransaction.aggregate([
        {
          $match: {
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
          },
        },
      ]),

      WithdrawPaymentTransaction.countDocuments({
        status: "pending",
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Dashboard stats fetched successfully",
      data: {
        totalUsers,
        totalActiveUsers,
        totalSuperAffiliates,
        totalMasterAffiliates,
        totalGames,

        totalDeposit: money(depositAgg?.[0]?.totalAmount || 0),
        totalWithdraw: money(withdrawAgg?.[0]?.totalAmount || 0),

        pendingWithdraw,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch dashboard stats",
    });
  }
});

export default router;