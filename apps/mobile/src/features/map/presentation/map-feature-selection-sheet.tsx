import { StyleSheet, Text, View } from "react-native";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";

import { TourismBottomSheet } from "@/core/ui/tourism-bottom-sheet";
import { TourismOptionRow } from "@/core/ui/tourism-option-row";
import { useTurismoPalette } from "@/core/ui/theme-context";
import type { TurismoIconName } from "@/core/ui/turismo-icons";
import { turismoSpacing, turismoTypography } from "@/core/ui/tokens";
import {
  getEstablishmentKey,
  getEstablishmentLabel,
} from "@/features/establishments/domain/establishment";
import { getEstablishmentPin } from "@/features/establishments/presentation/establishment-pins";
import type { MapFeatureSelection } from "../domain/map-feature-selection";

/** Tarjetas creadas al abrir; el resto se crea de a este número al bajar. */
const optionsBatchSize = 5;

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
    <TourismBottomSheet onClose={onClose}>
      {/* Lista virtualizada: con muchos lugares cercanos, crear todas las
          tarjetas al abrir retrasaba la sheet. */}
      <BottomSheetFlatList
        ItemSeparatorComponent={OptionSeparator}
        ListHeaderComponent={
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
        }
        contentContainerStyle={styles.container}
        data={selections}
        initialNumToRender={optionsBatchSize}
        keyExtractor={(selection, index) =>
          `${getSelectionKey(selection)}:${index}`
        }
        maxToRenderPerBatch={optionsBatchSize}
        renderItem={({ item }) => (
          <SelectionOption onPress={() => onSelect(item)} selection={item} />
        )}
        showsVerticalScrollIndicator={false}
        style={styles.list}
        windowSize={optionsBatchSize}
      />
    </TourismBottomSheet>
  );
}

function OptionSeparator() {
  return <View style={styles.separator} />;
}

function SelectionOption({
  onPress,
  selection,
}: Readonly<{ onPress: () => void; selection: MapFeatureSelection }>) {
  const isCenter = selection.kind === "center";
  const category = isCenter
    ? selection.center.category
    : getEstablishmentLabel(selection.establishment);

  return (
    <TourismOptionRow
      accessibilityHint={
        isCenter
          ? "Abre la ficha del centro turístico"
          : "Abre la ficha del punto de interés"
      }
      icon={getSelectionIcon(selection)}
      onPress={onPress}
      subtitle={
        isCenter
          ? `Centro turístico · ${category}`
          : `Punto de interés · ${category ?? "Establecimiento turístico"}`
      }
      title={isCenter ? selection.center.name : selection.establishment.name}
    />
  );
}

function getSelectionIcon(selection: MapFeatureSelection): TurismoIconName {
  if (selection.kind === "center") return "mapPinned";
  return getEstablishmentPin(selection.establishment.icon).icon;
}

function getSelectionKey(selection: MapFeatureSelection): string {
  if (selection.kind === "center") return `center:${selection.center.code}`;
  return `establishment:${getEstablishmentKey(selection.establishment)}`;
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  container: {
    padding: turismoSpacing.lg,
    paddingBottom: turismoSpacing.xxl,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    justifyContent: "space-between",
    marginBottom: turismoSpacing.lg,
  },
  headerCopy: { flex: 1, gap: turismoSpacing.xs },
  title: { ...turismoTypography.heading },
  subtitle: { ...turismoTypography.body },
  separator: { height: turismoSpacing.sm },
});
