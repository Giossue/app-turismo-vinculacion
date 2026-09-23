import { StyleSheet, Text, View } from "react-native";

import {
  TourismBottomSheet,
  TourismSheetScrollView,
} from "@/core/ui/tourism-bottom-sheet";
import { TourismOptionRow } from "@/core/ui/tourism-option-row";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { turismoSpacing, turismoTypography } from "@/core/ui/tokens";
import { establishmentMapGroups } from "@/features/establishments/domain/establishment-groups";
import type { ExploreMapFilter } from "../domain/explore-map-filter";

const moreGroups = establishmentMapGroups.filter((group) => !group.primary);

/** "Ver más": the registry groups that do not fit as chips over the map. */
export function ExploreMoreFiltersSheet({
  filter,
  onClose,
  onSelect,
}: Readonly<{
  filter: ExploreMapFilter;
  onClose: () => void;
  onSelect: (filter: ExploreMapFilter) => void;
}>) {
  const colors = useTurismoPalette();
  const selectedGroup =
    filter?.kind === "establishments" ? filter.group : undefined;

  return (
    <TourismBottomSheet onClose={onClose}>
      <TourismSheetScrollView contentStyle={styles.content}>
        <View style={styles.header}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.text }]}
          >
            Más lugares
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Elige qué quieres ver en el mapa.
          </Text>
        </View>
        {moreGroups.map((group) => (
          <TourismOptionRow
            icon={group.icon}
            key={group.key}
            onPress={() =>
              onSelect({ kind: "establishments", group: group.key })
            }
            selected={selectedGroup === group.key}
            title={group.label}
          />
        ))}
      </TourismSheetScrollView>
    </TourismBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: turismoSpacing.sm, paddingBottom: turismoSpacing.xxl },
  header: { gap: turismoSpacing.xs, marginBottom: turismoSpacing.sm },
  title: { ...turismoTypography.heading },
  subtitle: { ...turismoTypography.body },
});
