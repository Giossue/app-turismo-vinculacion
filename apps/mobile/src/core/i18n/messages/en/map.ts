import type { Messages } from "../es";

export const mapEn: Messages["map"] = {
  label: "Map with published tourist attractions",
  webLabel: "Map available in the mobile app",
  webTitle: "Mobile map",
  webBody: (count: number) =>
    `The interactive MapLibre map is shown in the mobile Development Build. There are ${count} published attraction(s).`,
  attribution: "View map attribution",
  north: "Point map north",
  several: "Several places here",
  chooseOne: "Choose which one to open.",
  openCenter: "Opens the attraction",
  openPoint: "Opens the point of interest",
  centerSubtitle: (category: string) => `Attraction · ${category}`,
  pointSubtitle: (category: string | null) =>
    `Point of interest · ${category ?? "Tourism business"}`,
  errors: {
    basemap: "We couldn't prepare the base map.",
    basemapInvalid: "The base map has an unexpected format.",
  },
};
