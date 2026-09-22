import { appLocale } from "./locale";

/** Formats a travel duration as `<1 min`, `25 min`, `2 h` or `1 h 5 min`. */
export function formatDurationSeconds(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** Formats a timestamp as a local wall-clock time, for example `14:05`. */
export function formatClockTime(time: number | Date): string {
  return new Date(time).toLocaleTimeString(appLocale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
