import express from "express";

import Admin from "../models/Admin.js";
import GameHistory from "../models/GameHistory.js";
import DepositTurnover from "../models/DepositTurnover.js";
import OraclePayDepositTurnover from "../models/OraclePayDepositTurnover.js";

const router = express.Router();

const toNum = (value = 0) => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

const money = (value = 0) => {
  const n = toNum(value);
  return Math.trunc(n * 100) / 100;
};

const clean = (value = "") => String(value || "").trim();

const cleanMemberAccount = (value = "") => {
  let username = clean(value).toLowerCase();

  if (username.endsWith("orclegames")) {
    username = username.slice(0, -"orclegames".length);
  }

  if (username.endsWith("oraclegames")) {
    username = username.slice(0, -"oraclegames".length);
  }

  return username;
};

const applyTurnoverProgress = async ({ userId, username, wagerAmount }) => {
  const amt = money(wagerAmount);
  if (!userId || amt <= 0) return;

  let remainingBetAmount = amt;

  const manualTurnovers = await DepositTurnover.find({
    user: userId,
    status: "active",
    remainingTurnover: { $gt: 0 },
  }).sort({ activatedAt: 1 });

  const autoTurnovers = await OraclePayDepositTurnover.find({
    user: userId,
    status: "active",
    remainingTurnover: { $gt: 0 },
  }).sort({ activatedAt: 1 });

  const allTurnovers = [
    ...manualTurnovers.map((t) => ({
      source: "manual",
      doc: t,
      model: DepositTurnover,
    })),
    ...autoTurnovers.map((t) => ({
      source: "auto",
      doc: t,
      model: OraclePayDepositTurnover,
    })),
  ].sort((a, b) => {
    const aTime = new Date(a.doc.activatedAt || a.doc.createdAt || 0).getTime();
    const bTime = new Date(b.doc.activatedAt || b.doc.createdAt || 0).getTime();
    return aTime - bTime;
  });

  for (const item of allTurnovers) {
    if (remainingBetAmount <= 0) break;

    const turnover = item.doc;
    const Model = item.model;

    const currentCompleted = money(turnover.completedTurnover);
    const requiredTurnover = money(turnover.requiredTurnover);
    const currentRemaining = Math.max(0, money(turnover.remainingTurnover));

    if (currentRemaining <= 0 || requiredTurnover <= 0) continue;

    const addAmount = money(Math.min(currentRemaining, remainingBetAmount));
    const newCompleted = money(currentCompleted + addAmount);
    const newRemaining = Math.max(0, money(requiredTurnover - newCompleted));

    let newStatus = turnover.status;
    let completedAt = turnover.completedAt;

    if (newRemaining <= 0) {
      newStatus = "completed";
      completedAt = new Date();
    }

    await Model.findByIdAndUpdate(turnover._id, {
      $set: {
        completedTurnover: newCompleted,
        remainingTurnover: newRemaining,
        status: newStatus,
        completedAt,
      },
    });

    remainingBetAmount = money(remainingBetAmount - addAmount);

    console.log(
      `Turnover updated → Type: ${item.source} | User: ${username} | Added: ৳${addAmount} | Completed: ${newCompleted}/${requiredTurnover} | Remaining: ${newRemaining}`,
    );
  }
};

const applyAffiliateCommission = async ({ player, resultType, baseAmount }) => {
  const amount = money(baseAmount);

  if (!player?.referredBy || amount <= 0) return;

  const master = await Admin.findById(player.referredBy);

  if (!master) return;

  if (resultType === "loss") {
    const masterRate = toNum(master.gameLossCommission);

    if (masterRate > 0) {
      const masterCommission = money(amount * (masterRate / 100));

      if (masterCommission > 0) {
        await Admin.findByIdAndUpdate(master._id, {
          $inc: {
            gameLossCommissionBalance: masterCommission,
          },
        });

        console.log(
          `Game Loss Commission → Master: +৳${masterCommission} to ${master.username}`,
        );
      }

      if (master.referredBy) {
        const superAff = await Admin.findById(master.referredBy);

        if (
          superAff &&
          superAff.role === "super-affiliate" &&
          toNum(superAff.gameLossCommission) > masterRate
        ) {
          const superRate = toNum(superAff.gameLossCommission);
          const totalSuperCommission = money(amount * (superRate / 100));
          const superBonus = money(totalSuperCommission - masterCommission);

          if (superBonus > 0) {
            await Admin.findByIdAndUpdate(superAff._id, {
              $inc: {
                gameLossCommissionBalance: superBonus,
              },
            });

            console.log(
              `Game Loss Bonus → Super: +৳${superBonus} to ${superAff.username}`,
            );
          }
        }
      }
    }
  }

  if (resultType === "win") {
    const masterRate = toNum(master.gameWinCommission);

    if (masterRate > 0) {
      const masterCommission = money(amount * (masterRate / 100));

      if (masterCommission > 0) {
        await Admin.findByIdAndUpdate(master._id, {
          $inc: {
            gameWinCommissionBalance: masterCommission,
          },
        });

        console.log(
          `Game Win Commission → Master: +৳${masterCommission} to ${master.username}`,
        );
      }

      if (master.referredBy) {
        const superAff = await Admin.findById(master.referredBy);

        if (
          superAff &&
          superAff.role === "super-affiliate" &&
          toNum(superAff.gameWinCommission) > masterRate
        ) {
          const superRate = toNum(superAff.gameWinCommission);
          const totalSuperCommission = money(amount * (superRate / 100));
          const superBonus = money(totalSuperCommission - masterCommission);

          if (superBonus > 0) {
            await Admin.findByIdAndUpdate(superAff._id, {
              $inc: {
                gameWinCommissionBalance: superBonus,
              },
            });

            console.log(
              `Game Win Bonus → Super: +৳${superBonus} to ${superAff.username}`,
            );
          }
        }
      }
    }
  }
};

