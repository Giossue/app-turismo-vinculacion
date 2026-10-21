import type { Messages } from "../es";

export const routingEn: Messages["routing"] = {
  session: {
    arrived: "You have arrived at your destination.",
    backgroundNotificationDenied:
      "Without notification permission, navigation only continues while the app is open.",
    backgroundPermissionDenied:
      "Without “Always” location permission, navigation only continues while the app is open.",
    backgroundUnavailable:
      "Navigation only continues while the app is open: we couldn't keep tracking when you switch apps.",
    offRoute: "You left the route; looking for a new one.",
    offRouteWithoutReroute:
      "You left the path. Return to the route to continue; it is not recalculated automatically.",
    permissionMissing: "We need location permission to navigate.",
    refining: "Refining your location with GPS…",
    resuming: "Updating your location…",
    servicesDisabled: "Turn on GPS to start navigation.",
    startFailed: "We couldn't start location tracking.",
    trackingLost: "We lost track of your location. Check GPS and try again.",
  },
  speech: {
    arrived: "You have arrived at your destination",
    stopReached: (name: string) => `You have reached ${name}`,
    now: (instruction: string) => `Now: ${instruction}`,
    then: (instruction: string) => `Then: ${instruction}`,
  },
  notification: {
    appName: "Rumbo EC",
    active: "Navigation active. Open the app to see the route.",
    now: (instruction: string) => `Now: ${instruction}`,
    inDistance: (distance: string, instruction: string) =>
      `In ${distance}: ${instruction}`,
    arrived: "You have arrived at your destination.",
    arrivalChannel: "Arrival at destination",
    tracking: "Following your location during active navigation.",
    backgroundUnavailable: "Background tracking is not available.",
  },
  overlay: {
    recalculating: "Recalculating route…",
    following: "Following your location…",
    inDistance: (distance: string) => `In ${distance}`,
    closesIn: (seconds: number) => `Navigation closes in ${seconds} s`,
    closesInLabel: (seconds: number) =>
      `Navigation closes in ${seconds} seconds`,
    updateRoute: "Update route",
    then: "Then",
    thenLabel: (instruction: string) => `Then: ${instruction}`,
    close: "Close navigation",
    summaryLabel: (duration: string, distance: string, clock: string) =>
      `${duration} left, ${distance}, arriving at ${clock}`,
    followingLocation: "Following my location",
    recenter: "Center and follow my location",
    nextStop: (position: number, total: number, name: string) =>
      `Next stop (${position} of ${total}): ${name}`,
  },
  arrival: {
    nearby: "Nearby",
    review: "Review",
    viewPlace: "View place",
  },
  modes: {
    bicycle: { label: "Bike", title: "By bike" },
    car: { label: "Car", title: "By car" },
    foot: { label: "Walk", title: "On foot" },
  },
  preview: {
    close: "Close route",
    collapse: "Collapse route details",
    expand: "Expand route details",
    tripTo: (destination: string, stops: string) =>
      `Trip to ${destination} · ${stops}`,
    routeTo: (destination: string) => `Route to ${destination}`,
    stopCount: (count: number) => (count === 1 ? "1 stop" : `${count} stops`),
    passesThrough: (stops: string, destination: string) =>
      `Goes through ${stops} and ends at ${destination}.`,
    share: "Share route",
    loading: "Loading route",
    backgroundTracking: "Keep tracking in the background",
    backgroundTrackingHelp:
      "Keeps directions when you switch apps or turn off the screen. When you start, you'll be asked for “Always” location permission.",
    steps: "Steps",
    yourLocation: "Your location",
    noSteps: "There are no detailed directions for this trip.",
    start: "Start navigation",
    startShort: "Navigate",
    locating: "Getting location…",
    locatingShort: "Locating…",
    retryRoute: "Retry route",
    retryShort: "Retry",
    calculate: "Calculate route",
    calculateShort: "Calculate",
    mapLabel: "Map of the calculated route",
    mapUnavailableWeb: "The route map is available in the Android and iOS app.",
  },
  screen: {
    title: "Directions",
    savedTitle: "Saved route",
    signIn: "Sign in",
    savedSignIn:
      "Sign in with the account that saved this route on the device.",
    savedOpening: "Opening the route saved on this device…",
    savedMissing:
      "The route may have been deleted or saved with another account.",
    savedOpenFailed: "We couldn't open this route",
    offline: "Connect to calculate a new route.",
    missingDestinationTitle: "We couldn't find this route's destination",
    missingDestination: "Go back to the place and choose “Directions” again.",
    savedNotice:
      "Saved route: GPS follows your progress. If you go off course, return to the path; this route is not recalculated.",
    defaultDestination: "Destination",
    defaultStop: "Stop",
  },
  errors: {
    calculate: "We couldn't calculate the route.",
    invalidResponse: "The route response has an unexpected format.",
    noRoute: "We couldn't find a possible route between those points.",
    unavailable: "The routing service is not available right now.",
    savedRead: "We couldn't read your saved routes. Please try again.",
    savedInvalid: "This route doesn't have valid data to save.",
    savedSave: "We couldn't save the route on this device.",
    savedUpdate:
      "We couldn't update your routes on this device. Check the available space.",
    signInToUse: "Sign in to use your routes.",
    signInToSave: "Sign in to save routes.",
  },
};
