import type { TurismoIconName } from "@/core/ui/turismo-icons";

export type EstablishmentPin = Readonly<{
  /** Rendered PNG pin registered with MapLibre `Images`. */
  asset: number;
  /** Local category color; it wins over the color sent by the API. */
  color: string;
  /** Icon used for the pin in lists and sheets. */
  icon: TurismoIconName;
  /** Name under which `asset` is registered in the map style. */
  imageName: string;
  key: string;
}>;

type PinDefinition = Omit<EstablishmentPin, "imageName" | "key">;

const pinDefinitions = {
  "accommodation-hotel": {
    asset: require("../../../../assets/images/establishment-pins/accommodation-hotel.png"),
    color: "#7a5c3e",
    icon: "hotel",
  },
  "amenity-cinema": {
    asset: require("../../../../assets/images/establishment-pins/amenity-cinema.png"),
    color: "#7e22ce",
    icon: "ticket",
  },
  "amenity-library": {
    asset: require("../../../../assets/images/establishment-pins/amenity-library.png"),
    color: "#334155",
    icon: "map",
  },
  "amenity-toilets": {
    asset: require("../../../../assets/images/establishment-pins/amenity-toilets.png"),
    color: "#64748b",
    icon: "mapPin",
  },
  "eat-drink-cafe": {
    asset: require("../../../../assets/images/establishment-pins/eat-drink-cafe.png"),
    color: "#8b5e34",
    icon: "coffee",
  },
  "eat-drink-restaurant": {
    asset: require("../../../../assets/images/establishment-pins/eat-drink-restaurant.png"),
    color: "#b45309",
    icon: "restaurant",
  },
  "health-hospital": {
    asset: require("../../../../assets/images/establishment-pins/health-hospital.png"),
    color: "#9f1239",
    icon: "mapPinned",
  },
  "money-atm": {
    asset: require("../../../../assets/images/establishment-pins/money-atm.png"),
    color: "#475569",
    icon: "store",
  },
  "money-bank": {
    asset: require("../../../../assets/images/establishment-pins/money-bank.png"),
    color: "#374151",
    icon: "store",
  },
  "outdoor-camping": {
    asset: require("../../../../assets/images/establishment-pins/outdoor-camping.png"),
    color: "#3f6212",
    icon: "map",
  },
  "outdoor-drinking-water": {
    asset: require("../../../../assets/images/establishment-pins/outdoor-drinking-water.png"),
    color: "#0f766e",
    icon: "mapPin",
  },
  "religious-place-of-worship": {
    asset: require("../../../../assets/images/establishment-pins/religious-place-of-worship.png"),
    color: "#6d28d9",
    icon: "mapPinned",
  },
  "shop-supermarket": {
    asset: require("../../../../assets/images/establishment-pins/shop-supermarket.png"),
    color: "#be123c",
    icon: "store",
  },
  "tourism-information": {
    asset: require("../../../../assets/images/establishment-pins/tourism-information.png"),
    color: "#0369a1",
    icon: "ticket",
  },
  "tourism-museum": {
    asset: require("../../../../assets/images/establishment-pins/tourism-museum.png"),
    color: "#5b21b6",
    icon: "map",
  },
  "tourism-viewpoint": {
    asset: require("../../../../assets/images/establishment-pins/tourism-viewpoint.png"),
    color: "#a16207",
    icon: "compass",
  },
  "transport-bus-stop": {
    asset: require("../../../../assets/images/establishment-pins/transport-bus-stop.png"),
    color: "#155e75",
    icon: "bus",
  },
} as const satisfies Record<string, PinDefinition>;

const establishmentPins: ReadonlyMap<string, EstablishmentPin> = new Map(
  Object.entries(pinDefinitions).map(([key, definition]) => [
    key,
    { ...definition, imageName: `tourism-establishment-pin-${key}`, key },
  ]),
);

/** Pin used for unknown or missing categories. */
export const defaultEstablishmentPin = getKnownPin("shop-supermarket");

/** Returns the pin for an API icon key, or the default pin when unknown. */
export function getEstablishmentPin(
  iconKey: string | null | undefined,
): EstablishmentPin {
  return (iconKey && establishmentPins.get(iconKey)) || defaultEstablishmentPin;
}

/** Every pin image keyed by its style image name, for MapLibre `Images`. */
export const establishmentPinImages: Readonly<Record<string, number>> =
  Object.fromEntries(
    [...establishmentPins.values()].map((pin) => [pin.imageName, pin.asset]),
  );

function getKnownPin(key: keyof typeof pinDefinitions): EstablishmentPin {
  const pin = establishmentPins.get(key);
  if (!pin) throw new Error(`Pin de establecimiento desconocido: ${key}`);
  return pin;
}
