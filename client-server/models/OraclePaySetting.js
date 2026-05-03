import mongoose from "mongoose";

const oraclePayBonusSchema = new mongoose.Schema(
  {
    title: {
      bn: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
    },

    bonusType: {
      type: String,
      enum: ["fixed", "percent"],
      required: true,
      default: "fixed",
    },

    bonusValue: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    turnoverMultiplier: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true },
);

const oraclePaySettingSchema = new mongoose.Schema(
  {
    businessToken: {
      type: String,
      default: "",
      trim: true,
    },

    active: {
      type: Boolean,
      default: false,
    },

    minAmount: {
      type: Number,
      default: 5,
      min: 0,
    },

    maxAmount: {
      type: Number,
      default: 0,
      min: 0, // 0 means unlimited
    },

    bonuses: {
      type: [oraclePayBonusSchema],
      default: [],
    },
  },
  { timestamps: true },
);

export default mongoose.model("OraclePaySetting", oraclePaySettingSchema);
