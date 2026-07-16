import express from "express";
import Admin from "../models/Admin.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import axios from "axios";
import NineWicketWallet from "../models/NineWicketWallet.js";

const router = express.Router();

// Helper: সকল downline user ID পাওয়া (direct + indirect) — শুধু role: "user" গুলোর
async function getAllDownlineUserIds(affiliateId) {
  const downlineUserIds = new Set(); // শুধু "user" role এর ID গুলো রাখবো

  async function recurse(currentId) {
    const user = await Admin.findById(currentId)
      .select("createdUsers role")
      .lean();

    if (!user) return;

    // যদি এই নোডটা "user" role হয় → তার ID add করো এবং আর নিচে যাবে না
    if (user.role === "user") {
      downlineUserIds.add(currentId.toString());
      return;
    }

    // অন্যথায় (super-affiliate বা master-affiliate) → তার createdUsers এর মধ্যে যাও
    for (const childId of user.createdUsers || []) {
      const childStr = childId.toString();
      // ডুপ্লিকেট এড়ানোর জন্য চেক (অপশনাল, কিন্তু ভালো প্র্যাকটিস)
      if (!downlineUserIds.has(childStr)) {
        await recurse(childId);
      }
    }
  }

  await recurse(affiliateId);
  return Array.from(downlineUserIds);
}

async function getDirectDownline(affiliateId) {
  const affiliate = await Admin.findById(affiliateId)
    .select("createdUsers")
    .populate({
      path: "createdUsers",
      select:
        "username referralCode role balance commissionBalance gameLossCommissionBalance depositCommissionBalance referCommissionBalance createdAt",
    })
    .lean();

  return affiliate?.createdUsers || [];
}

const generateUsername = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let username = "";

  for (let i = 0; i < 6; i++) {
    username += chars[Math.floor(Math.random() * chars.length)];
  }

  return username;
};

const createUniqueUsername = async () => {
  let username;
  let exists = true;

  while (exists) {
    username = generateUsername();
    exists = await Admin.findOne({ username });
  }

  return username;
};

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "7d",
    }
  );
};


/* =========================================================
   NINE WICKET CONFIGURATION
========================================================= */

const ORACLE_LAUNCH_KEY =
  process.env.ORACLE_LAUNCH_KEY ||
  "2ab23a348e3bfe2068fc9a9150a874fb";

const NINE_WICKET_GET_BALANCE_URL =
  process.env.NINE_WICKET_GET_BALANCE_URL ||
  "https://oraclegames.net/api/ninewicket/getbalance";

/**
 * একই user-এর জন্য একই সময়ে multiple balance sync আটকাবে।
 */
const nineWicketBalanceSyncLocks = new Map();

/* =========================================================
   NINE WICKET HELPERS
========================================================= */

const toMoney = (value = 0) => {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Math.trunc(amount * 100) / 100;
};

const isValidNineWicketUsername = (value = "") => {
  return /^[a-z]{6}$/.test(
    String(value || "")
      .trim()
      .toLowerCase(),
  );
};

const getDefaultNineWicketData = (user) => {
  return {
    username: user?.nineWicketUsername || null,

    usernameValid: isValidNineWicketUsername(
      user?.nineWicketUsername,
    ),

    synced: false,

    addedAmount: 0,

    totalTransferred: 0,

    totalReturned: 0,

    exposureBalance: 0,

    status: "idle",
  };
};

/* =========================================================
   NINE WICKET BALANCE SYNC
========================================================= */

/**
 * Nine Wicket provider থেকে available balance এনে:
 *
 * 1. Admin.balance-এ যোগ করবে।
 * 2. NineWicketWallet.totalReturned update করবে।
 * 3. Existing exposure অপরিবর্তিত রাখবে।
 * 4. Provider API fail করলেও existing local balance return করবে।
 */
