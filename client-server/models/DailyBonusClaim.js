import mongoose from "mongoose";

const { Schema } = mongoose;

const dailyBonusClaimSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },

    userIdentity: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    setting: {
      type: Schema.Types.ObjectId,
      ref: "DailyBonusSetting",
      required: true,
      index: true,
    },

    settingTitle: {
      bn: { type: String, default: "" },
      en: { type: String, default: "" },
    },

    periodDays: {
      type: Number,
      required: true,
      min: 1,
    },

    periodStart: {
      type: Date,
      required: true,
      index: true,
    },

    periodEnd: {
      type: Date,
      required: true,
      index: true,
    },

    claimAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["claimed", "cancelled"],
      default: "claimed",
      index: true,
    },

    claimedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);

dailyBonusClaimSchema.index(
  { user: 1, setting: 1, periodStart: 1, periodEnd: 1 },
  { unique: true },
);

dailyBonusClaimSchema.index({ user: 1, claimedAt: -1 });
dailyBonusClaimSchema.index({ userIdentity: 1, claimedAt: -1 });
dailyBonusClaimSchema.index({ setting: 1, claimedAt: -1 });

const DailyBonusClaim = mongoose.model(
  "DailyBonusClaim",
  dailyBonusClaimSchema,
);

export default DailyBonusClaim;
