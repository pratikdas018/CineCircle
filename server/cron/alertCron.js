import cron from "node-cron";
import Alert from "../models/Alert.js";
import { getOTTAvailability, normalizePlatformList } from "../utils/ottAvailability.js";

const ALERT_CRON_SCHEDULE = "0 */6 * * *";
let isAlertCronRunning = false;

const runAlertCheck = async () => {
  if (isAlertCronRunning) {
    console.log("[OTT ALERT] Previous run still in progress. Skipping this cycle.");
    return;
  }

  isAlertCronRunning = true;
  const pendingAlerts = await Alert.find({ isNotified: false }).limit(500);

  try {
    for (const alert of pendingAlerts) {
      try {
        const currentAvailability = normalizePlatformList(getOTTAvailability(alert.title));
        const selectedPlatforms = normalizePlatformList(alert.platforms || []);
        const matchedPlatforms = currentAvailability.filter((platform) =>
          selectedPlatforms.includes(platform)
        );

        if (!matchedPlatforms.length) {
          continue;
        }

        alert.isNotified = true;
        alert.availableOn = matchedPlatforms;
        await alert.save();

        console.log(
          `[OTT ALERT] ${alert.title} (${alert.imdbID}) is now available on ${matchedPlatforms.join(
            ", "
          )} for user ${alert.userId}`
        );
      } catch (error) {
        console.error(`[OTT ALERT] Failed for alert ${alert._id}: ${error.message}`);
      }
    }
  } finally {
    isAlertCronRunning = false;
  }
};

const startAlertCron = () => {
  cron.schedule(ALERT_CRON_SCHEDULE, async () => {
    try {
      await runAlertCheck();
    } catch (error) {
      console.error("[OTT ALERT] Cron execution failed:", error.message);
    }
  });

  console.log("OTT alert cron started (runs every 6 hours)");
};

export default startAlertCron;
