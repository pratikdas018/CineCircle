import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    movieId: {
      type: String, // Changed to String to support IMDb IDs (e.g., "tt1234567")
      required: true,
    },
    movieTitle: {
      type: String,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    maxRating: {
      type: Number,
      default: 5,
    },
    comment: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Review", reviewSchema);
