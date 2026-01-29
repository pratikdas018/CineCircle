import Review from "../models/Review.js";
import User from "../models/User.js";
import Watchlist from "../models/Watchlist.js";


// ➕ Add or Update Review
export const addReview = async (req, res) => {
  try {
    const { movieId, movieTitle, rating, comment } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    let review = await Review.findOne({
      user: req.user._id,
      movieId,
    });

    if (review) {
      // Update existing review
      review.rating = rating;
      review.comment = comment;
      if (movieTitle) review.movieTitle = movieTitle;
      if (image) review.image = image;
      await review.save();
      return res.json(review);
    }

    review = await Review.create({
      user: req.user._id,
      movieId,
      movieTitle,
      rating,
      comment,
      image,
    });

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📥 Get Reviews for a Movie
export const getMovieReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ movieId: req.params.movieId })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 });

    // Optimization: Fetch all watchlisted users for this movie in one query
    const userIds = reviews.map(r => r.user._id);
    const watchlistedUsers = await Watchlist.find({
      movieId: req.params.movieId,
      user: { $in: userIds }
    }).distinct('user');

    const watchlistedSet = new Set(watchlistedUsers.map(id => id.toString()));

    const reviewsWithVerification = reviews.map(review => ({
      ...review.toObject(),
      isVerified: watchlistedSet.has(review.user._id.toString())
    }));

    res.json(reviewsWithVerification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//Get Review from Friends
export const getFriendsReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user._id);
    const reviews = await Review.find({ user: { $in: user.friends } })
      .populate("user", "name")
      .populate("comments.user", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ user: { $in: user.friends } });
    const hasMore = skip + reviews.length < total;

    res.json({ reviews, hasMore });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🗑️ Delete Comment from Review
export const deleteComment = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    const comment = review.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // Check ownership
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    comment.deleteOne();
    await review.save();

    const updatedReview = await Review.findById(review._id).populate("user", "name").populate("comments.user", "name");
    res.json(updatedReview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// ❌ Delete Review
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json({ message: "Review deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 💬 Add Comment to Review
export const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Comment text is required" });

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    const newComment = {
      user: req.user._id,
      text,
      createdAt: new Date()
    };

    review.comments.push(newComment);
    await review.save();

    // Populate user info for the new comment before sending back
    const updatedReview = await Review.findById(review._id).populate("user", "name").populate("comments.user", "name");
    res.json(updatedReview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✏️ Update Comment on Review
export const updateComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Comment text is required" });

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    const comment = review.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // Check ownership
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    comment.text = text;
    await review.save();

    const updatedReview = await Review.findById(review._id).populate("user", "name").populate("comments.user", "name");
    res.json(updatedReview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 👍 Like/Unlike Review
export const likeReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    const index = review.likes.indexOf(req.user._id);
    if (index === -1) {
      review.likes.push(req.user._id);
    } else {
      review.likes.splice(index, 1);
    }

    await review.save();
    res.json({ likes: review.likes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
