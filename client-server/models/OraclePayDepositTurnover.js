import mongoose from "mongoose";

const oraclePayDepositTurnoverSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },

    oraclePayDeposit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OraclePayDeposit",
      required: true,
      unique: true,
    },

    depositAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    bonusAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalCreditedAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    turnoverMultiplier: {
      type: Number,
      required: true,
      min: 0,
    },

    requiredTurnover: {
      type: Number,
      required: true,
      min: 0,
    },

    completedTurnover: {
      type: Number,
      default: 0,
      min: 0,
    },

    remainingTurnover: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["active", "completed", "expired", "cancelled"],
      default: "active",
      index: true,
    },

    activatedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: {
      type: Date,
    },

    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "OraclePayDepositTurnover",
  oraclePayDepositTurnoverSchema
);