import express from "express";

import Admin from "../models/Admin.js";
import GameHistory from "../models/GameHistory.js";
import NineWicketWallet from "../models/NineWicketWallet.js";
import DepositTurnover from "../models/DepositTurnover.js";
import OraclePayDepositTurnover from "../models/OraclePayDepositTurnover.js";

const router = express.Router();

/* =========================================================
   NINE WICKET CONFIGURATION
========================================================= */

const NINE_WICKET_GAME_UID =
  process.env.NINE_WICKET_GAME_UID || "48341a3bf62b6dd0814d7129e7e0834b";

/* =========================================================
   GENERAL HELPERS
========================================================= */

const toNum = (value = 0) => {
  const number = Number.parseFloat(value);

  return Number.isFinite(number) ? number : 0;
};

const money = (value = 0) => {
  const number = toNum(value);

  return Math.trunc(number * 100) / 100;
};

const clean = (value = "") => {
  return String(value || "").trim();
};

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

const isNineWicketGame = (gameUId = "") => {
  return clean(gameUId) === NINE_WICKET_GAME_UID;
};

/* =========================================================
   TURNOVER PROGRESS
========================================================= */

const applyTurnoverProgress = async ({ userId, username, wagerAmount }) => {
  const amount = money(wagerAmount);

  if (!userId || amount <= 0) {
    return;
  }

  let remainingBetAmount = amount;

  const manualTurnovers = await DepositTurnover.find({
    user: userId,
    status: "active",
    remainingTurnover: {
      $gt: 0,
    },
  }).sort({
    activatedAt: 1,
  });

  const autoTurnovers = await OraclePayDepositTurnover.find({
    user: userId,
    status: "active",
    remainingTurnover: {
      $gt: 0,
    },
  }).sort({
    activatedAt: 1,
  });

  const allTurnovers = [
    ...manualTurnovers.map((turnover) => ({
      source: "manual",
      doc: turnover,
      model: DepositTurnover,
    })),

    ...autoTurnovers.map((turnover) => ({
      source: "auto",
      doc: turnover,
      model: OraclePayDepositTurnover,
    })),
  ].sort((firstItem, secondItem) => {
    const firstTime = new Date(
      firstItem.doc.activatedAt || firstItem.doc.createdAt || 0,
    ).getTime();

    const secondTime = new Date(
      secondItem.doc.activatedAt || secondItem.doc.createdAt || 0,
    ).getTime();

    return firstTime - secondTime;
  });

  for (const item of allTurnovers) {
    if (remainingBetAmount <= 0) {
      break;
    }

    const turnover = item.doc;

    const Model = item.model;

    const currentCompleted = money(turnover.completedTurnover);

    const requiredTurnover = money(turnover.requiredTurnover);

    const currentRemaining = Math.max(0, money(turnover.remainingTurnover));

    if (currentRemaining <= 0 || requiredTurnover <= 0) {
      continue;
    }

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

/* =========================================================
   AFFILIATE COMMISSION
========================================================= */

const applyAffiliateCommission = async ({ player, resultType, baseAmount }) => {
  const amount = money(baseAmount);

  if (!player?.referredBy || amount <= 0) {
    return null;
  }

  const master = await Admin.findById(player.referredBy);

  if (!master) {
    return null;
  }

  const affiliateInfo = {
    resultType,

    baseAmount: amount,

    master: null,

    superAffiliate: null,
  };

  /* -------------------------------------------------------
     GAME LOSS COMMISSION
  ------------------------------------------------------- */

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

        affiliateInfo.master = {
          user: master._id,

          username: master.username,

          rate: masterRate,

          amount: masterCommission,

          walletField: "gameLossCommissionBalance",
        };

        console.log(
          `Game Loss Commission → Master: +৳${masterCommission} to ${master.username}`,
        );
      }

      if (master.referredBy) {
        const superAffiliate = await Admin.findById(master.referredBy);

        if (
          superAffiliate &&
          superAffiliate.role === "super-affiliate" &&
          toNum(superAffiliate.gameLossCommission) > masterRate
        ) {
          const superRate = toNum(superAffiliate.gameLossCommission);

          const totalSuperCommission = money(amount * (superRate / 100));

          const superBonus = money(totalSuperCommission - masterCommission);

          if (superBonus > 0) {
            await Admin.findByIdAndUpdate(superAffiliate._id, {
              $inc: {
                gameLossCommissionBalance: superBonus,
              },
            });

            affiliateInfo.superAffiliate = {
              user: superAffiliate._id,

              username: superAffiliate.username,

              rate: superRate,

              amount: superBonus,

              walletField: "gameLossCommissionBalance",
            };

            console.log(
              `Game Loss Bonus → Super: +৳${superBonus} to ${superAffiliate.username}`,
            );
          }
        }
      }
    }
  }

  /* -------------------------------------------------------
     GAME WIN COMMISSION
  ------------------------------------------------------- */

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

        affiliateInfo.master = {
          user: master._id,

          username: master.username,

          rate: masterRate,

          amount: masterCommission,

          walletField: "gameWinCommissionBalance",
        };

        console.log(
          `Game Win Commission → Master: +৳${masterCommission} to ${master.username}`,
        );
      }

      if (master.referredBy) {
        const superAffiliate = await Admin.findById(master.referredBy);

        if (
          superAffiliate &&
          superAffiliate.role === "super-affiliate" &&
          toNum(superAffiliate.gameWinCommission) > masterRate
        ) {
          const superRate = toNum(superAffiliate.gameWinCommission);

          const totalSuperCommission = money(amount * (superRate / 100));

          const superBonus = money(totalSuperCommission - masterCommission);

          if (superBonus > 0) {
            await Admin.findByIdAndUpdate(superAffiliate._id, {
              $inc: {
                gameWinCommissionBalance: superBonus,
              },
            });

            affiliateInfo.superAffiliate = {
              user: superAffiliate._id,

              username: superAffiliate.username,

              rate: superRate,

              amount: superBonus,

              walletField: "gameWinCommissionBalance",
            };

            console.log(
              `Game Win Bonus → Super: +৳${superBonus} to ${superAffiliate.username}`,
            );
          }
        }
      }
    }
  }

  return affiliateInfo;
};

