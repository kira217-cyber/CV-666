import mongoose from "mongoose";

const GameSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    providerDbId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GameProvider",
      required: true,
      index: true,
    },

    gameId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    oracleImageType: {
      type: String,
      enum: ["thumbnail", "height", "original"],
      default: "thumbnail",
      required: true,
      index: true,
    },

    image: {
      type: String,
      default: "",
      trim: true,
    },

    isHot: {
      type: Boolean,
      default: false,
      index: true,
    },

    isHome: {
      type: Boolean,
      default: false,
      index: true,
    },

    isJackpot: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

GameSchema.index({ providerDbId: 1, gameId: 1 }, { unique: true });
GameSchema.index({ categoryId: 1, status: 1 });
GameSchema.index({ providerDbId: 1, status: 1 });

const Game = mongoose.models.Game || mongoose.model("Game", GameSchema);

export default Game;
