import { describe, expect, it } from "vitest";

import {
  getBirthDateBounds,
  isUnderMinimumAge,
  isValidBirthDate,
} from "./birth-date";

const reference = new Date(2026, 8, 22, 18, 30);

describe("birth date", () => {
  it("accepts tourists between 15 and 100 years old", () => {
    const { maximumDate, minimumDate } = getBirthDateBounds(reference);

    expect(maximumDate).toEqual(new Date(2011, 8, 22));
    expect(minimumDate).toEqual(new Date(1926, 8, 22));
  });

  it("validates calendar days including both limits", () => {
    expect(isValidBirthDate(new Date(2011, 8, 22, 23, 59), reference)).toBe(
      true,
    );
    expect(isValidBirthDate(new Date(2011, 8, 23), reference)).toBe(false);
    expect(isValidBirthDate(new Date(1926, 8, 22), reference)).toBe(true);
    expect(isValidBirthDate(new Date(1926, 8, 21), reference)).toBe(false);
    expect(isValidBirthDate(new Date(1998, 1, 3), reference)).toBe(true);
  });

  it("treats the exact 15th birthday as old enough, and the day after as not", () => {
    expect(isUnderMinimumAge(new Date(2011, 8, 22), reference)).toBe(false);
    expect(isUnderMinimumAge(new Date(2011, 8, 23), reference)).toBe(true);
    expect(isUnderMinimumAge(new Date(1998, 1, 3), reference)).toBe(false);
  });

  it("does not roll a leap day over into March when shifting the years", () => {
    const leapDay = new Date(2028, 1, 29);

    expect(getBirthDateBounds(leapDay).maximumDate).toEqual(
      new Date(2013, 1, 28),
    );
    expect(isUnderMinimumAge(new Date(2013, 2, 1), leapDay)).toBe(true);
  });
});
