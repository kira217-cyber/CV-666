import express from "express";
import mongoose from "mongoose";
import axios from "axios";

import OraclePaySetting from "../models/OraclePaySetting.js";
import OraclePayDeposit from "../models/OraclePayDeposit.js";
import OraclePayDepositTurnover from "../models/OraclePayDepositTurnover.js";
import Admin from "../models/Admin.js";

const router = express.Router();

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

async function getOrCreateSetting() {
  let s = await OraclePaySetting.findOne();

  if (!s) {
    s = new OraclePaySetting({
      businessToken: "",
      active: false,
      minAmount: 5,
      maxAmount: 0,
      bonuses: [],
    });
    await s.save();
  }

  return s;
}

const normalizeBonuses = (bonuses = []) => {
  if (!Array.isArray(bonuses)) return [];

  return bonuses
    .map((b) => {
      const bn = String(b?.title?.bn || "").trim();
      const en = String(b?.title?.en || "").trim();
      const bonusType = String(b?.bonusType || "fixed").toLowerCase();
      const bonusValue = num(b?.bonusValue);
      const turnoverMultiplier = num(b?.turnoverMultiplier);

      return {
        ...(b?._id && mongoose.Types.ObjectId.isValid(b._id)
          ? { _id: b._id }
          : {}),
        title: { bn, en },
        bonusType: bonusType === "percent" ? "percent" : "fixed",
        bonusValue: Math.max(0, bonusValue),
        turnoverMultiplier: Math.max(0, turnoverMultiplier),
        isActive: typeof b?.isActive === "boolean" ? b.isActive : true,
      };
    })
    .filter((b) => b.title.bn && b.title.en);
};

const getBonusSnapshot = (setting, bonusId, amount) => {
  if (!bonusId || !mongoose.Types.ObjectId.isValid(bonusId)) {
    return {
      bonusId: null,
      bonusTitle: { bn: "", en: "" },
      bonusType: "none",
      bonusValue: 0,
      bonusAmount: 0,
      turnoverMultiplier: 0,
      totalCreditedAmount: amount,
      requiredTurnover: 0,
    };
  }

  const bonus = setting.bonuses?.find(
    (b) => String(b._id) === String(bonusId) && b.isActive,
  );

  if (!bonus) {
    return {
      bonusId: null,
      bonusTitle: { bn: "", en: "" },
      bonusType: "none",
      bonusValue: 0,
      bonusAmount: 0,
      turnoverMultiplier: 0,
      totalCreditedAmount: amount,
      requiredTurnover: 0,
    };
  }

  const bonusType = bonus.bonusType === "percent" ? "percent" : "fixed";
  const bonusValue = Math.max(0, num(bonus.bonusValue));

  const bonusAmount =
    bonusType === "percent" ? (amount * bonusValue) / 100 : bonusValue;

  const turnoverMultiplier = Math.max(0, num(bonus.turnoverMultiplier));
  const totalCreditedAmount = amount + bonusAmount;
  const requiredTurnover = totalCreditedAmount * turnoverMultiplier;

  return {
    bonusId: bonus._id,
    bonusTitle: {
      bn: bonus.title?.bn || "",
      en: bonus.title?.en || "",
    },
    bonusType,
    bonusValue,
    bonusAmount,
    turnoverMultiplier,
    totalCreditedAmount,
    requiredTurnover,
  };
};

/**
 * ADMIN: GET settings
 * GET /api/oraclepay-business/admin
 */
