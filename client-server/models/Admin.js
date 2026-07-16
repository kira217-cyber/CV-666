import mongoose from "mongoose";
import refundHistory from "./refundHistory.js";
import wallets from "./Wallets.js";

const adminSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: false,
    },

    lastName: {
      type: String,
      required: false,
    },

    username: {
      type: String,
      required: true,
      unique: true,
    },

    // Email optional থাকলেও unique error হবে না
    email: {
      type: String,
      sparse: true,
      default: undefined,
    },

    /**
     * Normal Oracle games-এর username।
     * ঠিক 10টি lowercase letter হবে।
     */
    userGamePlayName: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      minlength: 10,
      maxlength: 10,
    },

    /**
     * Nine Wicket game-এর আলাদা username।
     * ঠিক 6টি lowercase letter হবে।
     */
    nineWicketUsername: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      minlength: 6,
      maxlength: 6,
    },

    whatsapp: {
      type: String,
      required: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["super-affiliate", "master-affiliate", "user"],
      default: "super-affiliate",
    },

    referralCode: {
      type: String,
      unique: true,
    },

    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    createdUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
      },
    ],

    isActive: {
      type: Boolean,
      default: false,
    },

    balance: {
      type: Number,
      default: 0,
    },

    commissionBalance: {
      type: Number,
      default: 0,
    },

    gameLossCommission: {
      type: Number,
      default: 0,
    },

    depositCommission: {
      type: Number,
      default: 0,
    },

    referCommission: {
      type: Number,
      default: 0,
    },

    gameWinCommission: {
      type: Number,
      default: 0,
    },

    gameWinCommissionBalance: {
      type: Number,
      default: 0,
    },

    gameLossCommissionBalance: {
      type: Number,
      default: 0,
    },

    depositCommissionBalance: {
      type: Number,
      default: 0,
    },

    referCommissionBalance: {
      type: Number,
      default: 0,
    },

    refundHistory: [refundHistory],

    wallets: [wallets],

    pendingRequests: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "WithdrawalRequest",
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

adminSchema.pre("save", function (next) {
  if (!this.referralCode && this._id) {
    this.referralCode = this._id.toString().slice(-6).toUpperCase();
  }

  next();
});

export default mongoose.model("Admin", adminSchema);
