// routes/callback.js
import express from "express";
import Admin from "../models/Admin.js";
import GameHistory from "../models/GameHistory.js";
import DepositTurnover from "../models/DepositTurnover.js";
import OraclePayDepositTurnover from "../models/OraclePayDepositTurnover.js";
import mongoose from "mongoose";

const router = express.Router();

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const applyTurnoverProgress = async ({ userId, username, amount }) => {
  const betAmountForTurnover = Math.abs(num(amount));
  if (!userId || betAmountForTurnover <= 0) return;

  let remainingBetAmount = betAmountForTurnover;

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

    const currentCompleted = num(turnover.completedTurnover);
    const requiredTurnover = num(turnover.requiredTurnover);
    const currentRemaining = Math.max(0, num(turnover.remainingTurnover));

    if (currentRemaining <= 0 || requiredTurnover <= 0) continue;

    const addAmount = Math.min(currentRemaining, remainingBetAmount);
    const newCompleted = currentCompleted + addAmount;
    const newRemaining = Math.max(0, requiredTurnover - newCompleted);

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

    remainingBetAmount -= addAmount;

    console.log(
      `Turnover updated → Type: ${item.source} | User: ${username} | Added: ৳${addAmount} | Completed: ${newCompleted}/${requiredTurnover} | Remaining: ${newRemaining}`,
    );

    if (newStatus === "completed") {
      console.log(
        `Turnover COMPLETED → Type: ${item.source} | User: ${username}`,
      );
    }
  }
};

router.post("/", async (req, res) => {
  try {
    let {
      account_id,
      username,
      provider_code,
      amount,
      game_code,
      verification_key,
      bet_type,
      transaction_id,
      times,
    } = req.body;

    console.log("Callback received →", {
      account_id,
      username,
      provider_code,
      amount,
      game_code,
      bet_type,
      transaction_id,
    });

    if (!username || !provider_code || !amount || !game_code || !bet_type) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing.",
      });
    }

    if (verification_key) {
      const existingHistory = await GameHistory.findOne({ verification_key });
      if (existingHistory) {
        console.log(
          `Duplicate callback ignored (verification_key): ${verification_key}`,
        );
        return res.status(200).json({
          success: true,
          message: "Duplicate verification key, ignored but success returned.",
        });
      }
    }

    username = username.substring(0, 45);
    username = username.substring(0, username.length - 2);

    const player = await Admin.findOne({ username });
    if (!player) {
      return res.status(404).json({
        success: false,
        message: "User not found!",
      });
    }

    console.log("Matched player ID →", player._id);

    const amountFloat = parseFloat(amount);
    if (isNaN(amountFloat)) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    let isPlayerLoss = false;
    let isPlayerWin = false;
    let playerNetChange = 0;

    if (bet_type === "BET") {
      playerNetChange = -amountFloat;
      isPlayerLoss = true;
    } else if (bet_type === "SETTLE") {
      playerNetChange = amountFloat;

      if (amountFloat > 0) {
        isPlayerWin = true;
      } else if (amountFloat < 0) {
        isPlayerLoss = true;
      }
    }

    const gameRecord = {
      username,
      provider_code,
      game_code,
      bet_type,
      amount: amountFloat,
      transaction_id: transaction_id || null,
      verification_key: verification_key || null,
      times: times || null,
      status: isPlayerWin ? "won" : isPlayerLoss ? "lost" : "push",
    };

    const newBalance = (player.balance || 0) + playerNetChange;

    await GameHistory.create(gameRecord);

    const updatedPlayer = await Admin.findOneAndUpdate(
      { _id: player._id },
      {
        $set: { balance: newBalance },
      },
      { new: true },
    );

    if (!updatedPlayer) {
      return res.status(500).json({
        success: false,
        message: "Failed to update player balance.",
      });
    }

    if (["BET", "SETTLE"].includes(bet_type)) {
      await applyTurnoverProgress({
        userId: player._id,
        username,
        amount: amountFloat,
      });
    }

    if (isPlayerLoss && player.referredBy) {
      const lossAmount = Math.abs(playerNetChange);

      const master = await Admin.findById(player.referredBy);
      if (master && master.gameLossCommission > 0) {
        const masterRate = master.gameLossCommission / 100;
        const masterCommission = lossAmount * masterRate;

        if (masterCommission > 0) {
          await Admin.findByIdAndUpdate(master._id, {
            $inc: { gameLossCommissionBalance: masterCommission },
          });
          console.log(
            `Game Loss Commission → Master: +৳${masterCommission.toFixed(2)} to ${master.username}`,
          );
        }

        if (master.referredBy) {
          const superAff = await Admin.findById(master.referredBy);
          if (
            superAff &&
            superAff.role === "super-affiliate" &&
            superAff.gameLossCommission > master.gameLossCommission
          ) {
            const superRate = superAff.gameLossCommission / 100;
            const totalSuperCommission = lossAmount * superRate;
            const superBonus = totalSuperCommission - masterCommission;

            if (superBonus > 0) {
              await Admin.findByIdAndUpdate(superAff._id, {
                $inc: { gameLossCommissionBalance: superBonus },
              });
              console.log(
                `Game Loss Bonus → Super: +৳${superBonus.toFixed(2)} to ${superAff.username}`,
              );
            }
          }
        }
      }
    }

    if (isPlayerWin && player.referredBy) {
      const winAmount = amountFloat;

      const master = await Admin.findById(player.referredBy);
      if (master && master.gameWinCommission > 0) {
        const masterRate = master.gameWinCommission / 100;
        const masterCommission = winAmount * masterRate;

        if (masterCommission > 0) {
          await Admin.findByIdAndUpdate(master._id, {
            $inc: { gameWinCommissionBalance: masterCommission },
          });
          console.log(
            `Game Win Commission → Master: +৳${masterCommission.toFixed(2)} to ${master.username}`,
          );
        }

        if (master.referredBy) {
          const superAff = await Admin.findById(master.referredBy);
          if (
            superAff &&
            superAff.role === "super-affiliate" &&
            superAff.gameWinCommission > master.gameWinCommission
          ) {
            const superRate = superAff.gameWinCommission / 100;
            const totalSuperCommission = winAmount * superRate;
            const superBonus = totalSuperCommission - masterCommission;

            if (superBonus > 0) {
              await Admin.findByIdAndUpdate(superAff._id, {
                $inc: { gameWinCommissionBalance: superBonus },
              });
              console.log(
                `Game Win Bonus → Super: +৳${superBonus.toFixed(2)} to ${superAff.username}`,
              );
            }
          }
        }
      }
    }

    res.json({
      success: true,
      message: "Callback processed successfully.",
      data: {
        username,
        new_balance: updatedPlayer.balance,
        gameRecord,
      },
    });
  } catch (error) {
    console.error("Callback error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

export default router;
