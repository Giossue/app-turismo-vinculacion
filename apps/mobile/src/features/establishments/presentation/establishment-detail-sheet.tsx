import { StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  TourismActionButton,
  TourismBadge,
  TourismIconAction,
} from "@/core/ui/tourism-controls";
import {
  TourismBottomSheet,
  TourismSheetScrollView,
} from "@/core/ui/tourism-bottom-sheet";
import { TourismInfoRow } from "@/core/ui/tourism-content";
import { turismoSpacing, turismoTypography } from "@/core/ui/tokens";
import {
  getEstablishmentLabel,
  type PublicMapEstablishment,
} from "../domain/establishment";

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
  const categoryLabel = getEstablishmentLabel(establishment);

  return (
    <TourismBottomSheet onClose={onClose}>
      <TourismSheetScrollView contentStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.text }]}>
              {establishment.name}
            </Text>
            {categoryLabel ? (
              <TourismBadge>{categoryLabel}</TourismBadge>
            ) : null}
          </View>
          <TourismIconAction
            accessibilityLabel="Cerrar"
            icon="close"
            onPress={onClose}
            variant="ghost"
          />
        </View>

        <TourismInfoRow
          icon="mapPin"
          label="Ubicación"
          value={
            establishment.approximate
              ? "Punto de referencia aproximado"
              : "Coordenadas registradas"
          }
        />

        <TourismActionButton
          icon="route"
          label="Cómo llegar"
          onPress={onOpenRoute}
        />
      </TourismSheetScrollView>
    </TourismBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: turismoSpacing.lg,
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
});
