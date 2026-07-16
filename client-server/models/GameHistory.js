import mongoose from "mongoose";

const { Schema } = mongoose;

const gameHistorySchema = new Schema(
  {
    /**
     * ==========================================
     * USER INFORMATION
     * ==========================================
     */

    user: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },

    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    /**
     * Normal Oracle game username।
     * Nine Wicket history হলে empty string থাকবে।
     */
    userGamePlayName: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      index: true,
    },

    /**
     * Nine Wicket-এর 6-letter username।
     * Normal Oracle history হলে empty string থাকবে।
     */
    nineWicketUsername: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      index: true,
    },

    /**
     * Provider callback থেকে পাওয়া original member account।
     */
    member_account: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    currency: {
      type: String,
      default: "BDT",
      trim: true,
      uppercase: true,
    },

    userRole: {
      type: String,
      default: "user",
      index: true,
    },

    /**
     * ==========================================
     * PROVIDER INFORMATION
     * ==========================================
     */

    provider: {
      type: String,
      enum: ["oracle", "ninewicket"],
      default: "oracle",
      required: true,
      index: true,
    },

    game_uid: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    /**
     * একই game_round-এর জন্য একাধিক callback আসতে পারবে।
     * তাই game_round unique রাখা হয়নি।
     */
    game_round: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    /**
     * শুধু serial_number unique থাকবে।
     */
    serial_number: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    /**
     * ==========================================
     * BET INFORMATION
     * ==========================================
     */

    bet_amount: {
      type: Number,
      required: true,
      min: 0,
    },

    win_amount: {
      type: Number,
      required: true,
      min: 0,
    },

    net_amount: {
      type: Number,
      required: true,
    },

    resultType: {
      type: String,
      enum: ["win", "loss", "push"],
      required: true,
      index: true,
    },

    balance_before: {
      type: Number,
      required: true,
    },

    balance_after: {
      type: Number,
      required: true,
    },

    /**
     * ==========================================
     * NINE WICKET INFORMATION
     * ==========================================
     */

    /**
     * Nine Wicket bet ID।
     */
    nineWicketBetId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    /**
     * Nine Wicket bet status।
     * যেমন: Open, Settled
     */
    nineWicketBetStatus: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    /**
     * Callback-এর matchStake অথবা matchAmount
     * normalize করে এই field-এ রাখা হবে।
     */
    matchStake: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * Nine Wicket callback-এর profit/loss।
     */
    profitLoss: {
      type: Number,
      default: 0,
    },

    /**
     * Nine Wicket event information।
     */
    eventTypeName: {
      type: String,
      default: "",
      trim: true,
    },

    eventName: {
      type: String,
      default: "",
      trim: true,
    },

    marketName: {
      type: String,
      default: "",
      trim: true,
    },

    competitionName: {
      type: String,
      default: "",
      trim: true,
    },

    /**
     * এই callback-এর কারণে exposure কত পরিবর্তন হয়েছে।
     *
     * Positive value = exposure যোগ হয়েছে
     * Negative value = exposure বাদ হয়েছে
     */
    exposureChange: {
      type: Number,
      default: 0,
    },

    /**
     * Callback process হওয়ার পর user-এর total exposure।
     */
    exposureAfter: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    /**
     * ==========================================
     * AFFILIATE INFORMATION
     * ==========================================
     */

    /**
     * Callback processing-এর সময় affiliate commission-এর
     * result এখানে সংরক্ষণ করা যাবে।
     */
    affiliateInfo: {
      type: Schema.Types.Mixed,
      default: null,
    },

    /**
     * ==========================================
     * CALLBACK INFORMATION
     * ==========================================
     */

    oracleTimestamp: {
      type: String,
      default: "",
      trim: true,
    },

    /**
     * Provider থেকে পাওয়া সম্পূর্ণ callback payload।
     */
    rawPayload: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

const GameHistory =
  mongoose.models.GameHistory ||
  mongoose.model("GameHistory", gameHistorySchema);

export default GameHistory;
