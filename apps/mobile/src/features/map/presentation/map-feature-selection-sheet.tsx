import ExpoBottomSheet, {
  BottomSheetScrollView,
} from "@expo/ui/community/bottom-sheet";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  tourismFlexibleSheetBehavior,
  tourismFlexibleSheetSnapPoints,
} from "@/core/ui/tourism-bottom-sheet";
import { useTurismoPalette } from "@/core/ui/tourism-controls";
import { TurismoIcon, type TurismoIconName } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { MapFeatureSelection } from "../domain/map-feature-selection";

export function MapFeatureSelectionSheet({
  selections,
  onClose,
  onSelect,
}: Readonly<{
  selections: readonly MapFeatureSelection[];
  onClose: () => void;
  onSelect: (selection: MapFeatureSelection) => void;
}>) {
  const colors = useTurismoPalette();

  return (
    <ExpoBottomSheet
      {...tourismFlexibleSheetBehavior}
      backgroundStyle={{ backgroundColor: colors.surface }}
      index={0}
      onClose={onClose}
      snapPoints={tourismFlexibleSheetSnapPoints}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.text }]}>
              Varios lugares aquí
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Selecciona cuál quieres abrir.
            </Text>
          </View>
        </View>
        <View style={styles.options}>
          {selections.map((selection, index) => {
            const isCenter = selection.kind === "center";
            const title = isCenter
              ? selection.center.name
              : selection.establishment.name;
            const category = isCenter
              ? selection.center.category
              : selection.establishment.category;
            const subtitle = isCenter
              ? `Centro turístico · ${category}`
              : `Punto de interés · ${category ?? "Establecimiento turístico"}`;

            return (
              <Pressable
                accessibilityLabel={`Abrir ${title}`}
                accessibilityRole="button"
                key={`${getSelectionKey(selection)}:${index}`}
                onPress={() => onSelect(selection)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceMuted,
                  },
                  pressed && styles.optionPressed,
                ]}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: colors.primarySoft },
                  ]}
                >
                  <TurismoIcon
                    color={colors.primaryStrong}
                    name={getSelectionIcon(selection)}
                    size={turismoIconSizes.md}
                  />
                </View>
                <View style={styles.optionCopy}>
                  <Text
                    numberOfLines={2}
                    style={[styles.optionTitle, { color: colors.text }]}
                  >
                    {title}
                  </Text>
                  <Text
                    style={[styles.optionSubtitle, { color: colors.textMuted }]}
                  >
                    {subtitle}
                  </Text>
                </View>
                <TurismoIcon
                  color={colors.textMuted}
                  name="chevronRight"
                  size={turismoIconSizes.md}
                />
              </Pressable>
            );
          })}
        </View>
      </BottomSheetScrollView>
    </ExpoBottomSheet>
  );
}

const establishmentIconNames: Readonly<Record<string, TurismoIconName>> = {
  hotel: "hotel",
  restaurant: "restaurant",
  coffee: "coffee",
  store: "store",
  bus: "bus",
  ticket: "ticket",
  briefcase: "briefcase",
};

function getSelectionIcon(selection: MapFeatureSelection): TurismoIconName {
  if (selection.kind === "center") return "mapPinned";
  return establishmentIconNames[selection.establishment.icon] ?? "mapPin";
}

function getSelectionKey(selection: MapFeatureSelection): string {
  if (selection.kind === "center") return `center:${selection.center.code}`;
  return `establishment:${selection.establishment.name}:${selection.establishment.latitude}:${selection.establishment.longitude}`;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: {
    flexGrow: 1,
    gap: turismoSpacing.lg,
    padding: turismoSpacing.lg,
    paddingBottom: turismoSpacing.xxl,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    justifyContent: "space-between",
  },
  headerCopy: { flex: 1, gap: turismoSpacing.xs },
  title: { ...turismoTypography.heading },
  subtitle: { ...turismoTypography.body },
  options: { gap: turismoSpacing.sm },
  option: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minHeight: 72,
    paddingHorizontal: turismoSpacing.md,
    paddingVertical: turismoSpacing.sm,
  },
  optionPressed: { opacity: 0.72 },
  iconContainer: {
    alignItems: "center",
    borderRadius: 24,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  optionCopy: { flex: 1, gap: turismoSpacing.xxs },
  optionTitle: { ...turismoTypography.body, fontWeight: "700" },
  optionSubtitle: { ...turismoTypography.caption },
});
