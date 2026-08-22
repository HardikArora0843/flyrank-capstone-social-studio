import { processDueSchedules } from "./publishingWorker.js";

const intervalMs = Number(
  process.env.SCHEDULER_INTERVAL_MS || 30000
);

let intervalId = null;
let running = false;

export const runSchedulerCycle = async () => {
  if (running) {
    return [];
  }

  running = true;

  try {
    return await processDueSchedules(new Date());
  } finally {
    running = false;
  }
};

export const startScheduler = () => {
  if (intervalId) {
    return;
  }

  intervalId = setInterval(async () => {
    try {
      await runSchedulerCycle();
    } catch (error) {
      console.error("Scheduler cycle failed:", error);
    }
  }, intervalMs);

  return intervalId;
};

export const stopScheduler = () => {
  if (!intervalId) {
    return;
  }

  clearInterval(intervalId);
  intervalId = null;
};
