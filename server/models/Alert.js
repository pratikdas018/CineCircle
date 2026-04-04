import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    imdbID: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    poster: {
      type: String,
      default: "",
      trim: true,
    },
    platforms: {
      type: [String],
      required: true,
      default: [],
    },
    isNotified: {
      type: Boolean,
      default: false,
    },
    availableOn: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

alertSchema.index({ userId: 1, imdbID: 1 }, { unique: true });

export default mongoose.model("Alert", alertSchema);
