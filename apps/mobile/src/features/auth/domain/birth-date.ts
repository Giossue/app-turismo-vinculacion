const minimumTouristAgeYears = 15;
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

/** True hasta el día anterior a cumplir la edad mínima; ese día ya no lo es. */
export function isUnderMinimumAge(
  date: Date,
  referenceDate = new Date(),
): boolean {
  const { maximumDate } = getBirthDateBounds(referenceDate);
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return value > maximumDate;
}

function shiftDateByYears(date: Date, years: number): Date {
  const shifted = new Date(date);
  shifted.setFullYear(shifted.getFullYear() + years);
  // Un 29 de febrero sin equivalente queda en el 28, no en el 1 de marzo.
  if (shifted.getMonth() !== date.getMonth()) shifted.setDate(0);
  return shifted;
}
