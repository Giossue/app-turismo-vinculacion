import { ScrollView, StyleSheet } from "react-native";

import { TourismChoiceChip } from "@/core/ui/tourism-controls";
import { turismoSpacing } from "@/core/ui/tokens";
import {
  establishmentMapGroups,
  getEstablishmentMapGroup,
} from "@/features/establishments/domain/establishment-groups";
import type { ExploreMapFilter } from "../domain/explore-map-filter";

const primaryGroups = establishmentMapGroups.filter((group) => group.primary);

/**
 * Chips over the map, like Google Maps: "Turismo" (tourist centers), the main
 * groups of the tourism registry and "Ver más". Without a selected chip the
 * map shows everything; a group chosen in "Ver más" appears as a selected
 * chip before it.
 */
export function ExploreFilterChips({
  filter,
  onChange,
  onMore,
}: Readonly<{
  filter: ExploreMapFilter;
  onChange: (filter: ExploreMapFilter) => void;
  onMore: () => void;
}>) {
  const selectedGroup =
    filter?.kind === "establishments" ? filter.group : undefined;
  const moreGroup =
    selectedGroup && !getEstablishmentMapGroup(selectedGroup).primary
      ? getEstablishmentMapGroup(selectedGroup)
      : undefined;

  return (
    <ScrollView
      accessibilityLabel="Filtros del mapa"
      contentContainerStyle={styles.chips}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
    >
      <TourismChoiceChip
        glass
        icon="landmark"
        label="Turismo"
        onPress={() => onChange({ kind: "tourism" })}
        selected={filter?.kind === "tourism"}
      />
      {primaryGroups.map((group) => (
        <TourismChoiceChip
          glass
          icon={group.icon}
          key={group.key}
          label={group.label}
          onPress={() => onChange({ kind: "establishments", group: group.key })}
          selected={selectedGroup === group.key}
        />
      ))}
      {moreGroup ? (
        <TourismChoiceChip
          glass
          icon={moreGroup.icon}
          label={moreGroup.label}
          onPress={() =>
            onChange({ kind: "establishments", group: moreGroup.key })
          }
          selected
        />
      ) : null}
      <TourismChoiceChip
        glass
        icon="sliders"
        label="Ver más"
        onPress={onMore}
        selected={false}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  chips: {
    alignItems: "center",
    gap: turismoSpacing.xs,
    paddingRight: turismoSpacing.md,
  },
});
