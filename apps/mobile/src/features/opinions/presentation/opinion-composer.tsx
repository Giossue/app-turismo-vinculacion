import { StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  TourismActionButton,
  TourismSurface,
} from "@/core/ui/tourism-controls";
import {
  TourismFieldError,
  TourismFieldLabel,
  TourismTextField,
} from "@/core/ui/tourism-fields";
import { turismoSpacing, turismoTypography } from "@/core/ui/tokens";
import { OPINION_COMMENT_MAX_LENGTH } from "../domain/opinion";
import { OpinionRatingInput } from "./opinion-stars";

/** Rating and comment of a new or edited opinion, sent to moderation. */
export function OpinionComposer({
  comment,
  error,
  loading,
  onCancel,
  onChangeComment,
  onChangeRating,
  onSubmit,
  rating,
  title,
}: Readonly<{
  comment: string;
  error: string | null;
  loading: boolean;
  onCancel?: () => void;
  onChangeComment: (value: string) => void;
  onChangeRating: (value: number | null) => void;
  onSubmit: () => void;
  rating: number | null;
  title: string;
}>) {
  const colors = useTurismoPalette();
  return (
    <TourismSurface style={styles.composer}>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.text }]}
      >
        {title}
      </Text>
      <View style={styles.field}>
        <TourismFieldLabel label="Calificación" />
        <OpinionRatingInput
          disabled={loading}
          onChange={onChangeRating}
          rating={rating}
        />
      </View>
      <TourismTextField
        accessibilityLabel="Comentario de la opinión"
        editable={!loading}
        label="Descripción"
        maxLength={OPINION_COMMENT_MAX_LENGTH}
        multiline
        onChangeText={onChangeComment}
        placeholder="Cuenta qué te pareció este lugar…"
        value={comment}
      />
      {error ? <TourismFieldError message={error} /> : null}
      <View style={styles.actions}>
        {onCancel ? (
          <TourismActionButton
            compact
            label="Cancelar"
            mode="outlined"
            onPress={onCancel}
          />
        ) : null}
        <TourismActionButton
          compact
          disabled={loading}
          label={loading ? "Enviando…" : "Enviar a revisión"}
          loading={loading}
          onPress={onSubmit}
        />
      </View>
    </TourismSurface>
  );
}

const styles = StyleSheet.create({
  composer: { gap: turismoSpacing.sm, padding: turismoSpacing.md },
  title: { ...turismoTypography.label },
  field: { gap: turismoSpacing.xs },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    justifyContent: "flex-end",
  },
});
