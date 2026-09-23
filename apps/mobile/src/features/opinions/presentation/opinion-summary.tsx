import { StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismSurface } from "@/core/ui/tourism-controls";
import {
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { formatRating } from "@/features/centers/domain/center-format";
import type { PublicOpinionPage } from "../domain/opinion";
import { OpinionRatingStars } from "./opinion-stars";

type RatingDistribution = PublicOpinionPage["summary"]["distribution"];

const ratingLevels = ["5", "4", "3", "2", "1"] as const;

/** Average, star row, count and the 5→1 distribution bars. */
export function OpinionSummary({
  summary,
}: Readonly<{ summary: PublicOpinionPage["summary"] | undefined }>) {
  const colors = useTurismoPalette();
  const average = summary?.averageRating ?? null;
  const count = summary?.total ?? 0;

  return (
    <TourismSurface
      style={[styles.summary, { backgroundColor: colors.surfaceMuted }]}
    >
      <View style={styles.content}>
        <View style={styles.averageBlock}>
          <Text style={[styles.averageValue, { color: colors.text }]}>
            {average === null ? "—" : formatRating(average)}
          </Text>
          <OpinionRatingStars rating={average} />
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {count} {count === 1 ? "opinión" : "opiniones"}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <RatingBars distribution={summary?.distribution ?? emptyDistribution} />
      </View>
    </TourismSurface>
  );
}

function RatingBars({
  distribution,
}: Readonly<{ distribution: RatingDistribution }>) {
  const colors = useTurismoPalette();
  const total = Object.values(distribution).reduce(
    (sum, value) => sum + value,
    0,
  );
  return (
    <View style={styles.distribution}>
      {ratingLevels.map((level) => {
        const share = total ? distribution[level] / total : 0;
        return (
          <View
            accessibilityLabel={`${level} estrellas: ${Math.round(share * 100)}%`}
            accessible
            key={level}
            style={styles.distributionRow}
          >
            <Text
              style={[styles.distributionLabel, { color: colors.textMuted }]}
            >
              {level}
            </Text>
            <View style={[styles.track, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.trackValue,
                  { backgroundColor: colors.primary, width: `${share * 100}%` },
                ]}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[styles.distributionCount, { color: colors.textFaint }]}
            >
              {Math.round(share * 100)}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const emptyDistribution: RatingDistribution = {
  "1": 0,
  "2": 0,
  "3": 0,
  "4": 0,
  "5": 0,
};

const styles = StyleSheet.create({
  summary: { borderRadius: turismoRadii.sm, padding: turismoSpacing.md },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  averageBlock: {
    alignItems: "center",
    flexShrink: 0,
    minWidth: turismoMetrics.ratingSummaryMinWidth,
  },
  averageValue: { ...turismoTypography.stat },
  meta: { ...turismoTypography.caption, marginTop: turismoSpacing.xxs },
  divider: { alignSelf: "stretch", width: turismoMetrics.borderWidth },
  distribution: { flex: 1, gap: turismoSpacing.xxs, minWidth: 0 },
  distributionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.xs,
    minWidth: 0,
  },
  distributionLabel: {
    ...turismoTypography.caption,
    textAlign: "right",
    width: turismoSpacing.sm,
  },
  track: {
    borderRadius: turismoRadii.pill,
    flex: 1,
    height: turismoMetrics.progressTrackHeight,
    overflow: "hidden",
  },
  trackValue: { borderRadius: turismoRadii.pill, height: "100%" },
  distributionCount: {
    ...turismoTypography.caption,
    flexShrink: 0,
    textAlign: "right",
    width: turismoMetrics.ratingPercentWidth,
  },
});
