import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoOpacity,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { OpinionRatingSummary } from "@/features/opinions/domain/opinion";
import { formatRating } from "../../domain/center-format";
import { useMessages } from "@/core/i18n/use-language";

/**
 * Average rating chip that opens the opinions tab. Renders nothing until the
 * center has at least one rated opinion.
 */
export function CenterRatingSummary({
  onPress,
  style,
  summary,
}: Readonly<{
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  summary?: OpinionRatingSummary;
}>) {
  const colors = useTurismoPalette();
  const text = useMessages().places.center.rating;
  if (!summary || summary.averageRating === null || summary.total === 0) {
    return null;
  }
  const rating = formatRating(summary.averageRating);

  return (
    <Pressable
      accessibilityHint={text.viewOpinions}
      accessibilityLabel={text.label(rating, summary.total)}
      accessibilityRole="button"
      hitSlop={turismoMetrics.chipHitSlop}
      onPress={onPress}
      style={({ pressed }) => [
        styles.summary,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        pressed && styles.pressed,
        style,
      ]}
    >
      <TurismoIcon color={colors.warm} name="star" size={turismoIconSizes.sm} />
      <Text style={[styles.value, { color: colors.text }]}>{rating}</Text>
      <Text style={[styles.count, { color: colors.textMuted }]}>
        ({text.count(summary.total)})
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  summary: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: turismoRadii.xs,
    borderWidth: turismoMetrics.borderWidth,
    flexDirection: "row",
    gap: turismoSpacing.xxs,
    minHeight: turismoMetrics.chipHeight,
    paddingHorizontal: turismoSpacing.xs,
  },
  pressed: { opacity: turismoOpacity.pressed },
  value: { ...turismoTypography.label },
  count: { ...turismoTypography.caption },
});
