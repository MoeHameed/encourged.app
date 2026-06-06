import { describe, it, expect } from "vitest";
import {
  displayNameFallback,
  mapActionToStatus,
  isLate,
  computeDueAtEndOfDay,
  isGoalCompletedByEveryone,
} from "./goals";

describe("displayNameFallback", () => {
  it("returns the name when present", () => {
    expect(displayNameFallback("Mo", "mo@x.com")).toBe("Mo");
  });
  it("falls back to the email local-part", () => {
    expect(displayNameFallback("", "aisha@x.com")).toBe("aisha");
    expect(displayNameFallback(null, "nate@x.com")).toBe("nate");
  });
});

describe("mapActionToStatus", () => {
  it("maps completion actions to assignment statuses", () => {
    expect(mapActionToStatus("done")).toBe("completed");
    expect(mapActionToStatus("partial")).toBe("partial");
    expect(mapActionToStatus("skipped")).toBe("skipped");
  });
});

describe("isLate", () => {
  it("is false when there is no due date", () => {
    expect(isLate(null, new Date("2026-06-05T12:00:00Z"))).toBe(false);
  });
  it("is true only after the due date", () => {
    const due = new Date("2026-06-05T00:00:00Z");
    expect(isLate(due, new Date("2026-06-04T23:59:00Z"))).toBe(false);
    expect(isLate(due, new Date("2026-06-05T00:00:01Z"))).toBe(true);
  });
});

describe("computeDueAtEndOfDay", () => {
  it("returns end-of-day in the given IANA timezone as a UTC instant", () => {
    // 2026-06-05 end-of-day in New York (EDT, UTC-4) => 2026-06-06T03:59:59.999Z
    const d = computeDueAtEndOfDay("2026-06-05", "America/New_York");
    expect(d.toISOString()).toBe("2026-06-06T03:59:59.999Z");
  });
  it("returns null for an empty date", () => {
    expect(computeDueAtEndOfDay("", "UTC")).toBeNull();
  });
});

describe("isGoalCompletedByEveryone", () => {
  it("is true only when every member is 'completed'", () => {
    expect(isGoalCompletedByEveryone(["completed", "completed"])).toBe(true);
    expect(isGoalCompletedByEveryone(["completed", "partial"])).toBe(false);
    expect(isGoalCompletedByEveryone(["completed", "skipped"])).toBe(false);
    expect(isGoalCompletedByEveryone([])).toBe(false);
  });
});
