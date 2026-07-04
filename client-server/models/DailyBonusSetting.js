import mongoose from "mongoose";

const { Schema } = mongoose;

const dailyBonusSettingSchema = new Schema(
  {
    title: {
      bn: { type: String, default: "", trim: true },
      en: { type: String, default: "", trim: true },
    },

    periodDays: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    order: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  { timestamps: true },
);

dailyBonusSettingSchema.index({ isActive: 1, order: 1 });

const DailyBonusSetting = mongoose.model(
  "DailyBonusSetting",
  dailyBonusSettingSchema,
);

export default DailyBonusSetting;