const performNineWicketBalanceSync = async (user) => {
  let currentBalance = toMoney(user.balance);

  const nineWicketUsername = String(
    user.nineWicketUsername || "",
  )
    .trim()
    .toLowerCase();

  const usernameValid = isValidNineWicketUsername(
    nineWicketUsername,
  );

  let wallet = await NineWicketWallet.findOne({
    user: user._id,
  });

  let synced = false;

  let addedAmount = 0;

  let totalTransferred = toMoney(
    wallet?.totalTransferred,
  );

  let totalReturned = toMoney(
    wallet?.totalReturned,
  );

  /**
   * Exposure শুধু callback route থেকে update হবে।
   */
  let exposureBalance = Math.max(
    0,
    toMoney(wallet?.exposureBalance),
  );

  let status = wallet?.status || "idle";

  /**
   * শুধু normal user-এর Nine Wicket balance sync হবে।
   * Affiliate account-এর জন্য provider call করা হবে না।
   */
  if (
    user.role === "user" &&
    usernameValid
  ) {
    try {
      const response = await axios.post(
        NINE_WICKET_GET_BALANCE_URL,

        {
          username: nineWicketUsername,
        },

        {
          headers: {
            "Content-Type": "application/json",

            "x-oracle-key": ORACLE_LAUNCH_KEY,
          },

          timeout: 30000,
        },
      );

      const transferStatus = Number(
        response.data?.transfer_status,
      );

      const providerAmount = toMoney(
        response.data?.get_amount,
      );

      if (transferStatus === 1) {
        synced = true;

        /**
         * Provider balance ফেরত দিলে main balance-এ যোগ হবে।
         */
        if (providerAmount > 0) {
          addedAmount = providerAmount;

          const updatedUser =
            await Admin.findOneAndUpdate(
              {
                _id: user._id,

                role: "user",

                isActive: true,
              },

              {
                $inc: {
                  balance: addedAmount,
                },
              },

              {
                returnDocument: "after",
              },
            ).select("balance");

          if (!updatedUser) {
            throw new Error(
              "Failed to add Nine Wicket balance to user",
            );
          }

          currentBalance = toMoney(
            updatedUser.balance,
          );
        }

        const now = new Date();

        if (wallet) {
          totalTransferred = toMoney(
            wallet.totalTransferred,
          );

          totalReturned = toMoney(
            toMoney(wallet.totalReturned) +
              addedAmount,
          );

          /**
           * Callback route থেকে পাওয়া exposure
           * পরিবর্তন করা হবে না।
           */
          exposureBalance = Math.max(
            0,
            toMoney(wallet.exposureBalance),
          );

          if (exposureBalance > 0) {
            status = "exposure";
          } else if (addedAmount > 0) {
            status = "settled";
          } else if (
            wallet.status === "playing"
          ) {
            status = "playing";
          } else {
            status =
              wallet.status || "settled";
          }

          wallet.username =
            nineWicketUsername;

          wallet.totalReturned =
            totalReturned;

          wallet.lastReturnedAmount =
            addedAmount;

          if (addedAmount > 0) {
            wallet.lastReturnedAt = now;
          }

          wallet.lastSyncAt = now;

          wallet.exposureBalance =
            exposureBalance;

          wallet.status = status;

          await wallet.save();
        } else {
          wallet =
            await NineWicketWallet.create({
              user: user._id,

              username:
                nineWicketUsername,

              totalTransferred: 0,

              totalReturned: addedAmount,

              exposureBalance: 0,

              lastTransferAmount: 0,

              lastReturnedAmount:
                addedAmount,

              lastTransferAt: null,

              lastReturnedAt:
                addedAmount > 0
                  ? now
                  : null,

              lastSyncAt: now,

              status:
                addedAmount > 0
                  ? "settled"
                  : "idle",
            });

          totalTransferred = 0;

          totalReturned = addedAmount;

          exposureBalance = 0;

          status =
            addedAmount > 0
              ? "settled"
              : "idle";
        }
      }
    } catch (error) {
      console.error(
        "Nine Wicket balance sync error:",
        error.response?.data ||
          error.message,
      );

      /**
       * Provider API fail করলে endpoint fail হবে না।
       * Existing local balance এবং exposure return করবে।
       */
    }
  }

  /**
   * Callback একই সময়ে exposure update করতে পারে।
   * তাই response দেওয়ার আগে latest wallet read করা হচ্ছে।
   */
  const latestWallet =
    await NineWicketWallet.findOne({
      user: user._id,
    }).lean();

  if (latestWallet) {
    totalTransferred = toMoney(
      latestWallet.totalTransferred,
    );

    totalReturned = toMoney(
      latestWallet.totalReturned,
    );

    exposureBalance = Math.max(
      0,
      toMoney(latestWallet.exposureBalance),
    );

    status =
      latestWallet.status ||
      (exposureBalance > 0
        ? "exposure"
        : "settled");
  }

  const totalBalance = toMoney(
    currentBalance + exposureBalance,
  );

  return {
    balance: currentBalance,

    exposureBalance,

    totalBalance,

    nineWicket: {
      username:
        nineWicketUsername || null,

      usernameValid,

      synced,

      addedAmount,

      totalTransferred,

      totalReturned,

      exposureBalance,

      status,
    },
  };
};

/* =========================================================
   SYNCHRONIZATION LOCK
========================================================= */

const syncNineWicketBalance = async (user) => {
  const lockKey = String(user._id);

  /**
   * এই user-এর sync আগে থেকেই চললে একই result-এর
   * জন্য অপেক্ষা করবে, দ্বিতীয় provider request করবে না।
   */
  if (
    nineWicketBalanceSyncLocks.has(lockKey)
  ) {
    return nineWicketBalanceSyncLocks.get(
      lockKey,
    );
  }

  const syncPromise =
    performNineWicketBalanceSync(user);

  nineWicketBalanceSyncLocks.set(
    lockKey,
    syncPromise,
  );

  try {
    return await syncPromise;
  } finally {
    nineWicketBalanceSyncLocks.delete(
      lockKey,
    );
  }
};