router.get("/admin", async (req, res) => {
  try {
    const s = await getOrCreateSetting();

    res.json({
      success: true,
      data: {
        businessToken: s.businessToken || "",
        active: !!s.active,
        minAmount: num(s.minAmount) || 5,
        maxAmount: num(s.maxAmount) || 0,
        bonuses: s.bonuses || [],
      },
    });
  } catch (err) {
    console.error("OraclePay settings get error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * ADMIN: UPDATE settings
 * PUT /api/oraclepay-business/admin
 */
router.put("/admin", async (req, res) => {
  try {
    const { businessToken, active, minAmount, maxAmount, bonuses } = req.body;

    const s = await getOrCreateSetting();

    if (typeof businessToken === "string") {
      s.businessToken = businessToken.trim();
    }

    if (typeof active === "boolean") {
      s.active = active;
    }

    if (minAmount !== undefined) {
      const min = num(minAmount);
      if (min < 0) {
        return res.status(400).json({
          success: false,
          message: "Minimum amount cannot be negative",
        });
      }
      s.minAmount = min;
    }

    if (maxAmount !== undefined) {
      const max = num(maxAmount);
      if (max < 0) {
        return res.status(400).json({
          success: false,
          message: "Maximum amount cannot be negative",
        });
      }
      s.maxAmount = max;
    }

    if (num(s.maxAmount) > 0 && num(s.minAmount) > num(s.maxAmount)) {
      return res.status(400).json({
        success: false,
        message: "Minimum amount cannot be greater than maximum amount",
      });
    }

    if (Array.isArray(bonuses)) {
      s.bonuses = normalizeBonuses(bonuses);
    }

    await s.save();

    res.json({
      success: true,
      message: "OraclePay settings updated",
      data: {
        active: !!s.active,
        minAmount: num(s.minAmount),
        maxAmount: num(s.maxAmount),
        bonuses: s.bonuses || [],
      },
    });
  } catch (err) {
    console.error("OraclePay settings update error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * FRONTEND: STATUS
 * GET /api/oraclepay-business/status
 */
router.get("/status", async (req, res) => {
  try {
    const s = await getOrCreateSetting();
    const enabled = !!(s.active && s.businessToken);

    console.log("✅ NEW ORACLEPAY STATUS ROUTE HIT:", {
      enabled,
      minAmount: s.minAmount,
      maxAmount: s.maxAmount,
      bonusesLength: s.bonuses?.length || 0,
    });

    res.json({
      success: true,
      data: {
        enabled,
        minAmount: Number(s.minAmount || 5),
        maxAmount: Number(s.maxAmount || 0),
        bonuses: enabled
          ? (s.bonuses || [])
              .filter((b) => b.isActive)
              .map((b) => ({
                _id: b._id,
                title: b.title,
                bonusType: b.bonusType,
                bonusValue: b.bonusValue,
                turnoverMultiplier: b.turnoverMultiplier,
                isActive: b.isActive,
              }))
          : [],
      },
    });
  } catch (err) {
    console.error("OraclePay status error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/my-active-turnovers", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Valid userId required",
      });
    }

    const turnovers = await OraclePayDepositTurnover.find({
      user: userId,
      status: "active",
      remainingTurnover: { $gt: 0 },
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: turnovers,
    });
  } catch (err) {
    console.error("OraclePay active turnover error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/**
 * ADMIN: DEPOSIT HISTORY
 * GET /api/oraclepay-business/deposits/admin
 */
router.get("/deposits/admin", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      100,
    );
    const skip = (page - 1) * limit;

    const q = String(req.query.q || "").trim();
    const status = String(req.query.status || "")
      .trim()
      .toUpperCase();

    const matchStage = {};
    if (["PENDING", "PAID", "FAILED"].includes(status)) {
      matchStage.status = status;
    }

    const pipeline = [
      { $match: matchStage },

      {
        $addFields: {
          userObjectId: {
            $convert: {
              input: "$userIdentity",
              to: "objectId",
              onError: null,
              onNull: null,
            },
          },
        },
      },

      {
        $lookup: {
          from: "admins",
          localField: "userObjectId",
          foreignField: "_id",
          as: "user",
        },
      },

      {
        $addFields: {
          user: { $arrayElemAt: ["$user", 0] },
        },
      },

      ...(q
        ? [
            {
              $match: {
                $or: [
                  { "user.username": { $regex: q, $options: "i" } },
                  { invoiceNumber: { $regex: q, $options: "i" } },
                  { transactionId: { $regex: q, $options: "i" } },
                ],
              },
            },
          ]
        : []),

      { $sort: { createdAt: -1 } },

      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                userIdentity: 1,
                amount: 1,
                invoiceNumber: 1,
                status: 1,
                checkoutItems: 1,
                transactionId: 1,
                sessionCode: 1,
                bank: 1,
                footprint: 1,
                paidAt: 1,
                createdAt: 1,
                updatedAt: 1,

                bonusId: 1,
                bonusTitle: 1,
                bonusType: 1,
                bonusValue: 1,
                bonusAmount: 1,
                turnoverMultiplier: 1,
                totalCreditedAmount: 1,
                requiredTurnover: 1,
                turnoverCreated: 1,

                userName: { $ifNull: ["$user.username", "Unknown"] },
                userWhatsapp: { $ifNull: ["$user.whatsapp", ""] },
                userId: "$userObjectId",
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      },
    ];

    const result = await OraclePayDeposit.aggregate(pipeline);
    const data = result?.[0]?.data || [];
    const total = result?.[0]?.total?.[0]?.count || 0;

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("oraclepay deposits admin error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * CREATE PAYMENT LINK
 * POST /api/oraclepay-business/create
 * body: { amount, userIdentity, invoiceNumber, checkoutItems, bonusId }
 */
router.post("/create", async (req, res) => {
  try {
    const s = await getOrCreateSetting();

    if (!s.active || !s.businessToken) {
      return res.status(400).json({
        success: false,
        message: "OraclePay is disabled by admin.",
      });
    }

    const { amount, userIdentity, invoiceNumber, checkoutItems, bonusId } =
      req.body;

    const numAmount = num(amount);
    const minAmount = num(s.minAmount) || 5;
    const maxAmount = num(s.maxAmount) || 0;

    if (!userIdentity) {
      return res.status(400).json({
        success: false,
        message: "userIdentity required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(String(userIdentity))) {
      return res.status(400).json({
        success: false,
        message: "Invalid userIdentity",
      });
    }

    if (!invoiceNumber) {
      return res.status(400).json({
        success: false,
        message: "invoiceNumber required",
      });
    }

    if (!numAmount || numAmount < minAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum amount is ${minAmount}`,
      });
    }

    if (maxAmount > 0 && numAmount > maxAmount) {
      return res.status(400).json({
        success: false,
        message: `Maximum amount is ${maxAmount}`,
      });
    }

    const exist = await OraclePayDeposit.findOne({
      invoiceNumber: String(invoiceNumber),
    });

    if (exist) {
      return res.status(400).json({
        success: false,
        message: "invoiceNumber already exists. Try again.",
      });
    }

    const bonusSnapshot = getBonusSnapshot(s, bonusId, numAmount);

    await OraclePayDeposit.create({
      userIdentity: String(userIdentity),
      amount: numAmount,
      invoiceNumber: String(invoiceNumber),
      status: "PENDING",
      checkoutItems: checkoutItems || {},

      bonusId: bonusSnapshot.bonusId,
      bonusTitle: bonusSnapshot.bonusTitle,
      bonusType: bonusSnapshot.bonusType,
      bonusValue: bonusSnapshot.bonusValue,
      bonusAmount: bonusSnapshot.bonusAmount,
      turnoverMultiplier: bonusSnapshot.turnoverMultiplier,
      totalCreditedAmount: bonusSnapshot.totalCreditedAmount,
      requiredTurnover: bonusSnapshot.requiredTurnover,
      turnoverCreated: false,
    });

    const callbackUrl = `${process.env.PUBLIC_BACKEND_URL}/api/oraclepay-business/webhook`;
    const successRedirectUrl = `${process.env.PUBLIC_FRONTEND_URL}`;

    const opayRes = await axios.post(
      "https://api.oraclepay.org/api/opay-business/generate-payment-page",
      {
        payment_amount: numAmount,
        user_identity_address: String(userIdentity),
        callback_url: callbackUrl,
        success_redirect_url: successRedirectUrl,
        checkout_items: {
          ...(checkoutItems || {}),
          bonus_id: bonusSnapshot.bonusId ? String(bonusSnapshot.bonusId) : "",
          bonus_title_bn: bonusSnapshot.bonusTitle.bn,
          bonus_title_en: bonusSnapshot.bonusTitle.en,
          bonus_type: bonusSnapshot.bonusType,
          bonus_value: bonusSnapshot.bonusValue,
          bonus_amount: bonusSnapshot.bonusAmount,
          turnover_multiplier: bonusSnapshot.turnoverMultiplier,
        },
        invoice_number: String(invoiceNumber),
      },
      {
        headers: { "X-Opay-Business-Token": s.businessToken },
      },
    );

    if (!opayRes?.data?.success || !opayRes?.data?.payment_page_url) {
      await OraclePayDeposit.updateOne(
        { invoiceNumber: String(invoiceNumber) },
        { $set: { status: "FAILED" } },
      );

      return res.status(400).json({
        success: false,
        message: "Failed to create payment link",
        data: opayRes?.data || null,
      });
    }

    res.json({
      success: true,
      payment_page_url: opayRes.data.payment_page_url,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "invoiceNumber already exists. Try again.",
      });
    }

    console.error("OraclePay create error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * SINGLE USER HISTORY
 * GET /api/oraclepay-business/wallet-agent-history/:userId
 */
router.get("/wallet-agent-history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const list = await OraclePayDeposit.find({
      userIdentity: String(userId),
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: list });
  } catch (err) {
    console.error("OraclePay history error:", err?.message || err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/**
 * WEBHOOK
 * POST /api/oraclepay-business/webhook
 * OraclePay requirement: Always reply "OK"
 */
router.post("/webhook", async (req, res) => {
  res.send("OK");

  try {
    const data = req.body || {};

    const invoiceNumber = String(data.invoice_number || "").trim();
    const userId = String(data.user_identity || "").trim();
    const status = String(data.status || "").toUpperCase();
    const amount = num(data.amount);

    if (!invoiceNumber) return console.log("❌ invoice_number missing");
    if (!userId) return console.log("❌ user_identity missing");

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return console.log("❌ invalid user id:", userId);
    }

    if (!amount || amount <= 0) {
      return console.log("❌ invalid amount:", amount);
    }

    let dep = await OraclePayDeposit.findOne({ invoiceNumber });

    if (!dep) {
      const s = await getOrCreateSetting();
      const bonusId = data?.checkout_items?.bonus_id || "";
      const bonusSnapshot = getBonusSnapshot(s, bonusId, amount);

      dep = await OraclePayDeposit.create({
        userIdentity: userId,
        amount,
        invoiceNumber,
        status: "PENDING",
        checkoutItems: data.checkout_items || {},

        bonusId: bonusSnapshot.bonusId,
        bonusTitle: bonusSnapshot.bonusTitle,
        bonusType: bonusSnapshot.bonusType,
        bonusValue: bonusSnapshot.bonusValue,
        bonusAmount: bonusSnapshot.bonusAmount,
        turnoverMultiplier: bonusSnapshot.turnoverMultiplier,
        totalCreditedAmount: bonusSnapshot.totalCreditedAmount,
        requiredTurnover: bonusSnapshot.requiredTurnover,
        turnoverCreated: false,

        transactionId: data.transaction_id || "",
        sessionCode: data.session_code || "",
        bank: data.bank || "",
        footprint: data.footprint || "",
      });

      console.log("✅ Deposit created from webhook:", invoiceNumber);
    }

    if (status !== "COMPLETED") {
      await OraclePayDeposit.updateOne(
        { invoiceNumber, status: { $ne: "PAID" } },
        {
          $set: {
            status: status === "FAILED" ? "FAILED" : "PENDING",
            transactionId: data.transaction_id || dep.transactionId || "",
            sessionCode: data.session_code || dep.sessionCode || "",
            bank: data.bank || dep.bank || "",
            footprint: data.footprint || dep.footprint || "",
            checkoutItems: data.checkout_items || dep.checkoutItems || {},
          },
        },
      );

      console.log("ℹ️ OraclePay not completed:", status);
      return;
    }

    const paidDep = await OraclePayDeposit.findOneAndUpdate(
      {
        invoiceNumber,
        status: { $ne: "PAID" },
      },
      {
        $set: {
          status: "PAID",
          transactionId: data.transaction_id || "",
          sessionCode: data.session_code || "",
          bank: data.bank || "",
          footprint: data.footprint || "",
          paidAt: new Date(),
          checkoutItems: data.checkout_items || dep.checkoutItems || {},
        },
      },
      { new: true },
    );

    if (!paidDep) {
      console.log("ℹ️ already PAID, skip balance:", invoiceNumber);
      return;
    }

    const depositAmount = num(paidDep.amount) || amount;
    const bonusAmount = num(paidDep.bonusAmount);
    const turnoverMultiplier = num(paidDep.turnoverMultiplier);
    const totalCreditedAmount =
      num(paidDep.totalCreditedAmount) || depositAmount + bonusAmount;
    const requiredTurnover =
      num(paidDep.requiredTurnover) || totalCreditedAmount * turnoverMultiplier;

    const updatedUser = await Admin.findByIdAndUpdate(
      userId,
      { $inc: { balance: totalCreditedAmount } },
      { new: true },
    ).select("username balance");

    if (!updatedUser) {
      console.log("❌ Admin not found:", userId);
      return;
    }

    if (turnoverMultiplier > 0 && requiredTurnover > 0) {
      await OraclePayDepositTurnover.updateOne(
        { oraclePayDeposit: paidDep._id },
        {
          $setOnInsert: {
            user: userId,
            oraclePayDeposit: paidDep._id,
            depositAmount,
            bonusAmount,
            totalCreditedAmount,
            turnoverMultiplier,
            requiredTurnover,
            completedTurnover: 0,
            remainingTurnover: requiredTurnover,
            status: "active",
            activatedAt: new Date(),
          },
        },
        { upsert: true },
      );

      await OraclePayDeposit.updateOne(
        { _id: paidDep._id },
        {
          $set: {
            turnoverCreated: true,
            totalCreditedAmount,
            requiredTurnover,
          },
        },
      );
    }

    console.log(
      `✅ COMPLETED -> Balance Added | user=${updatedUser.username} | deposit=${depositAmount} | bonus=${bonusAmount} | credited=${totalCreditedAmount} | newBalance=${updatedUser.balance}`,
    );
  } catch (err) {
    console.error("❌ webhook error:", err?.message || err);
  }
});

export default router;
