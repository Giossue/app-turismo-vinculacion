import { TourismTabs } from "@/core/ui/tourism-tabs";

export type CenterDetailTab = "information" | "opinions" | "photos";

export const centerDetailTabOrder: readonly CenterDetailTab[] = [
  "information",
  "opinions",
  "photos",
];

const centerDetailTabs = [
  { label: "Información", value: "information" },
  { label: "Opiniones", value: "opinions" },
  { label: "Fotos", value: "photos" },
] as const;

/** Información / Opiniones / Fotos tab row of a center detail. */
export function CenterDetailTabs({
  onChange,
  value,
}: Readonly<{
  onChange: (tab: CenterDetailTab) => void;
  value: CenterDetailTab;
}>) {
  return (
    <TourismTabs items={centerDetailTabs} onChange={onChange} value={value} />
  );
}
