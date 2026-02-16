const queue = [];
let processing = false;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const processQueue = async () => {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const job = queue.shift();
    const { task, retries, retryDelayMs, resolve, reject } = job;

    let attempt = 0;
    let lastError;

    while (attempt < retries) {
      attempt += 1;
      try {
        await task();
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await wait(retryDelayMs * attempt);
        }
      }
    }

    if (lastError) {
      reject(lastError);
    } else {
      resolve();
    }
  }

  processing = false;
};

export const enqueueEmailTask = (task, options = {}) =>
  new Promise((resolve, reject) => {
    const retries = Number(options.retries || 3);
    const retryDelayMs = Number(options.retryDelayMs || 1200);

    queue.push({
      task,
      retries: retries > 0 ? retries : 1,
      retryDelayMs: retryDelayMs > 0 ? retryDelayMs : 1200,
      resolve,
      reject,
    });

    processQueue().catch((error) => {
      reject(error);
    });
  });

export const getEmailQueueSize = () => queue.length;
