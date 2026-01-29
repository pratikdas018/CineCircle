import mongoose from "mongoose";

const watchlistSchema = new mongoose.Schema(
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
    title: String,
    posterPath: String,
    releaseDate: String,
  },
  { timestamps: true }
);

export default mongoose.model("Watchlist", watchlistSchema);
