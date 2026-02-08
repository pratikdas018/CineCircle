import mongoose from "mongoose";
import dotenv from "dotenv";
import Review from "./models/Review.js";

dotenv.config();

const migrateReviews = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in .env file");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected.");

    console.log("Migrating reviews...");
    const result = await Review.updateMany(
      { maxRating: { $exists: false } },
      { $set: { maxRating: 5 } }
    );

    console.log(`Migration complete.`);
    console.log(`Matched documents: ${result.matchedCount}`);
    console.log(`Modified documents: ${result.modifiedCount}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrateReviews();