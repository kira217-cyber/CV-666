import mongoose from "mongoose";

const nineWicketWalletSchema = new mongoose.Schema(
  {
    /**
     * এই project-এর user model হলো Admin।
     * প্রত্যেক user-এর জন্য একটি Nine Wicket wallet থাকবে।
     */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      unique: true,
    },

    /**
     * User-এর 6-letter Nine Wicket username।
     */
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 6,
      maxlength: 6,
    },

    /**
     * Main balance থেকে Nine Wicket-এ মোট transfer।
     */
    totalTransferred: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * Nine Wicket থেকে main balance-এ মোট ফেরত এসেছে।
     */
    totalReturned: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * User-এর বর্তমান active exposure।
     * এটি callback route থেকে update হবে।
     */
    exposureBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * সর্বশেষ Nine Wicket transfer amount।
     */
    lastTransferAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * সর্বশেষ Nine Wicket returned amount।
     */
    lastReturnedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * সর্বশেষ transfer-এর সময়।
     */
    lastTransferAt: {
      type: Date,
      default: null,
    },

    /**
     * সর্বশেষ balance return-এর সময়।
     */
    lastReturnedAt: {
      type: Date,
      default: null,
    },

    /**
     * Nine Wicket API-এর সঙ্গে সর্বশেষ sync-এর সময়।
     */
    lastSyncAt: {
      type: Date,
      default: null,
    },

    /**
     * idle    = এখনো transfer হয়নি
     * playing = balance transfer হয়েছে
     * exposure = active exposure রয়েছে
     * settled = game/bet settlement সম্পন্ন
     */
    status: {
      type: String,
      enum: ["idle", "playing", "exposure", "settled"],
      default: "idle",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("NineWicketWallet", nineWicketWalletSchema);
