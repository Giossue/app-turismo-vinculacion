import type { Messages } from "../es";

export const coreEn: Messages["core"] = {
  back: "Back",
  close: "Close",
  closeMenu: "Close menu",
  retry: "Try again",
  done: "Done",
  clearSearch: "Clear search",
  showPassword: "Show password",
  hidePassword: "Hide password",
  selectDate: "Select a date",
  chooseDate: (label: string) => `Choose ${label.toLowerCase()}`,
  closeDatePicker: "Close date picker",
  requestCancelled: "The request was cancelled.",
  errorFallback: {
    title: "Something went wrong",
    body: "The app ran into an unexpected error. Please try again.",
  },
  photo: {
    defaultLabel: "Photo of the place",
    position: (position: number, total: number) =>
      `Photo ${position} of ${total}`,
    close: "Close photo",
    author: (author: string) => `Photo: ${author}`,
    showAuthor: "Show photo author",
    hideAuthor: "Hide photo author",
  },
  location: {
    permissionBlocked: "Turn on location permission in Settings.",
    permissionDenied: "We need permission to show your position.",
    servicesDisabled: "Turn on GPS to find your position.",
    refining: "Refining your location with GPS…",
    searching: "Looking for an accurate GPS location…",
    updateFailed:
      "We couldn't update your location. Check the GPS signal and try again.",
    trackingFailed: "We couldn't start location tracking. Please try again.",
    readFailed:
      "We couldn't get your location. Check the GPS signal and try again.",
  },
  relative: {
    now: "Now",
    today: "Today",
    days: (n: number) => `${n} ${n === 1 ? "day" : "days"} ago`,
    weeks: (n: number) => `${n} ${n === 1 ? "week" : "weeks"} ago`,
    months: (n: number) => `${n} ${n === 1 ? "month" : "months"} ago`,
    years: (n: number) => `${n} ${n === 1 ? "year" : "years"} ago`,
  },
};
