import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "./theme-context";
import { TourismActionButton, TourismSurface } from "./tourism-controls";
import { TurismoIcon, type TurismoIconName } from "./turismo-icons";
import { turismoIconSizes, turismoSpacing, turismoTypography } from "./tokens";

export type TourismStateVariant = "loading" | "error" | "empty";

/**
 * Loading, error and empty states with one look across the app.
 *
 * - `fill` centers the state in the whole screen or panel.
 * - `inline` sits inside a list: a spinner row while loading, otherwise a
 *   centered column.
 * - `card` wraps the state in a `TourismSurface`.
 *
 * Errors default to the `wifiOff` icon and, with `onAction`, show a retry
 * button labeled `actionLabel` (default `Reintentar`).
 */
export function TourismStateView({
  actionIcon,
  actionLabel,
  actionPending = false,
  icon,
  layout = "fill",
  message,
  onAction,
  title,
  variant,
}: Readonly<{
  actionIcon?: TurismoIconName;
  actionLabel?: string;
  actionPending?: boolean;
  icon?: TurismoIconName;
  layout?: "fill" | "inline" | "card";
  message?: string;
  onAction?: () => void;
  title?: string;
  variant: TourismStateVariant;
}>) {
  const colors = useTurismoPalette();
  const compact = layout !== "fill";
  const messageStyle = [
    compact ? styles.compactMessage : styles.message,
    { color: colors.textMuted },
  ];

  if (variant === "loading" && layout === "inline") {
    return (
      <View
        accessibilityLabel={message ?? title}
        accessibilityRole="progressbar"
        accessible
        style={styles.loadingRow}
      >
        <ActivityIndicator color={colors.primary} size="small" />
        {message ? (
          <Text style={[messageStyle, styles.loadingRowMessage]}>
            {message}
          </Text>
        ) : null}
      </View>
    );
  }

  const stateIcon =
    icon ??
    (variant === "error"
      ? "wifiOff"
      : variant === "empty"
        ? "search"
        : undefined);
  const content = (
    <>
      {variant === "loading" ? (
        <ActivityIndicator
          accessibilityLabel={message ?? title}
          color={colors.primary}
          size={compact ? "small" : "large"}
        />
      ) : stateIcon ? (
        <TurismoIcon
          color={variant === "error" ? colors.danger : colors.primaryStrong}
          name={stateIcon}
          size={compact ? turismoIconSizes.lg : turismoIconSizes.xl}
        />
      ) : null}
      {title ? (
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      ) : null}
      {message ? <Text style={messageStyle}>{message}</Text> : null}
      {onAction ? (
        <TourismActionButton
          disabled={actionPending}
          icon={actionIcon ?? (variant === "error" ? "refresh" : undefined)}
          label={actionLabel ?? "Reintentar"}
          loading={actionPending}
          mode={compact ? "outlined" : "contained"}
          onPress={onAction}
        />
      ) : null}
    </>
  );

  if (layout === "card") {
    return <TourismSurface style={styles.card}>{content}</TourismSurface>;
  }
  return (
    <View style={layout === "fill" ? styles.fill : styles.inline}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    alignItems: "center",
    flex: 1,
    gap: turismoSpacing.md,
    justifyContent: "center",
    padding: turismoSpacing.xl,
  },
  inline: {
    alignItems: "center",
    gap: turismoSpacing.sm,
    paddingVertical: turismoSpacing.lg,
  },
  card: {
    alignItems: "center",
    gap: turismoSpacing.sm,
    padding: turismoSpacing.lg,
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    paddingVertical: turismoSpacing.sm,
  },
  loadingRowMessage: { flexShrink: 1, textAlign: "left" },
  title: { ...turismoTypography.heading, textAlign: "center" },
  message: { ...turismoTypography.body, textAlign: "center" },
  compactMessage: { ...turismoTypography.caption, textAlign: "center" },
});