/* =========================================================
   GET OR CREATE NINE WICKET WALLET
========================================================= */

const getOrCreateNineWicketWallet = async ({ player, nineWicketUsername }) => {
  let wallet = await NineWicketWallet.findOne({
    user: player._id,
  });

  if (wallet) {
    if (wallet.username !== nineWicketUsername) {
      wallet.username = nineWicketUsername;

      wallet.lastSyncAt = new Date();

      await wallet.save();
    }

    return wallet;
  }

  wallet = await NineWicketWallet.create({
    user: player._id,

    username: nineWicketUsername,

    totalTransferred: 0,

    totalReturned: 0,

    exposureBalance: 0,

    lastTransferAmount: 0,

    lastReturnedAmount: 0,

    lastTransferAt: null,

    lastReturnedAt: null,

    lastSyncAt: new Date(),

    status: "idle",
  });

  return wallet;
};

/* =========================================================
   UPDATE NINE WICKET EXPOSURE
========================================================= */

/**
 * Bet callback:
 *
 * betAmount > 0 এবং winAmount === 0 হলে:
 *
 * current exposure
 * - previous same-round stake
 * + current matchStake
 *
 *
 * Settlement callback:
 *
 * betAmount === 0 এবং matchStake > 0 হলে:
 *
 * current exposure - matchStake
 *
 *
 * Exposure কখনো 0-এর নিচে যাবে না।
 */
