import type { Messages } from "../es";

export const offlineEn: Messages["offline"] = {
  title: "Offline maps",
  preparing: "Preparing your offline maps…",
  downloaded: "Downloaded maps",
  onDevice: (size: string) => `${size} on this device`,
  downloadAnother: "Download another map",
  available: "Available cities",
  storedFailed: "We couldn't check the cities saved on this device.",
  loadingAvailable: "Loading available maps…",
  availableOffline:
    "Connect to the internet to see other cities. Your downloads are still available above.",
  noneAvailable: "There are no city maps available to download yet.",
  city: {
    title: "Downloaded city",
    preparing: "Preparing your saved maps…",
    opening: "Opening the saved map…",
    readFailed: "We couldn't read this download. Please try again.",
    notStored: "This city isn't saved on the device.",
    summary: (places: number, routes: number) =>
      `Downloaded city · ${places} places · ${routes} trails`,
    searchLabel: "Search downloaded places and routes",
    searchPlaceholder: "Search downloaded places and routes",
    legacy:
      "Update this download with internet to save the map style and new places.",
    locate: "Show my location in the downloaded city",
    noMatches: "No downloaded places or routes match.",
    severalPlaces: "Several places here",
    pointOfInterest: "Point of interest",
  },
  details: {
    approximate: "Approximate location.",
    directionsOnline: "Directions with internet",
    routesIncluded:
      "This map includes the city's published trails. To calculate a route from your location you need internet.",
    transitRoute:
      "Published transport route. You can see it on the map. It isn't a route calculated from your location.",
    duration: (minutes: number, estimated: boolean) =>
      `${estimated ? "Approximate" : "Published"} duration: ${minutes} minutes.`,
    noDirections: "This route has no published directions.",
    outsideArea:
      "The street map is available inside the downloaded area. The route may continue outside it.",
  },
  card: {
    updateAvailable: "Update available",
    available: "Available",
    newerVersion:
      "There's a newer version of this city. Update it to see the latest published places.",
    open: "Open downloaded city",
    updating: (progress: number) => `Updating ${progress}%`,
    update: "Update",
    remove: "Delete",
    downloading: (progress: number) => `Downloading ${progress}%`,
    download: "Download city",
    noPackage: "This city doesn't have published places to download yet.",
  },
  usage: {
    occupies: (total: string) => `Uses ${total}`,
    occupiesDetail: (total: string, map: string, content: string) =>
      `Uses ${total} (map ${map} · places ${content})`,
    updatedAt: (date: string) => `Updated on ${date}`,
  },
  errors: {
    generic:
      "We couldn't download the city. Check your connection and try again.",
    removing: "Wait until this city finishes being deleted.",
    downloading: "Wait until this city finishes downloading.",
    noPackage: "The city doesn't have a published package.",
    wrongPackage: "The package received doesn't match this city.",
    newerStored: "A newer version of this city is already downloaded.",
    style: "We couldn't prepare the map. Check your connection and try again.",
    save: "We downloaded the map, but couldn't save the city on the device.",
    tiles:
      "We couldn't download this city's maps. Check your connection and try again.",
    prepare: "We couldn't prepare this city's download.",
    webOnly: "Map downloads are only available in the Android and iOS app.",
    remove: "We couldn't delete the whole city. Please try again.",
    cities: "We couldn't load the offline cities.",
    citiesInvalid: "The offline catalog is not valid.",
    manifest: "This city doesn't have an offline package yet.",
    manifestInvalid: "The offline manifest is not valid.",
    bounds: "The city doesn't have bounds available to download the map.",
  },
  share: {
    routeTitle: (name: string) => `Route to ${name}`,
    dialogTitle: "Share",
  },
};
