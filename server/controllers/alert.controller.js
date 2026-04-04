import Alert from "../models/Alert.js";
import { normalizePlatformList } from "../utils/ottAvailability.js";

export const createAlert = async (req, res) => {
  try {
    const { imdbID, title, poster = "", platforms } = req.body;

    const normalizedPlatforms = normalizePlatformList(platforms);

    if (!imdbID || !title || !normalizedPlatforms.length) {
      return res
        .status(400)
        .json({ message: "imdbID, title and at least one platform are required" });
    }

    const existingAlert = await Alert.findOne({ userId: req.user._id, imdbID });

    if (existingAlert) {
      const mergedPlatforms = [...new Set([...existingAlert.platforms, ...normalizedPlatforms])];
      const matchedAvailable = (existingAlert.availableOn || []).filter((platform) =>
        mergedPlatforms.includes(platform)
      );

      existingAlert.title = title;
      existingAlert.poster = poster || existingAlert.poster;
      existingAlert.platforms = mergedPlatforms;
      existingAlert.isNotified = matchedAvailable.length > 0;
      existingAlert.availableOn = matchedAvailable;

      await existingAlert.save();
      return res.status(200).json(existingAlert);
    }

    const alert = await Alert.create({
      userId: req.user._id,
      imdbID,
      title,
      poster,
      platforms: normalizedPlatforms,
    });

    return res.status(201).json(alert);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Alert already exists for this movie" });
    }
    return res.status(500).json({ message: error.message || "Failed to create alert" });
  }
};

export const getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(alerts);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load alerts" });
  }
};

export const deleteAlert = async (req, res) => {
  try {
    const deletedAlert = await Alert.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!deletedAlert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    return res.status(200).json({ message: "Alert removed successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to delete alert" });
  }
};

