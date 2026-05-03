import mongoose from "mongoose";

const oraclePayDepositSchema = new mongoose.Schema(
  {
    userIdentity: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED"],
      default: "PENDING",
      index: true,
    },

    checkoutItems: {
      type: Object,
      default: {},
    },

    // selected bonus snapshot
    bonusId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    bonusTitle: {
      bn: { type: String, default: "", trim: true },
      en: { type: String, default: "", trim: true },
    },

    bonusType: {
      type: String,
      enum: ["none", "fixed", "percent"],
      default: "none",
    },

    bonusValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    bonusAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    turnoverMultiplier: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalCreditedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    requiredTurnover: {
      type: Number,
      default: 0,
      min: 0,
    },

    turnoverCreated: {
      type: Boolean,
      default: false,
    },

    // webhook response fields
    transactionId: {
      type: String,
      default: "",
      trim: true,
    },

    sessionCode: {
      type: String,
      default: "",
      trim: true,
    },

    bank: {
      type: String,
      default: "",
      trim: true,
    },

    footprint: {
      type: String,
      default: "",
      trim: true,
    },

    paidAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

export default mongoose.model("OraclePayDeposit", oraclePayDepositSchema);
