import { StyleSheet, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismPressable } from "@/core/ui/tourism-pressable";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoSpacing,
} from "@/core/ui/tokens";
import { formatRating } from "@/features/centers/domain/center-format";
import { useMessages } from "@/core/i18n/use-language";
import { messages } from "@/core/i18n/language";

const starValues = [1, 2, 3, 4, 5] as const;

/** Read-only stars, announced once with the rounded rating. */
export function OpinionRatingStars({
  rating,
}: Readonly<{ rating: number | null }>) {
  const colors = useTurismoPalette();
  const filled = Math.round(rating ?? 0);
  const color = rating ? colors.warm : colors.textFaint;
  return (
    <View
      accessibilityLabel={describeRating(rating)}
      accessibilityRole="image"
      accessible
      style={styles.stars}
    >
      {starValues.map((value) => (
        <TurismoIcon
          color={color}
          fill={value <= filled ? color : "none"}
          key={value}
          name="star"
          size={turismoIconSizes.xs}
        />
      ))}
    </View>
  );
}

/**
 * Rating picker: a radio group of five stars. Tapping the selected star
 * again clears the rating, since an opinion may be only a comment.
 */
export function OpinionRatingInput({
  disabled = false,
  onChange,
  rating,
}: Readonly<{
  disabled?: boolean;
  onChange: (rating: number | null) => void;
  rating: number | null;
}>) {
  const text = useMessages().community.opinions;
  const colors = useTurismoPalette();
  return (
    <View
      accessibilityLabel={text.rating}
      accessibilityRole="radiogroup"
      style={[styles.stars, styles.inputStars]}
    >
      {starValues.map((value) => {
        const checked = rating === value;
        const lit = value <= (rating ?? 0);
        return (
          <TourismPressable
            accessibilityHint={checked ? text.tapToClear : undefined}
            accessibilityLabel={text.stars(value)}
            accessibilityRole="radio"
            accessibilityState={{ checked, disabled }}
            borderlessRipple
            disabled={disabled}
            hitSlop={turismoMetrics.chipHitSlop}
            key={value}
            onPress={() => onChange(checked ? null : value)}
            style={styles.starButton}
          >
            <TurismoIcon
              color={lit ? colors.warm : colors.textFaint}
              fill={lit ? colors.warm : "none"}
              name="star"
              size={turismoIconSizes.xl}
            />
          </TourismPressable>
        );
      })}
    </View>
  );
}

function describeRating(rating: number | null): string {
  const text = messages().community.opinions;
  if (rating === null) return text.noRating;
  const value = Number.isInteger(rating)
    ? String(rating)
    : formatRating(rating);
  return text.ratingValue(value);
}

const styles = StyleSheet.create({
  stars: { alignItems: "center", flexDirection: "row" },
  inputStars: { gap: turismoSpacing.xs },
  starButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: turismoMetrics.touchTarget,
    minWidth: turismoMetrics.touchTarget,
  },
});
