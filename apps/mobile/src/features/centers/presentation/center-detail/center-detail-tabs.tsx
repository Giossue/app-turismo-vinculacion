import { TourismTabs } from "@/core/ui/tourism-tabs";
import { useMessages } from "@/core/i18n/use-language";

export type CenterDetailTab = "information" | "opinions" | "photos";

export const centerDetailTabOrder: readonly CenterDetailTab[] = [
  "information",
  "opinions",
  "photos",
];

/** Información / Opiniones / Fotos tab row of a center detail. */
export function CenterDetailTabs({
  onChange,
  value,
}: Readonly<{
  onChange: (tab: CenterDetailTab) => void;
  value: CenterDetailTab;
}>) {
  const labels = useMessages().places.center.tabs;
  const items = centerDetailTabOrder.map((tab) => ({
    label: labels[tab],
    value: tab,
  }));
  return <TourismTabs items={items} onChange={onChange} value={value} />;
}
