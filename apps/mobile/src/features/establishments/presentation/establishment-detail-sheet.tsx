import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { StyleSheet, Text, View } from "react-native";

import {
  TourismActionButton,
  TourismBadge,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
import {
  tourismFlexibleSheetBehavior,
  tourismFlexibleSheetSnapPoints,
} from "@/core/ui/tourism-bottom-sheet";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { PublicMapEstablishment } from "../domain/establishment";

export function EstablishmentDetailSheet({
  establishment,
  onClose,
  onOpenRoute,
}: Readonly<{
  establishment: PublicMapEstablishment;
  onClose: () => void;
  onOpenRoute: () => void;
}>) {
  const colors = useTurismoPalette();

  return (
    <BottomSheet
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
              {establishment.name}
            </Text>
            {establishment.category ? (
              <TourismBadge>{establishment.category}</TourismBadge>
            ) : null}
          </View>
        </View>

        <View style={styles.infoRow}>
          <TurismoIcon
            color={colors.primaryStrong}
            name="mapPin"
            size={turismoIconSizes.md}
          />
          <View style={styles.infoCopy}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
              Ubicación
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {establishment.approximate
                ? "Punto de referencia aproximado"
                : "Coordenadas registradas"}
            </Text>
          </View>
        </View>

        <TourismActionButton
          icon="route"
          label="Cómo llegar"
          onPress={onOpenRoute}
        />
      </BottomSheetScrollView>
    </BottomSheet>
  );
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
  headerCopy: { flex: 1, gap: turismoSpacing.sm },
  title: { ...turismoTypography.heading },
  infoRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  infoCopy: { flex: 1, gap: turismoSpacing.xxs },
  infoLabel: { ...turismoTypography.caption },
  infoValue: { ...turismoTypography.body },
});
