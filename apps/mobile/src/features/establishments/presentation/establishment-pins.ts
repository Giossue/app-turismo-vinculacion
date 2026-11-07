import type {
  CircleLayerSpecification,
  SymbolLayerSpecification,
} from "@maplibre/maplibre-react-native";
import type { TurismoColorScheme } from "@/core/ui/tokens";
import type { TurismoIconName } from "@/core/ui/turismo-icons";

export type EstablishmentPin = Readonly<{
  /** Rendered PNG pin registered with MapLibre `Images`. */
  asset: number;
  /** Mismo pin con contorno blanco, para el terreno del tema oscuro. */
  darkAsset: number;
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
    darkAsset: require("../../../../assets/images/establishment-pins-dark/accommodation-hotel.png"),
    color: "#7a5c3e",
    icon: "hotel",
  },
  "amenity-cinema": {
    asset: require("../../../../assets/images/establishment-pins/amenity-cinema.png"),
    darkAsset: require("../../../../assets/images/establishment-pins-dark/amenity-cinema.png"),
    color: "#7e22ce",
    icon: "ticket",
  },
  "amenity-library": {
    asset: require("../../../../assets/images/establishment-pins/amenity-library.png"),
    darkAsset: require("../../../../assets/images/establishment-pins-dark/amenity-library.png"),
    color: "#334155",
    icon: "map",
  },
  "amenity-toilets": {
    asset: require("../../../../assets/images/establishment-pins/amenity-toilets.png"),
    darkAsset: require("../../../../assets/images/establishment-pins-dark/amenity-toilets.png"),
    color: "#64748b",
    icon: "mapPin",
  },
  "eat-drink-cafe": {
    asset: require("../../../../assets/images/establishment-pins/eat-drink-cafe.png"),
    darkAsset: require("../../../../assets/images/establishment-pins-dark/eat-drink-cafe.png"),
    color: "#8b5e34",
    icon: "coffee",
  },
  "eat-drink-restaurant": {
    asset: require("../../../../assets/images/establishment-pins/eat-drink-restaurant.png"),
    darkAsset: require("../../../../assets/images/establishment-pins-dark/eat-drink-restaurant.png"),
    color: "#b45309",
    icon: "restaurant",
  },
  "health-hospital": {
    asset: require("../../../../assets/images/establishment-pins/health-hospital.png"),
    darkAsset: require("../../../../assets/images/establishment-pins-dark/health-hospital.png"),
    color: "#9f1239",
    icon: "mapPinned",
  },
  "money-atm": {
    asset: require("../../../../assets/images/establishment-pins/money-atm.png"),
    darkAsset: require("../../../../assets/images/establishment-pins-dark/money-atm.png"),
    color: "#475569",
    icon: "store",
  },
  "money-bank": {
    asset: require("../../../../assets/images/establishment-pins/money-bank.png"),
    darkAsset: require("../../../../assets/images/establishment-pins-dark/money-bank.png"),
    color: "#374151",
    icon: "store",
  },
  "outdoor-camping": {
    asset: require("../../../../assets/images/establishment-pins/outdoor-camping.png"),
    darkAsset: require("../../../../assets/images/establishment-pins-dark/outdoor-camping.png"),
    color: "#3f6212",
    icon: "map",
  },
  "outdoor-drinking-water": {
    asset: require("../../../../assets/images/establishment-pins/outdoor-drinking-water.png"),
    darkAsset: require("../../../../assets/images/establishment-pins-dark/outdoor-drinking-water.png"),
    color: "#0f766e",
    icon: "mapPin",
  },
  "religious-place-of-worship": {
    asset: require("../../../../assets/images/establishment-pins/religious-place-of-worship.png"),
    darkAsset: require("../../../../assets/images/establishment-pins-dark/religious-place-of-worship.png"),
    color: "#6d28d9",
    icon: "mapPinned",
  },
  "shop-supermarket": {
    asset: require("../../../../assets/images/establishment-pins/shop-supermarket.png"),
    darkAsset: require("../../../../assets/images/establishment-pins-dark/shop-supermarket.png"),
    color: "#be123c",
    icon: "store",
  },
  "tourism-information": {
    asset: require("../../../../assets/images/establishment-pins/tourism-information.png"),
    darkAsset: require("../../../../assets/images/establishment-pins-dark/tourism-information.png"),
    color: "#0369a1",
    icon: "ticket",
  },
  "tourism-museum": {
    asset: require("../../../../assets/images/establishment-pins/tourism-museum.png"),
    darkAsset: require("../../../../assets/images/establishment-pins-dark/tourism-museum.png"),
    color: "#5b21b6",
    icon: "map",
  },
  "tourism-viewpoint": {
    asset: require("../../../../assets/images/establishment-pins/tourism-viewpoint.png"),
    darkAsset: require("../../../../assets/images/establishment-pins-dark/tourism-viewpoint.png"),
    color: "#a16207",
    icon: "compass",
  },
  "transport-bus-stop": {
    asset: require("../../../../assets/images/establishment-pins/transport-bus-stop.png"),
    darkAsset: require("../../../../assets/images/establishment-pins-dark/transport-bus-stop.png"),
    color: "#155e75",
    icon: "bus",
  },
} as const satisfies Record<string, PinDefinition>;

const establishmentPinImagePrefix = "tourism-establishment-pin-";
const establishmentDarkPinImagePrefix = "tourism-establishment-pin-dark-";

const establishmentPins: ReadonlyMap<string, EstablishmentPin> = new Map(
  Object.entries(pinDefinitions).map(([key, definition]) => [
    key,
    { ...definition, imageName: `${establishmentPinImagePrefix}${key}`, key },
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
    [...establishmentPins.values()].flatMap((pin) => [
      [pin.imageName, pin.asset],
      [`${establishmentDarkPinImagePrefix}${pin.key}`, pin.darkAsset],
    ]),
  );

/**
 * Style expressions that resolve the `icon` property of a map feature (vector
 * tiles) to its registered image and its local color, with the default pin
 * for unknown keys, like `getEstablishmentPin`.
 */
export function getEstablishmentPinImageExpression(scheme: TurismoColorScheme) {
  const prefix =
    scheme === "dark"
      ? establishmentDarkPinImagePrefix
      : establishmentPinImagePrefix;
  return [
    "coalesce",
    ["image", ["concat", prefix, ["get", "icon"]]],
    ["image", `${prefix}${defaultEstablishmentPin.key}`],
  ] satisfies NonNullable<SymbolLayerSpecification["layout"]>["icon-image"];
}

export const establishmentPinColorExpression = [
  "match",
  ["get", "icon"],
  defaultEstablishmentPin.key,
  defaultEstablishmentPin.color,
  ...[...establishmentPins.values()]
    .filter((pin) => pin !== defaultEstablishmentPin)
    .flatMap((pin) => [pin.key, pin.color]),
  defaultEstablishmentPin.color,
] satisfies NonNullable<CircleLayerSpecification["paint"]>["circle-color"];

function getKnownPin(key: keyof typeof pinDefinitions): EstablishmentPin {
  const pin = establishmentPins.get(key);
  if (!pin) throw new Error(`Pin de establecimiento desconocido: ${key}`);
  return pin;
}
