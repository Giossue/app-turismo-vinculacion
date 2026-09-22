import { appLocale } from "./locale";

const dayMs = 24 * 60 * 60 * 1000;

/** Formats the local calendar day of `date` as `YYYY-MM-DD`. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Formats a date as `3 de febrero de 1998`. */
export function formatLongDate(date: Date): string {
  return date.toLocaleDateString(appLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Describes how long ago an ISO timestamp happened (`Hoy`, `Hace 2 semanas`…). */
export function formatRelativeDate(iso: string, now = Date.now()): string {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return "";

  const elapsed = now - timestamp;
  if (elapsed <= 0) return "Ahora";

  const days = Math.floor(elapsed / dayMs);
  if (days === 0) return "Hoy";
  if (days < 7) return `Hace ${days} ${days === 1 ? "día" : "días"}`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `Hace ${weeks} ${weeks === 1 ? "semana" : "semanas"}`;

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `Hace ${months} ${months === 1 ? "mes" : "meses"}`;
  }

  const years = Math.floor(days / 365);
  return `Hace ${years} ${years === 1 ? "año" : "años"}`;
}
