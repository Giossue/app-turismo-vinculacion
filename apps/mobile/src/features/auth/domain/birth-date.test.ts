import { describe, expect, it } from "vitest";

import { getBirthDateBounds, isValidBirthDate } from "./birth-date";

const reference = new Date(2026, 8, 22, 18, 30);

describe("birth date", () => {
  it("accepts tourists between 11 and 100 years old", () => {
    const { maximumDate, minimumDate } = getBirthDateBounds(reference);

    expect(maximumDate).toEqual(new Date(2015, 8, 22));
    expect(minimumDate).toEqual(new Date(1926, 8, 22));
  });

  it("validates calendar days including both limits", () => {
    expect(isValidBirthDate(new Date(2015, 8, 22, 23, 59), reference)).toBe(
      true,
    );
    expect(isValidBirthDate(new Date(2015, 8, 23), reference)).toBe(false);
    expect(isValidBirthDate(new Date(1926, 8, 22), reference)).toBe(true);
    expect(isValidBirthDate(new Date(1926, 8, 21), reference)).toBe(false);
    expect(isValidBirthDate(new Date(1998, 1, 3), reference)).toBe(true);
  });
});
