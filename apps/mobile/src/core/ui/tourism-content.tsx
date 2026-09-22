import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "./theme-context";
import { TourismSectionTitle, TourismSurface } from "./tourism-controls";
import { TurismoIcon, type TurismoIconName } from "./turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoSpacing,
  turismoTypography,
} from "./tokens";

/** Caption label over a body value, optionally led by an icon. */
export function TourismInfoRow({
  icon,
  label,
  value,
}: Readonly<{ icon?: TurismoIconName; label: string; value: string }>) {
  const colors = useTurismoPalette();
  const copy = (
    <View style={[styles.infoCopy, icon && styles.infoCopyWithIcon]}>
      <Text style={[styles.infoLabel, { color: colors.textFaint }]}>
        {label}
      </Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
  if (!icon) return copy;
  return (
    <View style={styles.infoRowWithIcon}>
      <TurismoIcon
        color={colors.primaryStrong}
        name={icon}
        size={turismoIconSizes.md}
      />
      {copy}
    </View>
  );
}

/**
 * Titled block of detail content. `card` sits on a `TourismSurface`;
 * `divided` separates stacked sections with a bottom rule.
 */
export function TourismSection({
  children,
  icon,
  title,
  variant,
}: Readonly<{
  children: ReactNode;
  icon?: TurismoIconName;
  title: string;
  variant: "card" | "divided";
}>) {
  const colors = useTurismoPalette();
  const body = (
    <>
      <View style={styles.sectionHeader}>
        {icon ? (
          <TurismoIcon
            color={colors.primaryStrong}
            name={icon}
            size={turismoIconSizes.md}
          />
        ) : null}
        <TourismSectionTitle>{title}</TourismSectionTitle>
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </>
  );

  if (variant === "card") {
    return <TourismSurface style={styles.cardSection}>{body}</TourismSurface>;
  }
  return (
    <View style={[styles.dividedSection, { borderBottomColor: colors.border }]}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  infoCopy: { gap: turismoSpacing.xxs },
  infoCopyWithIcon: { flex: 1 },
  infoRowWithIcon: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  infoLabel: { ...turismoTypography.caption },
  infoValue: { ...turismoTypography.body },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  sectionContent: { gap: turismoSpacing.sm, minWidth: 0 },
  cardSection: { gap: turismoSpacing.md, padding: turismoSpacing.md },
  dividedSection: {
    borderBottomWidth: turismoMetrics.borderWidth,
    gap: turismoSpacing.sm,
    minWidth: 0,
    paddingBottom: turismoSpacing.lg,
    paddingTop: turismoSpacing.md,
  },
});
