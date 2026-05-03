import mongoose from "mongoose";

const GameProviderSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    providerId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    providerIcon: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

GameProviderSchema.index({ categoryId: 1, providerId: 1 }, { unique: true });

export default mongoose.model("GameProvider", GameProviderSchema);