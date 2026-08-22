import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import {
  runSchedulerCycle,
  startScheduler,
  stopScheduler
} from "../src/scheduler/scheduler.js";

import * as publishingWorker from "../src/scheduler/publishingWorker.js";

describe("Scheduler", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    stopScheduler();
  });

  afterEach(() => {
    stopScheduler();
    vi.restoreAllMocks();
  });

  it("runs a scheduler cycle", async () => {
    const spy = vi
      .spyOn(publishingWorker, "processDueSchedules")
      .mockResolvedValue([
        {
          status: "PUBLISHED",
          scheduleId: "schedule-1"
        }
      ]);

    const result = await runSchedulerCycle();

    expect(spy).toHaveBeenCalledOnce();
    expect(result).toEqual([
      {
        status: "PUBLISHED",
        scheduleId: "schedule-1"
      }
    ]);
  });

  it("does not overlap scheduler cycles", async () => {
    let resolveCycle;

    const pendingCycle = new Promise((resolve) => {
      resolveCycle = resolve;
    });

    const spy = vi
      .spyOn(publishingWorker, "processDueSchedules")
      .mockReturnValueOnce(pendingCycle);

    const firstCycle = runSchedulerCycle();
    const secondCycle = await runSchedulerCycle();

    expect(spy).toHaveBeenCalledOnce();
    expect(secondCycle).toEqual([]);

    resolveCycle([
      {
        status: "PUBLISHED",
        scheduleId: "schedule-1"
      }
    ]);

    await firstCycle;
  });

  it("starts the scheduler interval", () => {
    vi.useFakeTimers();

    const spy = vi
      .spyOn(publishingWorker, "processDueSchedules")
      .mockResolvedValue([]);

    startScheduler();

    vi.advanceTimersByTime(30000);

    expect(spy).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });

  it("does not create duplicate scheduler intervals", () => {
    vi.useFakeTimers();

    const spy = vi
      .spyOn(publishingWorker, "processDueSchedules")
      .mockResolvedValue([]);

    startScheduler();
    startScheduler();

    vi.advanceTimersByTime(30000);

    expect(spy).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });

  it("stops the scheduler interval", () => {
    vi.useFakeTimers();

    const spy = vi
      .spyOn(publishingWorker, "processDueSchedules")
      .mockResolvedValue([]);

    startScheduler();
    stopScheduler();

    vi.advanceTimersByTime(30000);

    expect(spy).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
