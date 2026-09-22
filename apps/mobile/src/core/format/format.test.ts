import { describe, expect, it } from "vitest";

import { formatLongDate, formatRelativeDate, toIsoDate } from "./date";
import { formatDistance, formatOptionalDistance } from "./distance";
import { formatClockTime, formatDurationSeconds } from "./duration";

describe("formatDistance", () => {
  it("uses meters below one kilometer and kilometers above", () => {
    expect(formatDistance(120.4)).toBe("120 m");
    expect(formatDistance(1_000)).toBe("1.0 km");
    expect(formatDistance(8_600)).toBe("8.6 km");
  });

  it("supports the rounded variant used by navigation notifications", () => {
    const rounded = { minimumMeters: 10, stepMeters: 10 };
    expect(formatDistance(184, rounded)).toBe("180 m");
    expect(formatDistance(3, rounded)).toBe("10 m");
    expect(formatDistance(1_250, rounded)).toBe("1.3 km");
  });

  it("returns null for missing distances", () => {
    expect(formatOptionalDistance(null)).toBeNull();
    expect(formatOptionalDistance(Number.NaN)).toBeNull();
    expect(formatOptionalDistance(42)).toBe("42 m");
  });
});

describe("formatDurationSeconds", () => {
  it("rounds up to whole minutes and groups hours", () => {
    expect(formatDurationSeconds(0)).toBe("<1 min");
    expect(formatDurationSeconds(114.7)).toBe("2 min");
    expect(formatDurationSeconds(3_600)).toBe("1 h");
    expect(formatDurationSeconds(3_900)).toBe("1 h 5 min");
  });
});

describe("formatClockTime", () => {
  it("formats hours and minutes in the app locale", () => {
    // es-EC may use a 12- or 24-hour clock depending on the ICU data.
    expect(formatClockTime(new Date(2026, 8, 22, 14, 5))).toMatch(/(14|02):05/);
  });
});

describe("dates", () => {
  it("formats the local calendar day for the API", () => {
    expect(toIsoDate(new Date(1998, 1, 3))).toBe("1998-02-03");
  });

  it("formats a long Spanish date", () => {
    expect(formatLongDate(new Date(1998, 1, 3))).toBe("3 de febrero de 1998");
  });

  it("describes relative dates", () => {
    const now = Date.parse("2026-09-22T12:00:00.000Z");
    expect(formatRelativeDate("invalid", now)).toBe("");
    expect(formatRelativeDate("2026-09-23T12:00:00.000Z", now)).toBe("Ahora");
    expect(formatRelativeDate("2026-09-22T08:00:00.000Z", now)).toBe("Hoy");
    expect(formatRelativeDate("2026-09-21T11:00:00.000Z", now)).toBe(
      "Hace 1 día",
    );
    expect(formatRelativeDate("2026-09-08T12:00:00.000Z", now)).toBe(
      "Hace 2 semanas",
    );
    expect(formatRelativeDate("2026-06-22T12:00:00.000Z", now)).toBe(
      "Hace 3 meses",
    );
    expect(formatRelativeDate("2024-09-22T12:00:00.000Z", now)).toBe(
      "Hace 2 años",
    );
  });
});
