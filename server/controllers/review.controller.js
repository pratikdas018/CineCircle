import Review from "../models/Review.js";
import User from "../models/User.js";
import Watchlist from "../models/Watchlist.js";
import { createNotificationAndEmit } from "../utils/notificationRealtime.js";

const escapeRegex = (value = "") => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractMentionUsernames = (text = "") => {
  const mentionRegex = /@([\w.]+)/g;
  const usernames = new Set();

  for (const match of String(text || "").matchAll(mentionRegex)) {
    const username = String(match?.[1] || "").trim();
    if (username) usernames.add(username);
  }

  return [...usernames];
};

const getMentionedUsers = async (text) => {
  const mentionedUsernames = extractMentionUsernames(text);

  if (mentionedUsernames.length === 0) {
    return [];
  }

  const nameMatchers = mentionedUsernames.map((username) => ({
    name: { $regex: `^${escapeRegex(username)}$`, $options: "i" },
  }));

  return User.find({ $or: nameMatchers }).select("_id name");
};

const emitNotificationsSafely = async (notificationPayloads = []) => {
  const tasks = notificationPayloads
    .filter(Boolean)
    .map((payload) => createNotificationAndEmit(payload));

  if (!tasks.length) return;

  const settled = await Promise.allSettled(tasks);
  settled.forEach((result) => {
    if (result.status === "rejected") {
      console.error("Notification emit failed:", result.reason?.message || "Unknown error");
    }
  });
};

export const addReview = async (req, res) => {
  try {
    const { movieId, movieTitle, rating, comment, maxRating } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    let review = await Review.findOne({
      user: req.user._id,
      movieId,
    });

    if (review) {
      review.rating = rating;
      review.comment = comment;
      if (movieTitle) review.movieTitle = movieTitle;
      if (image) review.image = image;
      if (maxRating) review.maxRating = maxRating;
      await review.save();
      return res.json(review);
    }

    review = await Review.create({
      user: req.user._id,
      movieId,
      movieTitle,
      rating,
      maxRating: maxRating || 5,
      comment,
      image,
    });

    return res.status(201).json(review);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMovieReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ movieId: req.params.movieId })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 });

    const userIds = reviews.map((review) => review.user._id);
    const watchlistedUsers = await Watchlist.find({
      movieId: req.params.movieId,
      user: { $in: userIds },
    }).distinct("user");

    const watchlistedSet = new Set(watchlistedUsers.map((id) => id.toString()));

    const reviewsWithVerification = reviews.map((review) => ({
      ...review.toObject(),
      isVerified: watchlistedSet.has(review.user._id.toString()),
    }));

    return res.json(reviewsWithVerification);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getFriendsReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user._id);
    const reviews = await Review.find({ user: { $in: user.friends } })
      .populate("user", "name avatar")
      .populate("comments.user", "name avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ user: { $in: user.friends } });
    const hasMore = skip + reviews.length < total;

    return res.json({ reviews, hasMore });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    const comment = review.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    comment.deleteOne();
    await review.save();

    const updatedReview = await Review.findById(review._id)
      .populate("user", "name avatar")
      .populate("comments.user", "name avatar");

    return res.json(updatedReview);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    return res.json({ message: "Review deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Comment text is required" });

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    review.comments.push({
      user: req.user._id,
      text,
      createdAt: new Date(),
    });

    await review.save();

    const mentionedUsers = await getMentionedUsers(text);
    const senderId = String(req.user._id);
    const reviewOwnerId = String(review.user);
    const notifiedRecipients = new Set();
    const notificationPayloads = [];

    for (const mentionedUser of mentionedUsers) {
      const mentionedUserId = String(mentionedUser._id);
      if (!mentionedUserId || mentionedUserId === senderId || mentionedUserId === reviewOwnerId) {
        continue;
      }
      if (notifiedRecipients.has(mentionedUserId)) continue;

      notifiedRecipients.add(mentionedUserId);
      notificationPayloads.push({
        recipient: mentionedUserId,
        sender: senderId,
        type: "mention",
        reviewId: review._id,
        movieTitle: review.movieTitle,
      });
    }

    if (reviewOwnerId && reviewOwnerId !== senderId) {
      notificationPayloads.push({
        recipient: reviewOwnerId,
        sender: senderId,
        type: "comment",
        reviewId: review._id,
        movieTitle: review.movieTitle,
      });
    }

    await emitNotificationsSafely(notificationPayloads);

    const updatedReview = await Review.findById(review._id)
      .populate("user", "name avatar")
      .populate("comments.user", "name avatar");

    return res.json({ ...updatedReview.toObject(), mentionedUsers });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Comment text is required" });

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    const comment = review.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    comment.text = text;
    await review.save();

    const mentionedUsers = await getMentionedUsers(text);
    const senderId = String(req.user._id);
    const reviewOwnerId = String(review.user);
    const notifiedRecipients = new Set();
    const notificationPayloads = [];

    for (const mentionedUser of mentionedUsers) {
      const mentionedUserId = String(mentionedUser._id);
      if (!mentionedUserId || mentionedUserId === senderId || mentionedUserId === reviewOwnerId) {
        continue;
      }
      if (notifiedRecipients.has(mentionedUserId)) continue;

      notifiedRecipients.add(mentionedUserId);
      notificationPayloads.push({
        recipient: mentionedUserId,
        sender: senderId,
        type: "mention",
        reviewId: review._id,
        movieTitle: review.movieTitle,
      });
    }

    if (reviewOwnerId && reviewOwnerId !== senderId) {
      notificationPayloads.push({
        recipient: reviewOwnerId,
        sender: senderId,
        type: "comment",
        reviewId: review._id,
        movieTitle: review.movieTitle,
      });
    }

    await emitNotificationsSafely(notificationPayloads);

    const updatedReview = await Review.findById(review._id)
      .populate("user", "name avatar")
      .populate("comments.user", "name avatar");

    return res.json({ ...updatedReview.toObject(), mentionedUsers });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const likeReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    const index = review.likes.indexOf(req.user._id);
    if (index === -1) {
      review.likes.push(req.user._id);
      await review.save();

      await emitNotificationsSafely([
        {
          recipient: review.user,
          sender: req.user._id,
          type: "like",
          reviewId: review._id,
          movieTitle: review.movieTitle,
        },
      ]);
      return res.json({ likes: review.likes });
    } else {
      review.likes.splice(index, 1);
      await review.save();
      return res.json({ likes: review.likes });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