// API: /api/affiliate/stats/BAEAFD  (যেখানে BAEAFD হলো referralCode)
router.get("/affiliate/stats/:referralCode", async (req, res) => {
  try {
    const { referralCode } = req.params;

    const affiliate = await Admin.findOne({
      referralCode: referralCode.toUpperCase(),
    }).lean();

    if (
      !affiliate ||
      !["super-affiliate", "master-affiliate"].includes(affiliate.role)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // এখানে শুধু "user" role এর downline ID গুলো পাবে
    const downlineUserIds = await getAllDownlineUserIds(affiliate._id);

    if (downlineUserIds.length === 0) {
      return res.json({
        todayPlayerWin: 0,
        todayPlayerLoss: 0,
        activePlayerCount: 0,
        totalDownlineBalance: 0,
      });
    }

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // শুধু user role এর ডাটা নেওয়া (যেহেতু আমরা শুধু তাদের ID পেয়েছি)
    const downlineUsers = await Admin.find({
      _id: {
        $in: downlineUserIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
    })
      .select("balance gameHistory")
      .lean();

    let todayWin = 0;
    let todayLoss = 0;
    let totalBalance = 0;

    downlineUsers.forEach((user) => {
      totalBalance += user.balance || 0;

      (user.gameHistory || []).forEach((game) => {
        if (new Date(game.createdAt) >= dayAgo) {
          if (game.status === "won") todayWin += game.amount || 0;
          if (game.status === "lost") todayLoss += game.amount || 0;
        }
      });
    });

    res.json({
      todayPlayerWin: todayWin,
      todayPlayerLoss: todayLoss,
      activePlayerCount: downlineUsers.length,
      totalDownlineBalance: totalBalance,
    });
  } catch (error) {
    console.error("Affiliate stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// নতুন API: Downline list with stats
router.get("/affiliate/downline-list/:referralCode", async (req, res) => {
  try {
    const { referralCode } = req.params;

    const affiliate = await Admin.findOne({
      referralCode: referralCode.toUpperCase(),
    }).lean();

    if (
      !affiliate ||
      !["super-affiliate", "master-affiliate"].includes(affiliate.role)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const directDownline = await getDirectDownline(affiliate._id);

    if (directDownline.length === 0) {
      return res.json({
        downline: [],
        totalDownline: 0,
        totalBalance: 0,
        totalCommission: 0,
      });
    }

    // Summary calculation
    let totalBalance = 0;
    let totalCommission = 0;
    let totalDownlineCount = directDownline.length;

    const downlineList = directDownline.map((user) => {
      const userBalance = user.balance || 0;
      const userCommission =
        (user.gameLossCommissionBalance || 0) +
        (user.depositCommissionBalance || 0) +
        (user.referCommissionBalance || 0);

      totalBalance += userBalance;
      totalCommission += userCommission;

      return {
        _id: user._id,
        username: user.username,
        referralCode: user.referralCode,
        role: user.role,
        balance: userBalance,
        totalCommission: userCommission,
        createdAt: user.createdAt,
      };
    });

    res.json({
      downline: downlineList,
      summary: {
        totalDownline: totalDownlineCount,
        totalBalance,
        totalCommission,
      },
    });
  } catch (error) {
    console.error("Downline list error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /register
router.post("/register", async (req, res) => {
  const { username, email, whatsapp, password, referral } = req.body;

  try {
    // Check if user already exists
    const exists = await Admin.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ message: "User already exists" });

    let referredBy = null;
    let referrer = null;

    if (referral) {
      referrer = await Admin.findOne({ referralCode: referral });
      if (!referrer)
        return res.status(400).json({ message: "Invalid referral code" });
      referredBy = referrer._id;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new Admin({
      username,
      email,
      whatsapp,
      password: hashedPassword,
      role: referral ? "master-affiliate" : "super-affiliate",
      referredBy,
      isActive: false, // সবাই প্রথমে inactive থাকবে
    });

    const savedUser = await user.save();

    // যদি রেফারার থাকে (মানে রেফার লিংক দিয়ে এসেছে)
    if (referrer) {
      // রেফারারের createdUsers ও pendingRequests এ যোগ করা
      await Admin.findByIdAndUpdate(referrer._id, {
        $push: {
          createdUsers: savedUser._id,
          pendingRequests: savedUser._id,
        },
      });

      // এখানে মূল কাজ: Refer Commission যোগ করা
      const referBonus = referrer.referCommission || 0; // যদি ১০ হয়, তাহলে ১০ টাকা

      if (referBonus > 0) {
        await Admin.findByIdAndUpdate(referrer._id, {
          $inc: {
            referCommissionBalance: referBonus, // বোনাস যোগ হচ্ছে
          },
        });

        // অপশনাল: লগ রাখতে চাইলে একটা Transaction মডেলে সেভ করতে পারো
        // await new ReferralBonus({ referrer: referrer._id, newUser: savedUser._id, amount: referBonus }).save();
      }
    }

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        role: savedUser.role,
        isActive: savedUser.isActive,
        referralCode: savedUser.referralCode,
        referralLink: `${process.env.VITE_API_URL}/register?ref=${savedUser.referralCode}`,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// routes/auth.js → POST /main/register
router.post("/main/register", async (req, res) => {
  const { whatsapp, password, referral } = req.body;

  try {
    if (!whatsapp || !password) {
      return res.status(400).json({
        message: "WhatsApp and Password required",
      });
    }

    const cleanWhatsapp = String(whatsapp).trim();

    const phoneExists = await Admin.findOne({
      whatsapp: cleanWhatsapp,
    });

    if (phoneExists) {
      return res.status(400).json({
        message: "WhatsApp number already used",
      });
    }

    let referredBy = null;
    let referrer = null;
    let newUserRole = "user";
    let superReferrer = null;

    if (referral) {
      referrer = await Admin.findOne({
        referralCode: String(referral).trim().toUpperCase(),
      });

      if (!referrer) {
        return res.status(400).json({
          message: "Invalid referral code",
        });
      }

      referredBy = referrer._id;

      if (referrer.role === "super-affiliate") {
        newUserRole = "master-affiliate";
      } else if (referrer.role === "master-affiliate") {
        newUserRole = "user";
      }
    }

    const username = await createUniqueUsername();
    const hashedPassword = await bcrypt.hash(password, 10);

    const isActive = newUserRole === "master-affiliate" ? false : true;

    const user = new Admin({
      username,
      whatsapp: cleanWhatsapp,
      password: hashedPassword,
      role: newUserRole,
      referredBy,
      isActive,
    });

    const savedUser = await user.save();

    if (referredBy && referrer) {
      const updateReferrer = {
        $push: {
          createdUsers: savedUser._id,
        },
      };

      if (newUserRole === "master-affiliate") {
        updateReferrer.$push.pendingRequests = savedUser._id;
      }

      await Admin.findByIdAndUpdate(referredBy, updateReferrer);

      if (newUserRole === "user" && referrer.role === "master-affiliate") {
        const referBonus = Number(referrer.referCommission || 0);

        if (referBonus > 0) {
          await Admin.findByIdAndUpdate(referredBy, {
            $inc: {
              referCommissionBalance: referBonus,
            },
          });

          if (referrer.referredBy) {
            superReferrer = await Admin.findById(referrer.referredBy);

            if (superReferrer && superReferrer.role === "super-affiliate") {
              const superBonusAmount = Number(
                superReferrer.referCommission || 0
              );
              const superReferBonus = superBonusAmount - referBonus;

              if (superReferBonus > 0) {
                await Admin.findByIdAndUpdate(superReferrer._id, {
                  $inc: {
                    referCommissionBalance: superReferBonus,
                  },
                });
              }
            }
          }
        }
      }
    }

    const token = generateToken(savedUser);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: savedUser._id,
        _id: savedUser._id,
        username: savedUser.username,
        whatsapp: savedUser.whatsapp,
        role: savedUser.role,
        isActive: savedUser.isActive,
        balance: savedUser.balance || 0,
        currency: savedUser.currency || "BDT",
        userGamePlayName: savedUser.userGamePlayName || null,
        referralCode: savedUser.referralCode,
        referralLink: `${process.env.VITE_CLIENT_URL}/register?ref=${savedUser.referralCode}`,
      },
    });
  } catch (err) {
    console.error("Register error:", err);

    if (err?.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "field";
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      });
    }

    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
});

// POST /login
router.post("/login", async (req, res) => {
  const { whatsapp, password } = req.body;

  try {
    if (!whatsapp || !password) {
      return res.status(400).json({
        message: "WhatsApp and password required",
      });
    }

    const user = await Admin.findOne({
      whatsapp: whatsapp.trim(),
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Account is pending approval",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        _id: user._id,
        username: user.username,
        whatsapp: user.whatsapp,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        balance: user.balance || 0,
        currency: user.currency || "BDT",
        userGamePlayName: user.userGamePlayName || null,
        referralCode: user.referralCode,
        referralLink: `${process.env.VITE_CLIENT_URL}/register?ref=${user.referralCode}`,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
});

// POST /aff-login
router.post("/aff-login", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password required",
      });
    }

    const user = await Admin.findOne({
      username: String(username).trim(),
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Account is pending approval",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    return res.json({
      message: "Login successful",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        whatsapp: user.whatsapp,
        email: user.email,
        role: user.role,
        isActive: user.isActive,

        balance: user.balance || 0,
        commissionBalance: user.commissionBalance || 0,

        referralCode: user.referralCode,
        referralLink: `${process.env.VITE_CLIENT_URL}/register?ref=${user.referralCode}`,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Server error",
    });
  }
});

// routes/admin.js
router.get("/admin", async (req, res) => {
  try {
    const id = String(
      req.query.id || "",
    ).trim();

    if (!id) {
      return res.status(401).json({
        success: false,
        message: "No user ID",
      });
    }

    const user = await Admin.findById(id)
      .select("-password")
      .populate({
        path: "pendingRequests",

        /**
         * Password কখনো response-এ পাঠানো হবে না।
         */
        select:
          "username email whatsapp balance isActive gameWinCommission gameLossCommission depositCommission referCommission commissionBalance",
      })
      .populate({
        path: "createdUsers",

        select:
          "username email whatsapp balance isActive gameWinCommission gameLossCommission depositCommission referCommission commissionBalance",
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /**
     * Main balance-এর সঙ্গে Nine Wicket returned balance
     * sync এবং exposure read করা হবে।
     */
    let balanceData = {
      balance: toMoney(user.balance),

      exposureBalance: 0,

      totalBalance: toMoney(user.balance),

      nineWicket:
        getDefaultNineWicketData(user),
    };

    try {
      balanceData =
        await syncNineWicketBalance(user);
    } catch (syncError) {
      console.error(
        "Admin Nine Wicket balance sync error:",
        syncError.message,
      );
    }

    const userData = user.toObject();

    /**
     * Existing client compatibility:
     * user.balance একই জায়গাতেই থাকবে।
     */
    userData.balance =
      balanceData.balance;

    /**
     * Nine Wicket exposure।
     */
    userData.exposureBalance =
      balanceData.exposureBalance;

    /**
     * Main balance + active exposure।
     */
    userData.totalBalance =
      balanceData.totalBalance;

    userData.nineWicket =
      balanceData.nineWicket;

    userData.nineWicketUsername =
      user.nineWicketUsername || null;

    userData.userGamePlayName =
      user.userGamePlayName || null;

    return res.status(200).json({
      success: true,

      user: userData,

      /**
       * Top-level field-ও রাখা হয়েছে।
       */
      balance: balanceData.balance,

      exposureBalance:
        balanceData.exposureBalance,

      totalBalance:
        balanceData.totalBalance,

      currency:
        user.currency || "BDT",

      nineWicket:
        balanceData.nineWicket,
    });
  } catch (error) {
    console.error(
      "GET ADMIN/USER BALANCE ERROR:",
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Failed to load user balance",
    });
  }
});

// GET /api/admin/count-users → Total normal users (role: "user")
router.get("/count-users", async (req, res) => {
  try {
    const count = await Admin.countDocuments({ role: "user" });
    res.json({
      success: true,
      count: count,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/admin/count-affiliates → Total affiliates (super-affiliate + master-affiliate)
router.get("/count-affiliates", async (req, res) => {
  try {
    const count = await Admin.countDocuments({
      role: { $in: ["super-affiliate", "master-affiliate"] },
    });
    res.json({
      success: true,
      count: count,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PATCH: Approve / Update commissions (super-affiliate & master উভয়ের জন্য)
router.patch("/approve-user/:id", async (req, res) => {
  const { id } = req.params;
  const {
    gameLossCommission = 0,
    depositCommission = 0,
    referCommission = 0,
    gameWinCommission = 0, // ← নতুন
  } = req.body;

  try {
    const user = await Admin.findByIdAndUpdate(
      id,
      {
        isActive: true,
        gameLossCommission: Number(gameLossCommission),
        depositCommission: Number(depositCommission),
        referCommission: Number(referCommission),
        gameWinCommission: Number(gameWinCommission), // ← নতুন
      },
      { new: true },
    ).select(
      "username email whatsapp isActive gameLossCommission depositCommission referCommission gameWinCommission commissionBalance",
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.referredBy) {
      await Admin.findByIdAndUpdate(user.referredBy, {
        $pull: { pendingRequests: id },
      });
    }

    res.json({ message: "User updated & activated", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /deactivate-user/:id
router.patch("/deactivate-user/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const user = await Admin.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User deactivated", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/profile", async (req, res) => {
  try {
    const { userId, firstName, lastName, username, email, whatsapp, password } =
      req.body;

    // userId ছাড়া হলে এরর
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const user = await Admin.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // আপডেট ফিল্ড
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.username = username || user.username;
    user.email = email || user.email;
    user.whatsapp = whatsapp || user.whatsapp;

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    // রেসপন্স
    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      whatsapp: user.whatsapp,
      referralCode: user.referralCode,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/pending-affiliates-count", async (req, res) => {
  try {
    const [superCount, masterCount] = await Promise.all([
      Admin.countDocuments({
        role: "super-affiliate",
        isActive: false,
      }),
      Admin.countDocuments({
        role: "master-affiliate",
        isActive: false,
      }),
    ]);

    const totalPending = superCount + masterCount;

    res.status(200).json({
      success: true,
      totalPending,
      breakdown: {
        superAffiliate: superCount,
        masterAffiliate: masterCount,
      },
      message: `${totalPending} pending affiliate requests (super: ${superCount}, master: ${masterCount})`,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// POST /api/update-user-credentials/:id
router.patch("/update-master-affiliate-credentials/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;

    const user = await Admin.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ইউজারনেম আপডেট
    if (username && username !== user.username) {
      const existing = await Admin.findOne({ username });
      if (existing)
        return res.status(400).json({ message: "Username already taken" });
      user.username = username;
    }

    // পাসওয়ার্ড আপডেট (যদি দেওয়া থাকে)
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();
    res.json({ message: "User updated successfully", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// routes/admin.js
router.get("/super-affiliates", async (req, res) => {
  try {
    const superAffiliates = await Admin.find({
      role: "super-affiliate",
    }).select(
      "username email whatsapp balance password isActive referCommissionBalance depositCommissionBalance gameWinCommissionBalance gameLossCommissionBalance gameLossCommission gameWinCommission depositCommission referCommission commissionBalance",
    );

    res.json({ users: superAffiliates });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// routes/admin.js
router.get("/master-affiliates", async (req, res) => {
  try {
    const masterAffiliates = await Admin.find({
      role: "master-affiliate",
    }).select(
      "username email whatsapp balance password isActive referCommissionBalance depositCommissionBalance gameWinCommissionBalance gameLossCommissionBalance gameWinCommission gameLossCommission depositCommission referCommission commissionBalance",
    );

    res.json({ users: masterAffiliates });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST: Create New Super Affiliate
router.post("/create/super-affiliates", async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      whatsapp,
      gameLossCommission,
      depositCommission,
      referCommission,
      gameWinCommission, // ← নতুন
    } = req.body;

    // Validation
    if (!username || !email || !password || !whatsapp) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled" });
    }

    const existingUser = await Admin.findOne({
      $or: [{ username }, { email }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Username or Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new Admin({
      username,
      email,
      password: hashedPassword,
      whatsapp,
      role: "super-affiliate",
      gameLossCommission: parseFloat(gameLossCommission) || 0,
      depositCommission: parseFloat(depositCommission) || 0,
      referCommission: parseFloat(referCommission) || 0,
      gameWinCommission: parseFloat(gameWinCommission) || 0, // ← নতুন
      isActive: false,
    });

    await newUser.save();

    res.status(201).json({
      message: "Super Affiliate created successfully",
      user: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        whatsapp: newUser.whatsapp,
        role: newUser.role,
        isActive: newUser.isActive,
      },
    });
  } catch (error) {
    console.error("Create Super Affiliate Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST: Create New Master Affiliate
router.post("/create/master-affiliates", async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      whatsapp,
      gameLossCommission,
      depositCommission,
      referCommission,
      gameWinCommission, // নতুন যোগ করা
      referredBy, // Super Affiliate ID
    } = req.body;

    // Validation
    if (!username || !email || !password || !whatsapp || !referredBy) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled" });
    }

    // Check if username or email already exists
    const existingUser = await Admin.findOne({
      $or: [{ username }, { email }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Username or Email already exists" });
    }

    // Check if referredBy (Super Affiliate) exists and is valid
    const superAffiliate = await Admin.findById(referredBy);
    if (!superAffiliate || superAffiliate.role !== "super-affiliate") {
      return res.status(400).json({ message: "Invalid Super Affiliate" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new Master Affiliate
    const newMaster = new Admin({
      username,
      email,
      password: hashedPassword,
      whatsapp,
      role: "master-affiliate",
      gameLossCommission: parseFloat(gameLossCommission) || 0,
      depositCommission: parseFloat(depositCommission) || 0,
      referCommission: parseFloat(referCommission) || 0,
      gameWinCommission: parseFloat(gameWinCommission) || 0, // নতুন
      referredBy: superAffiliate._id,
      isActive: false,
    });

    await newMaster.save();

    // Add new master to super affiliate's createdUsers array
    await Admin.findByIdAndUpdate(superAffiliate._id, {
      $push: { createdUsers: newMaster._id },
    });

    res.status(201).json({
      message: "Master Affiliate created successfully",
      user: {
        _id: newMaster._id,
        username: newMaster.username,
        email: newMaster.email,
        role: newMaster.role,
        referredBy: superAffiliate.username,
      },
    });
  } catch (error) {
    console.error("Create Master Affiliate Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET all normal users
router.get("/users", async (req, res) => {
  try {
    const users = await Admin.find({ role: "user" }).select("-password");
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    const user = await Admin.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    const updates = { ...req.body };

    // 🔐 Password handle
    if (updates.password && updates.password.trim() !== "") {
      updates.password = await bcrypt.hash(updates.password, 10);
    } else {
      delete updates.password;
    }

    // 📧 Email handle (🔥 THIS IS THE FIX)
    if (!updates.email || updates.email.trim() === "") {
      delete updates.email; // empty হলে update করবে না
    }

    const updatedUser = await Admin.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true },
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updatedUser);
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// CREATE normal user
router.post("/create/user", async (req, res) => {
  const {
    username,
    email,
    password,
    whatsapp,
    referredBy,
    gameLossCommission,
    depositCommission,
    referCommission,
  } = req.body;

  if (!username || !email || !password || !whatsapp || !referredBy)
    return res.status(400).json({ message: "All fields required" });

  const exists = await Admin.findOne({ $or: [{ username }, { email }] });
  if (exists)
    return res.status(400).json({ message: "Username or email exists" });

  const master = await Admin.findById(referredBy);
  if (!master || master.role !== "master-affiliate")
    return res.status(400).json({ message: "Invalid Master Affiliate" });

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(password, salt);

  const newUser = new Admin({
    username,
    email,
    password: hashed,
    whatsapp,
    role: "user",
    gameLossCommission: parseFloat(gameLossCommission) || 0,
    depositCommission: parseFloat(depositCommission) || 0,
    referCommission: parseFloat(referCommission) || 0,
    referredBy: master._id,
    isActive: true,
  });

  await newUser.save();
  await Admin.findByIdAndUpdate(master._id, {
    $push: { createdUsers: newUser._id },
  });

  res.status(201).json({ message: "User created", user: newUser });
});

// Toggle active
router.patch("/toggle-user/:id", async (req, res) => {
  await Admin.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive });
  res.json({ message: "Updated" });
});

// Update credentials
router.patch("/update-user-credentials/:id", async (req, res) => {
  const { username, password } = req.body;
  const update = {};
  if (username) update.username = username;
  if (password) {
    const salt = await bcrypt.genSalt(10);
    update.password = await bcrypt.hash(password, salt);
  }
  await Admin.findByIdAndUpdate(req.params.id, update);
  res.json({ message: "Updated" });
});

// PATCH: Update User Commission
router.patch("/update-user-commission/:id", async (req, res) => {
  try {
    const { gameLossCommission, depositCommission, referCommission } = req.body;
    await Admin.findByIdAndUpdate(req.params.id, {
      gameLossCommission: parseFloat(gameLossCommission) || 0,
      depositCommission: parseFloat(depositCommission) || 0,
      referCommission: parseFloat(referCommission) || 0,
    });
    res.json({ message: "Commission updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// routes/profile.js বা যেখানে রাখো
router.put("/update-name", async (req, res) => {
  try {
    const { userId, firstName, lastName, username, email } = req.body;

    // userId ছাড়া হলে এরর
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const user = await Admin.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // আপডেট ফিল্ড
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.username = username || user.username;
    user.email = email || user.email;

    await user.save();

    // রেসপন্স
    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Update Password
router.put("/update-password", async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find user
    const user = await Admin.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Current password is incorrect" });

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET: Fetch all wallets of a user
router.get("/wallets/:userId", async (req, res) => {
  try {
    const user = await Admin.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
    res.json({ success: true, data: user.wallets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// POST: Add a new wallet
router.post("/wallets", async (req, res) => {
  try {
    const { userId, methodId, processTab, inputs } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, msg: "userId is required" });
    }

    const user = await Admin.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    if (user.wallets.length >= 5) {
      return res
        .status(400)
        .json({ success: false, msg: "Maximum 5 wallets allowed" });
    }

    user.wallets.push({
      methodId,
      processTab,
      inputs, // array of { name, value, label, labelBD }
    });

    await user.save();

    res.json({ success: true, data: user.wallets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// PUT: Update an existing wallet by wallet _id
router.put("/wallets/:walletId", async (req, res) => {
  try {
    const { userId, methodId, processTab, inputs } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, msg: "userId is required" });
    }

    const user = await Admin.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const wallet = user.wallets.id(req.params.walletId);
    if (!wallet) {
      return res.status(404).json({ success: false, msg: "Wallet not found" });
    }

    // Update fields if provided
    if (methodId !== undefined) wallet.methodId = methodId;
    if (processTab !== undefined) wallet.processTab = processTab;
    if (inputs !== undefined) wallet.inputs = inputs;

    await user.save();

    res.json({ success: true, data: user.wallets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// DELETE: Delete a wallet by wallet _id
router.delete("/wallets/:walletId", async (req, res) => {
  try {
    const { userId } = req.query; // or req.body.userId

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, msg: "userId is required" });
    }

    const user = await Admin.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const walletIndex = user.wallets.findIndex(
      (w) => w._id.toString() === req.params.walletId,
    );

    if (walletIndex === -1) {
      return res.status(404).json({ success: false, msg: "Wallet not found" });
    }

    user.wallets.splice(walletIndex, 1);
    await user.save();

    res.json({ success: true, data: user.wallets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// 1. POST /api/super-affiliate/bridge/:id
router.post("/super-affiliate/bridge/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const superAff = await Admin.findOne({ _id: id, role: "super-affiliate" });
    if (!superAff) {
      return res
        .status(404)
        .json({ success: false, message: "Super Affiliate not found" });
    }

    let {
      gameWinCommissionBalance = 0,
      gameLossCommissionBalance = 0,
      depositCommissionBalance = 0,
      referCommissionBalance = 0,
    } = superAff;

    // শুধু ৩টা ব্যালেন্সের যোগফল
    const positiveSum =
      gameLossCommissionBalance +
      depositCommissionBalance +
      referCommissionBalance;

    // gameWin বিয়োগ করে result
    const result = positiveSum - gameWinCommissionBalance;

    if (result <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "No positive balance available after subtracting gameWin (result ≤ 0)",
      });
    }

    // result কে ৩ ভাগ করে → নতুন ব্যালেন্স হবে শুধু এই share
    const share = result / 3;

    const updated = await Admin.findByIdAndUpdate(
      id,
      {
        $set: {
          gameWinCommissionBalance: 0,
          gameLossCommissionBalance: share,
          depositCommissionBalance: share,
          referCommissionBalance: share,
        },
      },
      { new: true },
    );

    res.json({
      success: true,
      message: "Bridge completed - balances reset to equal share",
      data: {
        previous: {
          gameWin: gameWinCommissionBalance.toFixed(2),
          gameLoss: gameLossCommissionBalance.toFixed(2),
          deposit: depositCommissionBalance.toFixed(2),
          refer: referCommissionBalance.toFixed(2),
        },
        subtractedFromWin: gameWinCommissionBalance.toFixed(2),
        resultAfterSubtraction: result.toFixed(2),
        sharePerBalance: share.toFixed(2),
        newBalances: {
          gameWin: 0,
          gameLoss: updated.gameLossCommissionBalance.toFixed(2),
          deposit: updated.depositCommissionBalance.toFixed(2),
          refer: updated.referCommissionBalance.toFixed(2),
        },
      },
    });
  } catch (err) {
    console.error("Bridge error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 2. POST /api/super-affiliate/bridge-all (Bulk)
router.post("/super-affiliate/bridge-all", async (req, res) => {
  try {
    const superAffiliates = await Admin.find({ role: "super-affiliate" });
    if (superAffiliates.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No super affiliates found" });
    }

    const results = [];

    for (const aff of superAffiliates) {
      let {
        _id,
        username,
        gameWinCommissionBalance = 0,
        gameLossCommissionBalance = 0,
        depositCommissionBalance = 0,
        referCommissionBalance = 0,
      } = aff;

      const positiveSum =
        gameLossCommissionBalance +
        depositCommissionBalance +
        referCommissionBalance;
      const result = positiveSum - gameWinCommissionBalance;

      if (result <= 0) {
        results.push({
          id: _id,
          username,
          status: "skipped",
          reason: "No positive balance after subtracting gameWin",
        });
        continue;
      }

      const share = result / 3;

      const updated = await Admin.findByIdAndUpdate(
        _id,
        {
          $set: {
            gameWinCommissionBalance: 0,
            gameLossCommissionBalance: share,
            depositCommissionBalance: share,
            referCommissionBalance: share,
          },
        },
        { new: true },
      );

      results.push({
        id: _id,
        username,
        status: "success",
        subtractedFromWin: gameWinCommissionBalance.toFixed(2),
        result: result.toFixed(2),
        sharePerBalance: share.toFixed(2),
        newBalances: {
          gameWin: 0,
          gameLoss: updated.gameLossCommissionBalance.toFixed(2),
          deposit: updated.depositCommissionBalance.toFixed(2),
          refer: updated.referCommissionBalance.toFixed(2),
        },
      });
    }

    res.json({
      success: true,
      message: `Bridge processed for ${results.filter((r) => r.status === "success").length} users`,
      results,
    });
  } catch (err) {
    console.error("Bulk bridge error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error during bulk bridge" });
  }
});

// 1. POST /api/master-affiliate/bridge/:id
router.post("/master-affiliate/bridge/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const masterAff = await Admin.findOne({
      _id: id,
      role: "master-affiliate",
    });
    if (!masterAff) {
      return res
        .status(404)
        .json({ success: false, message: "Master Affiliate not found" });
    }

    let {
      gameWinCommissionBalance = 0,
      gameLossCommissionBalance = 0,
      depositCommissionBalance = 0,
      referCommissionBalance = 0,
    } = masterAff;

    const positiveSum =
      gameLossCommissionBalance +
      depositCommissionBalance +
      referCommissionBalance;
    const result = positiveSum - gameWinCommissionBalance;

    if (result <= 0) {
      return res.status(400).json({
        success: false,
        message: "No positive balance after subtracting gameWin (result ≤ 0)",
      });
    }

    const share = result / 3;

    const updated = await Admin.findByIdAndUpdate(
      id,
      {
        $set: {
          gameWinCommissionBalance: 0,
          gameLossCommissionBalance: share,
          depositCommissionBalance: share,
          referCommissionBalance: share,
        },
      },
      { new: true },
    );

    res.json({
      success: true,
      message: "Bridge completed for Master Affiliate",
      data: {
        previous: {
          gameWin: gameWinCommissionBalance.toFixed(2),
          gameLoss: gameLossCommissionBalance.toFixed(2),
          deposit: depositCommissionBalance.toFixed(2),
          refer: referCommissionBalance.toFixed(2),
        },
        result: result.toFixed(2),
        sharePerBalance: share.toFixed(2),
        newBalances: {
          gameWin: 0,
          gameLoss: updated.gameLossCommissionBalance.toFixed(2),
          deposit: updated.depositCommissionBalance.toFixed(2),
          refer: updated.referCommissionBalance.toFixed(2),
        },
      },
    });
  } catch (err) {
    console.error("Master Bridge error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 2. POST /api/master-affiliate/bridge-all
router.post("/master-affiliate/bridge-all", async (req, res) => {
  try {
    const masterAffiliates = await Admin.find({ role: "master-affiliate" });
    if (masterAffiliates.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No master affiliates found" });
    }

    const results = [];

    for (const aff of masterAffiliates) {
      let {
        _id,
        username,
        gameWinCommissionBalance = 0,
        gameLossCommissionBalance = 0,
        depositCommissionBalance = 0,
        referCommissionBalance = 0,
      } = aff;

      const positiveSum =
        gameLossCommissionBalance +
        depositCommissionBalance +
        referCommissionBalance;
      const result = positiveSum - gameWinCommissionBalance;

      if (result <= 0) {
        results.push({
          id: _id,
          username,
          status: "skipped",
          reason: "No positive balance after subtracting gameWin",
        });
        continue;
      }

      const share = result / 3;

      const updated = await Admin.findByIdAndUpdate(
        _id,
        {
          $set: {
            gameWinCommissionBalance: 0,
            gameLossCommissionBalance: share,
            depositCommissionBalance: share,
            referCommissionBalance: share,
          },
        },
        { new: true },
      );

      results.push({
        id: _id,
        username,
        status: "success",
        result: result.toFixed(2),
        sharePerBalance: share.toFixed(2),
        newBalances: {
          gameWin: 0,
          gameLoss: updated.gameLossCommissionBalance.toFixed(2),
          deposit: updated.depositCommissionBalance.toFixed(2),
          refer: updated.referCommissionBalance.toFixed(2),
        },
      });
    }

    res.json({
      success: true,
      message: `Bridge processed for ${results.filter((r) => r.status === "success").length} master affiliates`,
      results,
    });
  } catch (err) {
    console.error("Bulk Master Bridge error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error during bulk bridge" });
  }
});

export default router;