const updateNineWicketExposure = async ({
  player,
  nineWicketUsername,
  gameRound,
  betAmount,
  winAmount,
  matchStake,
}) => {
  const safeMatchStake = Math.max(0, money(matchStake));

  const wallet = await getOrCreateNineWicketWallet({
    player,

    nineWicketUsername,
  });

  const currentExposure = Math.max(0, money(wallet.exposureBalance || 0));

  let previousRoundMatchStake = 0;

  let exposureChange = 0;

  let exposureAfter = currentExposure;

  let exposureAction = "none";

  /* -------------------------------------------------------
     BET CALLBACK
  ------------------------------------------------------- */

  if (betAmount > 0 && winAmount === 0 && safeMatchStake > 0) {
    const previousRoundBet = await GameHistory.findOne({
      user: player._id,

      provider: "ninewicket",

      game_round: gameRound,

      bet_amount: {
        $gt: 0,
      },

      win_amount: 0,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    if (previousRoundBet) {
      previousRoundMatchStake = Math.max(
        0,
        money(previousRoundBet.matchStake || 0),
      );
    }

    exposureChange = money(safeMatchStake - previousRoundMatchStake);

    exposureAfter = Math.max(
      0,
      money(currentExposure - previousRoundMatchStake + safeMatchStake),
    );

    exposureAction =
      previousRoundMatchStake > 0 ? "replace_same_round" : "add_new_round";
  } else if (betAmount === 0 && safeMatchStake > 0) {
    /* -----------------------------------------------------
       SETTLEMENT/CLOSE CALLBACK
    ----------------------------------------------------- */

    exposureChange = money(-safeMatchStake);

    exposureAfter = Math.max(0, money(currentExposure - safeMatchStake));

    exposureAction =
      winAmount > 0 ? "subtract_settlement" : "subtract_zero_win";
  }

  /* -------------------------------------------------------
     WALLET STATUS
  ------------------------------------------------------- */

  let walletStatus = wallet.status || "idle";

  if (exposureAfter > 0) {
    walletStatus = "exposure";
  } else if (exposureAction !== "none") {
    walletStatus = "settled";
  }

  wallet.username = nineWicketUsername;

  wallet.exposureBalance = exposureAfter;

  wallet.lastSyncAt = new Date();

  wallet.status = walletStatus;

  await wallet.save();

  return {
    wallet,

    previousRoundMatchStake,

    exposureAction,

    exposureChange,

    exposureAfter,
  };
};

/* =========================================================
   CALLBACK ROUTE
   POST /api/call-back
========================================================= */

router.post("/", async (req, res) => {
  try {
    console.log("\n================ CALLBACK RECEIVED ================");

    console.log("Time:", new Date().toISOString());

    console.log("Headers:", req.headers);

    console.log("Body:", JSON.stringify(req.body, null, 2));

    console.log("=================================================\n");

    const {
      game_uid,
      game_round,
      bet_amount,
      serial_number,
      win_amount,
      member_account,
      currency_code,
      timestamp,
      nine_wicket,
    } = req.body || {};

    /* =====================================================
       REQUIRED FIELD VALIDATION
    ===================================================== */

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

    const cleanedMemberAccount = cleanMemberAccount(member_account);

    const betAmount = money(bet_amount);

    const winAmount = money(win_amount);

    const nineWicketCallback = isNineWicketGame(gameUId);

    if (betAmount < 0 || winAmount < 0) {
      return res.status(200).json({
        success: false,

        balance: 0,

        message: "Invalid amount",
      });
    }

    /* =====================================================
       DUPLICATE CHECK
       শুধু serial_number unique।
       game_round duplicate হতে পারবে।
    ===================================================== */

    const duplicate = await GameHistory.findOne({
      serial_number: serialNumber,
    }).lean();

    if (duplicate) {
      return res.status(200).json({
        success: false,

        balance: money(duplicate.balance_after || 0),

        message: "DUPLICATE",

        data: {
          status: "DUPLICATE",

          provider: duplicate.provider || "oracle",

          balance: money(duplicate.balance_after || 0),

          game_round: gameRound,

          serial_number: serialNumber,
        },
      });
    }

    /* =====================================================
       NINE WICKET CALLBACK
    ===================================================== */

    if (nineWicketCallback) {
      const nineWicketUsername = cleanedMemberAccount;

      /* ---------------------------------------------------
         VALIDATE NINE WICKET USERNAME
      --------------------------------------------------- */

      if (!/^[a-z]{6}$/.test(nineWicketUsername)) {
        return res.status(200).json({
          success: false,

          balance: 0,

          message: "INVALID_NINE_WICKET_USERNAME",

          data: {
            member_account: rawMemberAccount,

            nineWicketUsername,

            usernameLength: nineWicketUsername.length,
          },
        });
      }

      /* ---------------------------------------------------
         FIND NINE WICKET USER
      --------------------------------------------------- */

      const player = await Admin.findOne({
        nineWicketUsername,

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

            nineWicketUsername,
          },
        });
      }

      /* ---------------------------------------------------
         NINE WICKET DATA
      --------------------------------------------------- */

      const matchStake = Math.max(
        0,
        money(nine_wicket?.matchStake ?? nine_wicket?.matchAmount ?? 0),
      );

      const profitLoss = money(nine_wicket?.profitLoss || 0);

      const nineWicketBetId = clean(nine_wicket?.betId);

      const nineWicketBetStatus = clean(nine_wicket?.betStatus);

      const eventTypeName = clean(nine_wicket?.eventTypeName);

      const eventName = clean(nine_wicket?.eventName);

      const marketName = clean(nine_wicket?.marketName);

      const competitionName = clean(nine_wicket?.competitionName);

      /* ---------------------------------------------------
         MAIN BALANCE UNCHANGED
      --------------------------------------------------- */

      const currentBalance = money(player.balance || 0);

      const finalBalance = currentBalance;

      const netAmount = money(winAmount - betAmount);

      let resultType = "push";

      if (netAmount > 0) {
        resultType = "win";
      }

      if (netAmount < 0) {
        resultType = "loss";
      }

      /* ---------------------------------------------------
         UPDATE EXPOSURE
      --------------------------------------------------- */

      const {
        wallet,
        previousRoundMatchStake,
        exposureAction,
        exposureChange,
        exposureAfter,
      } = await updateNineWicketExposure({
        player,

        nineWicketUsername,

        gameRound,

        betAmount,

        winAmount,

        matchStake,
      });

      /* ---------------------------------------------------
         AFFILIATE COMMISSION
      --------------------------------------------------- */

      let affiliateInfo = null;

      try {
        if (resultType === "loss") {
          affiliateInfo = await applyAffiliateCommission({
            player,

            resultType: "loss",

            baseAmount: Math.abs(netAmount),
          });
        }

        if (resultType === "win") {
          affiliateInfo = await applyAffiliateCommission({
            player,

            resultType: "win",

            baseAmount: Math.abs(netAmount),
          });
        }
      } catch (commissionError) {
        console.error(
          "Nine Wicket affiliate commission error:",
          commissionError.message,
        );
      }

      /* ---------------------------------------------------
         SAVE NINE WICKET HISTORY
      --------------------------------------------------- */

      const history = await GameHistory.create({
        user: player._id,

        userId: player.userId || player.username,

        userGamePlayName: player.userGamePlayName || "",

        nineWicketUsername,

        member_account: rawMemberAccount,

        phone: player.whatsapp || player.phone || "",

        currency: currency_code || player.currency || "BDT",

        userRole: player.role || "user",

        provider: "ninewicket",

        game_uid: gameUId,

        game_round: gameRound,

        serial_number: serialNumber,

        bet_amount: betAmount,

        win_amount: winAmount,

        net_amount: netAmount,

        resultType,

        balance_before: currentBalance,

        balance_after: finalBalance,

        nineWicketBetId,

        nineWicketBetStatus,

        matchStake,

        profitLoss,

        eventTypeName,

        eventName,

        marketName,

        competitionName,

        exposureChange,

        exposureAfter,

        affiliateInfo,

        oracleTimestamp: clean(timestamp),

        rawPayload: req.body || {},
      });

      /* ---------------------------------------------------
         TURNOVER
      --------------------------------------------------- */

      if (betAmount > 0) {
        try {
          await applyTurnoverProgress({
            userId: player._id,

            username: player.username,

            wagerAmount: betAmount,
          });
        } catch (turnoverError) {
          console.error("Nine Wicket turnover error:", turnoverError.message);
        }
      }

      console.log("========== NINE WICKET CALLBACK SUCCESS ==========");

      console.log("User:", nineWicketUsername);

      console.log("Game Round:", gameRound);

      console.log("Serial Number:", serialNumber);

      console.log("Bet Amount:", betAmount);

      console.log("Win Amount:", winAmount);

      console.log("Match Stake:", matchStake);

      console.log("Bet Status:", nineWicketBetStatus);

      console.log("Previous Round Stake:", previousRoundMatchStake);

      console.log("Exposure Action:", exposureAction);

      console.log("Exposure Change:", exposureChange);

      console.log("Exposure After:", exposureAfter);

      console.log("Wallet Status:", wallet.status);

      return res.status(200).json({
        success: true,

        balance: finalBalance,

        exposureBalance: exposureAfter,

        message: "SUCCESS",

        data: {
          status: "SUCCESS",

          provider: "ninewicket",

          resultType,

          betAmount,

          winAmount,

          netAmount,

          matchStake,

          previousRoundMatchStake,

          nineWicketBetId,

          nineWicketBetStatus,

          profitLoss,

          eventTypeName,

          eventName,

          marketName,

          competitionName,

          exposureAction,

          exposureChange,

          exposureBalance: exposureAfter,

          walletStatus: wallet.status,

          balanceBefore: currentBalance,

          newBalance: finalBalance,

          game_round: gameRound,

          serial_number: serialNumber,

          historyId: history._id,
        },
      });
    }

    /* =====================================================
       NORMAL ORACLE CALLBACK
    ===================================================== */

    const userGamePlayName = cleanedMemberAccount;

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

    /* =====================================================
       INSUFFICIENT BALANCE
    ===================================================== */

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

    if (netAmount > 0) {
      resultType = "win";
    }

    if (netAmount < 0) {
      resultType = "loss";
    }

    const newBalance = money(currentBalance - betAmount + winAmount);

    const updatedPlayer = await Admin.findByIdAndUpdate(
      player._id,
      {
        $set: {
          balance: newBalance,
        },
      },
      {
        returnDocument: "after",
      },
    );

    if (!updatedPlayer) {
      return res.status(200).json({
        success: false,

        balance: currentBalance,

        message: "BALANCE_UPDATE_FAILED",
      });
    }

    const finalBalance = money(updatedPlayer.balance || 0);

    /* =====================================================
       AFFILIATE COMMISSION
    ===================================================== */

    let affiliateInfo = null;

    try {
      if (resultType === "loss") {
        affiliateInfo = await applyAffiliateCommission({
          player,

          resultType: "loss",

          baseAmount: Math.abs(netAmount),
        });
      }

      if (resultType === "win") {
        affiliateInfo = await applyAffiliateCommission({
          player,

          resultType: "win",

          baseAmount: Math.abs(netAmount),
        });
      }
    } catch (commissionError) {
      console.error(
        "Oracle affiliate commission error:",
        commissionError.message,
      );
    }

    /* =====================================================
       SAVE NORMAL ORACLE HISTORY
    ===================================================== */

    const history = await GameHistory.create({
      user: player._id,

      userId: player.userId || player.username,

      userGamePlayName: player.userGamePlayName,

      nineWicketUsername: "",

      member_account: rawMemberAccount,

      phone: player.whatsapp || player.phone || "",

      currency: currency_code || player.currency || "BDT",

      userRole: player.role || "user",

      provider: "oracle",

      game_uid: gameUId,

      game_round: gameRound,

      serial_number: serialNumber,

      bet_amount: betAmount,

      win_amount: winAmount,

      net_amount: netAmount,

      resultType,

      balance_before: currentBalance,

      balance_after: finalBalance,

      nineWicketBetId: "",

      nineWicketBetStatus: "",

      matchStake: 0,

      profitLoss: 0,

      eventTypeName: "",

      eventName: "",

      marketName: "",

      competitionName: "",

      exposureChange: 0,

      exposureAfter: 0,

      affiliateInfo,

      oracleTimestamp: clean(timestamp),

      rawPayload: req.body || {},
    });

    /* =====================================================
       TURNOVER
    ===================================================== */

    if (betAmount > 0) {
      await applyTurnoverProgress({
        userId: player._id,

        username: player.username,

        wagerAmount: betAmount,
      });
    }

    return res.status(200).json({
      success: true,

      balance: finalBalance,

      message: "SUCCESS",

      data: {
        status: "SUCCESS",

        provider: "oracle",

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

    console.error("Callback Stack:", error.stack);

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
