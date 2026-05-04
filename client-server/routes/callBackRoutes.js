// routes/callback.js
import express from "express";
import Admin from "../models/Admin.js";
import GameHistory from "../models/GameHistory.js";
import DepositTurnover from "../models/DepositTurnover.js";
import OraclePayDepositTurnover from "../models/OraclePayDepositTurnover.js";

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
      round_id,
      bet_details,
    } = req.body;

    console.log("Callback received →", {
      account_id,
      username,
      provider_code,
      amount,
      game_code,
      bet_type,
      transaction_id,
      verification_key,
    });

    // ✅ IMPORTANT FIX: username আর substring করা হবে না
    username = String(username || "").trim();
    provider_code = String(provider_code || "").trim().toUpperCase();
    game_code = String(game_code || "").trim();
    bet_type = String(bet_type || "").trim().toUpperCase();

    transaction_id = transaction_id ? String(transaction_id).trim() : undefined;
    verification_key = verification_key
      ? String(verification_key).trim()
      : undefined;

    if (
      !username ||
      !provider_code ||
      amount === undefined ||
      amount === null ||
      !game_code ||
      !bet_type
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing.",
      });
    }

    if (!["BET", "SETTLE", "CANCEL", "REFUND"].includes(bet_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bet_type.",
      });
    }

    const amountFloat = Number(amount);

    if (!Number.isFinite(amountFloat)) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount.",
      });
    }

    if (verification_key) {
      const existingHistory = await GameHistory.findOne({ verification_key });

      if (existingHistory) {
        console.log(
          `Duplicate callback ignored verification_key: ${verification_key}`,
        );

        return res.status(200).json({
          success: true,
          message: "Duplicate verification key ignored.",
        });
      }
    }

    if (transaction_id) {
      const existingTransaction = await GameHistory.findOne({
        transaction_id,
        bet_type,
      });

      if (existingTransaction) {
        console.log(
          `Duplicate callback ignored transaction_id: ${transaction_id}, bet_type: ${bet_type}`,
        );

        return res.status(200).json({
          success: true,
          message: "Duplicate transaction ignored.",
        });
      }
    }

    const player = await Admin.findOne({ username });

    if (!player) {
      console.log("User not found for callback username:", username);

      return res.status(404).json({
        success: false,
        message: "User not found!",
      });
    }

    console.log("Matched player →", {
      id: player._id,
      username: player.username,
      oldBalance: player.balance,
    });

    let isPlayerLoss = false;
    let isPlayerWin = false;
    let playerNetChange = 0;

    if (bet_type === "BET") {
      playerNetChange = -Math.abs(amountFloat);
      isPlayerLoss = true;
    }

    if (bet_type === "SETTLE") {
      playerNetChange = amountFloat;

      if (amountFloat > 0) {
        isPlayerWin = true;
      }

      if (amountFloat < 0) {
        isPlayerLoss = true;
      }
    }

    if (bet_type === "CANCEL" || bet_type === "REFUND") {
      playerNetChange = Math.abs(amountFloat);
    }

    const balanceBefore = num(player.balance);
    const newBalance = balanceBefore + playerNetChange;

    const gameRecord = {
      username,
      provider_code,
      game_code,
      bet_type,
      amount: amountFloat,
      transaction_id,
      verification_key,
      times: times || null,
      round_id: round_id || null,
      bet_details: bet_details || null,
      status:
        bet_type === "CANCEL"
          ? "cancelled"
          : bet_type === "REFUND"
            ? "refunded"
            : isPlayerWin
              ? "won"
              : isPlayerLoss
                ? "lost"
                : "push",
      balanceBefore,
      balanceAfter: newBalance,
    };

    const createdHistory = await GameHistory.create(gameRecord);

    const updatedPlayer = await Admin.findByIdAndUpdate(
      player._id,
      {
        $set: {
          balance: newBalance,
        },
      },
      {
        new: true,
      },
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

      if (master && num(master.gameLossCommission) > 0) {
        const masterRate = num(master.gameLossCommission) / 100;
        const masterCommission = lossAmount * masterRate;

        if (masterCommission > 0) {
          await Admin.findByIdAndUpdate(master._id, {
            $inc: {
              gameLossCommissionBalance: masterCommission,
            },
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
            num(superAff.gameLossCommission) > num(master.gameLossCommission)
          ) {
            const superRate = num(superAff.gameLossCommission) / 100;
            const totalSuperCommission = lossAmount * superRate;
            const superBonus = totalSuperCommission - masterCommission;

            if (superBonus > 0) {
              await Admin.findByIdAndUpdate(superAff._id, {
                $inc: {
                  gameLossCommissionBalance: superBonus,
                },
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
      const winAmount = Math.abs(playerNetChange);

      const master = await Admin.findById(player.referredBy);

      if (master && num(master.gameWinCommission) > 0) {
        const masterRate = num(master.gameWinCommission) / 100;
        const masterCommission = winAmount * masterRate;

        if (masterCommission > 0) {
          await Admin.findByIdAndUpdate(master._id, {
            $inc: {
              gameWinCommissionBalance: masterCommission,
            },
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
            num(superAff.gameWinCommission) > num(master.gameWinCommission)
          ) {
            const superRate = num(superAff.gameWinCommission) / 100;
            const totalSuperCommission = winAmount * superRate;
            const superBonus = totalSuperCommission - masterCommission;

            if (superBonus > 0) {
              await Admin.findByIdAndUpdate(superAff._id, {
                $inc: {
                  gameWinCommissionBalance: superBonus,
                },
              });

              console.log(
                `Game Win Bonus → Super: +৳${superBonus.toFixed(2)} to ${superAff.username}`,
              );
            }
          }
        }
      }
    }

    console.log("Callback processed successfully →", {
      username,
      bet_type,
      amount: amountFloat,
      oldBalance: balanceBefore,
      newBalance: updatedPlayer.balance,
    });

    return res.status(200).json({
      success: true,
      message: "Callback processed successfully.",
      data: {
        username,
        old_balance: balanceBefore,
        new_balance: updatedPlayer.balance,
        balance_change: playerNetChange,
        gameRecord: createdHistory,
      },
    });
  } catch (error) {
    console.error("Callback error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

export default router;