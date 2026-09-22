const minimumTouristAgeYears = 11;
const maximumTouristAgeYears = 100;

/** Oldest and most recent birth dates accepted for a tourist account. */
export function getBirthDateBounds(referenceDate = new Date()): {
  maximumDate: Date;
  minimumDate: Date;
} {
  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  return {
    maximumDate: shiftDateByYears(today, -minimumTouristAgeYears),
    minimumDate: shiftDateByYears(today, -maximumTouristAgeYears),
  };
}

/** Compares calendar days only; the time of day is ignored. */
export function isValidBirthDate(
  date: Date,
  referenceDate = new Date(),
): boolean {
  const { maximumDate, minimumDate } = getBirthDateBounds(referenceDate);
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return value >= minimumDate && value <= maximumDate;
}

function shiftDateByYears(date: Date, years: number): Date {
  const shifted = new Date(date);
  shifted.setFullYear(shifted.getFullYear() + years);
  return shifted;
}
