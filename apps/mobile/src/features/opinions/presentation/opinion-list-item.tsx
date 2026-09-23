import { StyleSheet, Text, View } from "react-native";

import { formatRelativeDate } from "@/core/format/date";
import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismSurface } from "@/core/ui/tourism-controls";
import { TourismPressable } from "@/core/ui/tourism-pressable";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { PublicOpinion } from "../domain/opinion";
import { OpinionRatingStars } from "./opinion-stars";

/** A published opinion. `onEdit` is set only for the tourist's own one. */
export function OpinionListItem({
  onEdit,
  opinion,
}: Readonly<{ onEdit?: () => void; opinion: PublicOpinion }>) {
  const colors = useTurismoPalette();

  return (
    <TourismSurface
      style={[styles.item, { backgroundColor: colors.surfaceMuted }]}
    >
      <View style={styles.header}>
        <View style={styles.author}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: colors.primarySoft,
                borderColor: colors.primary,
              },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.primaryStrong }]}>
              {getInitials(opinion.authorName)}
            </Text>
          </View>
          <View style={styles.authorDetails}>
            <Text style={[styles.authorName, { color: colors.text }]}>
              {opinion.authorName}
            </Text>
            <Text style={[styles.date, { color: colors.textFaint }]}>
              {formatRelativeDate(opinion.publishedAt)}
            </Text>
          </View>
        </View>
        {opinion.rating !== null || onEdit ? (
          <View style={styles.actions}>
            {opinion.rating !== null ? (
              <OpinionRatingStars rating={opinion.rating} />
            ) : null}
            {onEdit ? (
              <TourismPressable
                accessibilityLabel="Editar mi opinión"
                accessibilityRole="button"
                borderlessRipple
                hitSlop={turismoMetrics.chipHitSlop}
                onPress={onEdit}
                style={styles.editButton}
              >
                <TurismoIcon
                  color={colors.accent}
                  name="pencil"
                  size={turismoIconSizes.sm}
                />
              </TourismPressable>
            ) : null}
          </View>
        ) : null}
      </View>
      {opinion.comment ? (
        <Text style={[styles.comment, { color: colors.textMuted }]}>
          {opinion.comment}
        </Text>
      ) : null}
    </TourismSurface>
  );
}

function getInitials(value: string): string {
  const initials = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
  return initials || "?";
}

const styles = StyleSheet.create({
  item: {
    borderRadius: turismoRadii.sm,
    gap: turismoSpacing.sm,
    padding: turismoSpacing.md,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    justifyContent: "space-between",
  },
  actions: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.xxs,
  },
  editButton: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    minHeight: turismoMetrics.touchTarget,
    minWidth: turismoMetrics.touchTarget,
    paddingTop: turismoSpacing.xxs,
  },
  author: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minWidth: 0,
  },
  avatar: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    borderWidth: turismoMetrics.borderWidth,
    height: turismoMetrics.avatarSm,
    justifyContent: "center",
    width: turismoMetrics.avatarSm,
  },
  avatarText: { ...turismoTypography.caption, fontWeight: "600" },
  authorDetails: { flex: 1, gap: turismoSpacing.xxs, minWidth: 0 },
  authorName: { ...turismoTypography.label },
  date: { ...turismoTypography.caption },
  comment: { ...turismoTypography.bodySmall },
});