router.post("/", async (req, res) => {
  try {
    console.log("\n================ ORACLE CALLBACK RECEIVED ================");
    console.log("Time:", new Date().toISOString());
    console.log("Headers:", req.headers);
    console.log("Body:", JSON.stringify(req.body, null, 2));
    console.log("=========================================================\n");

    const {
      game_uid,
      game_round,
      bet_amount,
      serial_number,
      win_amount,
      member_account,
      currency_code,
      timestamp,
    } = req.body || {};

    if (
      !game_uid ||
      !game_round ||
      !serial_number ||
      bet_amount === undefined ||
      win_amount === undefined ||
      !member_account
    ) {
      return res.status(200).json({
        success: false,
        balance: 0,
        message: "Missing required fields",
      });
    }

    const gameUId = clean(game_uid);
    const gameRound = clean(game_round);
    const serialNumber = clean(serial_number);
    const rawMemberAccount = clean(member_account);
    const userGamePlayName = cleanMemberAccount(member_account);

    const betAmount = money(bet_amount);
    const winAmount = money(win_amount);

    if (betAmount < 0 || winAmount < 0) {
      return res.status(200).json({
        success: false,
        balance: 0,
        message: "Invalid amount",
      });
    }

    const duplicate = await GameHistory.findOne({
      $or: [{ serial_number: serialNumber }, { game_round: gameRound }],
    }).lean();

    if (duplicate) {
      return res.status(200).json({
        success: false,
        balance: duplicate.balance_after || 0,
        message: "DUPLICATE",
        data: {
          status: "DUPLICATE",
          balance: duplicate.balance_after || 0,
          game_round: gameRound,
          serial_number: serialNumber,
        },
      });
    }

    const player = await Admin.findOne({
      userGamePlayName,
      isActive: true,
      role: "user",
    });

    if (!player) {
      return res.status(200).json({
        success: false,
        balance: 0,
        message: "USER_NOT_FOUND",
        data: {
          member_account: rawMemberAccount,
          userGamePlayName,
        },
      });
    }

    const currentBalance = money(player.balance || 0);

    if (currentBalance < betAmount) {
      return res.status(200).json({
        success: false,
        balance: currentBalance,
        message: "INSUFFICIENT_BALANCE",
        data: {
          status: "INSUFFICIENT_BALANCE",
          balance: currentBalance,
          currentBalance,
          betAmount,
          game_round: gameRound,
          serial_number: serialNumber,
        },
      });
    }

    const netAmount = money(winAmount - betAmount);

    let resultType = "push";
    if (netAmount > 0) resultType = "win";
    if (netAmount < 0) resultType = "loss";

    const newBalance = money(currentBalance - betAmount + winAmount);

    const updatedPlayer = await Admin.findByIdAndUpdate(
      player._id,
      {
        $set: {
          balance: newBalance,
        },
      },
      { new: true },
    );

    const finalBalance = money(updatedPlayer.balance || 0);

    const history = await GameHistory.create({
      user: player._id,
      userId: player.userId || player.username,
      userGamePlayName: player.userGamePlayName,
      member_account: rawMemberAccount,
      phone: player.whatsapp || player.phone || "",
      currency: currency_code || player.currency || "BDT",
      userRole: player.role || "user",

      game_uid: gameUId,
      game_round: gameRound,
      serial_number: serialNumber,

      bet_amount: betAmount,
      win_amount: winAmount,
      net_amount: netAmount,
      resultType,

      balance_before: currentBalance,
      balance_after: finalBalance,

      oracleTimestamp: clean(timestamp),
      rawPayload: req.body || {},
    });

    if (betAmount > 0) {
      await applyTurnoverProgress({
        userId: player._id,
        username: player.username,
        wagerAmount: betAmount,
      });
    }

    if (resultType === "loss") {
      await applyAffiliateCommission({
        player,
        resultType: "loss",
        baseAmount: Math.abs(netAmount),
      });
    }

    if (resultType === "win") {
      await applyAffiliateCommission({
        player,
        resultType: "win",
        baseAmount: Math.abs(netAmount),
      });
    }

    return res.status(200).json({
      success: true,
      balance: finalBalance,
      message: "SUCCESS",
      data: {
        status: "SUCCESS",
        resultType,
        betAmount,
        winAmount,
        netAmount,
        balanceBefore: currentBalance,
        newBalance: finalBalance,
        game_round: gameRound,
        serial_number: serialNumber,
        historyId: history._id,
      },
    });
  } catch (error) {
    console.error("Callback Error:", error.message);

    if (error?.code === 11000) {
      return res.status(200).json({
        success: false,
        balance: 0,
        message: "DUPLICATE",
        data: {
          status: "DUPLICATE",
        },
      });
    }

    return res.status(200).json({
      success: false,
      balance: 0,
      message: "Internal processing error, but acknowledged",
    });
  }
});

export default router;
