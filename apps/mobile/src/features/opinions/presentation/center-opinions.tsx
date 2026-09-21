import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import {
  TourismActionButton,
  TourismChoiceChip,
  TourismSurface,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
import {
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { useAuth } from "@/features/auth/application/auth-context";
import {
  useCenterOpinionMutation,
  useCenterOpinions,
  useOwnCenterOpinion,
} from "../application/use-center-opinions";

export function CenterOpinions({
  code,
  onRequireAuth,
}: Readonly<{
  code: string;
  onRequireAuth?: () => void;
}>) {
  const colors = useTurismoPalette();
  const router = useRouter();
  const auth = useAuth();
  const opinions = useCenterOpinions(code);
  const own = useOwnCenterOpinion(code);
  const mutation = useCenterOpinionMutation();
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<"all" | "recent">("all");

  const ownState = own.data ?? null;
  const formMode = ownState?.canEdit && editing ? "edit" : "create";
  const canOpenForm =
    auth.status === "authenticated" &&
    (ownState === null || ownState.canCreate || ownState.canEdit);

  const averageLabel = useMemo(() => {
    const average = opinions.data?.summary.averageRating;
    return average === null || average === undefined ? "—" : average.toFixed(1);
  }, [opinions.data?.summary.averageRating]);

  const visibleOpinions = useMemo(() => {
    const items = opinions.data?.items ?? [];
    return reviewFilter === "recent" ? items.slice(0, 3) : items;
  }, [opinions.data?.items, reviewFilter]);

  function requireAuth() {
    if (onRequireAuth) {
      onRequireAuth();
      return;
    }
    router.push({
      pathname: "/login",
      params: { returnTo: `/centers/${code}` },
    } as never);
  }

  function startCreate() {
    if (auth.status !== "authenticated") {
      requireAuth();
      return;
    }
    setFormError(null);
    setRating(null);
    setComment("");
    setEditing(true);
  }

  function startEdit() {
    setFormError(null);
    setRating(ownState?.current?.rating ?? null);
    setComment(ownState?.current?.comment ?? "");
    setEditing(true);
  }

  async function submit() {
    const normalizedComment = comment.trim();
    if (rating === null && !normalizedComment) {
      setFormError("Selecciona una calificación o escribe un comentario.");
      return;
    }
    setFormError(null);
    try {
      await mutation.mutateAsync({
        code,
        content: { rating, comment: normalizedComment },
        mode: formMode,
      });
      setEditing(false);
      setRating(null);
      setComment("");
    } catch (cause) {
      setFormError(
        cause instanceof Error
          ? cause.message
          : "No se pudo enviar la opinión.",
      );
    }
  }

  return (
    <View style={styles.container}>
      <TourismSurface style={styles.summary}>
        <View style={styles.summaryContent}>
          <View style={styles.averageBlock}>
            <Text style={[styles.averageValue, { color: colors.text }]}>
              {averageLabel}
            </Text>
            <Stars
              compact
              rating={opinions.data?.summary.averageRating ?? null}
              readOnly
            />
            <Text style={[styles.summaryMeta, { color: colors.textMuted }]}>
              {opinions.data?.summary.total ?? 0} opiniones
            </Text>
          </View>
          <RatingDistribution
            distribution={
              opinions.data?.summary.distribution ?? emptyDistribution
            }
          />
        </View>
      </TourismSurface>

      {opinions.data?.total ? (
        <View style={styles.filters}>
          <TourismChoiceChip
            label="Todas"
            onPress={() => setReviewFilter("all")}
            selected={reviewFilter === "all"}
          />
          <TourismChoiceChip
            label="Recientes"
            onPress={() => setReviewFilter("recent")}
            selected={reviewFilter === "recent"}
          />
        </View>
      ) : null}

      {opinions.isPending ? (
        <View style={styles.stateRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.stateText, { color: colors.textMuted }]}>
            Cargando opiniones…
          </Text>
        </View>
      ) : opinions.error ? (
        <TourismSurface style={styles.stateSurface}>
          <Text style={[styles.stateText, { color: colors.textMuted }]}>
            No pudimos cargar las opiniones.
          </Text>
          <TourismActionButton
            compact
            icon="refresh"
            label="Reintentar"
            mode="outlined"
            onPress={() => void opinions.refetch()}
          />
        </TourismSurface>
      ) : visibleOpinions.length ? (
        visibleOpinions.map((opinion, index) => (
          <TourismSurface
            key={`${opinion.publishedAt}-${index}`}
            style={styles.opinionItem}
          >
            <View style={styles.opinionHeader}>
              <Text style={[styles.author, { color: colors.text }]}>
                {opinion.authorName}
              </Text>
              <Text style={[styles.date, { color: colors.textFaint }]}>
                {formatDate(opinion.publishedAt)}
              </Text>
            </View>
            {opinion.rating !== null ? (
              <Stars compact rating={opinion.rating} readOnly />
            ) : null}
            {opinion.comment ? (
              <Text style={[styles.comment, { color: colors.textMuted }]}>
                {opinion.comment}
              </Text>
            ) : null}
          </TourismSurface>
        ))
      ) : null}

      {auth.status === "anonymous" ? (
        <TourismSurface style={styles.composerNotice}>
          <Text style={[styles.noticeTitle, { color: colors.text }]}>
            Comparte tu experiencia
          </Text>
          <Text style={[styles.stateText, { color: colors.textMuted }]}>
            Inicia sesión para calificar y escribir una opinión.
          </Text>
          <TourismActionButton
            compact
            label="Escribir una opinión"
            onPress={requireAuth}
          />
        </TourismSurface>
      ) : auth.status === "authenticated" && own.error ? (
        <TourismSurface style={styles.composerNotice}>
          <Text style={[styles.stateText, { color: colors.textMuted }]}>
            No pudimos consultar tu opinión.
          </Text>
          <TourismActionButton
            compact
            icon="refresh"
            label="Reintentar"
            mode="outlined"
            onPress={() => void own.refetch()}
          />
        </TourismSurface>
      ) : auth.status === "authenticated" && ownState?.pending ? (
        <TourismSurface style={styles.composerNotice}>
          <Text style={[styles.noticeTitle, { color: colors.text }]}>
            Tu opinión está en revisión
          </Text>
          <Text style={[styles.stateText, { color: colors.textMuted }]}>
            La versión enviada será visible cuando un administrador la apruebe.
          </Text>
          {ownState.current ? (
            <Text style={[styles.stateText, { color: colors.textMuted }]}>
              Mientras tanto, tu versión publicada anterior permanece visible.
            </Text>
          ) : null}
        </TourismSurface>
      ) : auth.status === "authenticated" && ownState?.lastRejected ? (
        <TourismSurface style={styles.composerNotice}>
          <Text style={[styles.noticeTitle, { color: colors.text }]}>
            La última versión fue rechazada
          </Text>
          {ownState.lastRejected.reason ? (
            <Text style={[styles.stateText, { color: colors.textMuted }]}>
              Motivo: {ownState.lastRejected.reason}
            </Text>
          ) : null}
          {ownState.current ? (
            <>
              <Text style={[styles.stateText, { color: colors.textMuted }]}>
                Tu versión anterior sigue publicada.
              </Text>
              <TourismActionButton
                compact
                label="Editar mi opinión"
                onPress={startEdit}
              />
            </>
          ) : (
            <TourismActionButton
              compact
              label="Escribir otra opinión"
              onPress={startCreate}
            />
          )}
        </TourismSurface>
      ) : auth.status === "authenticated" && ownState?.current && !editing ? (
        <TourismSurface style={styles.composerNotice}>
          <Text style={[styles.noticeTitle, { color: colors.text }]}>
            Tu opinión publicada
          </Text>
          <Text style={[styles.stateText, { color: colors.textMuted }]}>
            Puedes editarla; el cambio volverá a revisión.
          </Text>
          <TourismActionButton
            compact
            label="Editar mi opinión"
            onPress={startEdit}
          />
        </TourismSurface>
      ) : auth.status === "authenticated" && canOpenForm ? (
        <OpinionComposer
          comment={comment}
          error={formError}
          loading={mutation.isPending}
          rating={rating}
          title={
            formMode === "edit" ? "Editar mi opinión" : "Escribe una opinión"
          }
          onCancel={formMode === "edit" ? () => setEditing(false) : undefined}
          onChangeComment={setComment}
          onChangeRating={setRating}
          onSubmit={() => void submit()}
        />
      ) : null}
    </View>
  );
}

function OpinionComposer({
  comment,
  error,
  loading,
  rating,
  title,
  onCancel,
  onChangeComment,
  onChangeRating,
  onSubmit,
}: Readonly<{
  comment: string;
  error: string | null;
  loading: boolean;
  rating: number | null;
  title: string;
  onCancel?: () => void;
  onChangeComment: (value: string) => void;
  onChangeRating: (value: number | null) => void;
  onSubmit: () => void;
}>) {
  const colors = useTurismoPalette();
  return (
    <TourismSurface style={styles.composer}>
      <Text style={[styles.noticeTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
        Calificación
      </Text>
      <Stars rating={rating} onChange={onChangeRating} />
      <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
        Descripción
      </Text>
      <TextInput
        accessibilityLabel="Comentario de la opinión"
        editable={!loading}
        multiline
        onChangeText={onChangeComment}
        placeholder="Cuenta qué te pareció este lugar…"
        placeholderTextColor={colors.textFaint}
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        textAlignVertical="top"
        value={comment}
      />
      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}
      <View style={styles.composerActions}>
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
          onPress={onSubmit}
        />
      </View>
    </TourismSurface>
  );
}

function Stars({
  compact = false,
  rating,
  onChange,
  readOnly = false,
}: Readonly<{
  compact?: boolean;
  rating: number | null;
  onChange?: (rating: number | null) => void;
  readOnly?: boolean;
}>) {
  const colors = useTurismoPalette();
  const filledStars = Math.round(rating ?? 0);
  const stars = [1, 2, 3, 4, 5]
    .map((value) => (value <= filledStars ? "★" : "☆"))
    .join("");

  if (readOnly) {
    return (
      <View
        accessibilityLabel={`Calificación ${rating ?? "sin calificación"} de 5`}
        style={styles.stars}
      >
        <Text
          style={[
            styles.star,
            compact && styles.starCompact,
            { color: rating ? colors.warm : colors.textFaint },
          ]}
        >
          {stars}
        </Text>
      </View>
    );
  }

  return (
    <View accessibilityLabel="Seleccionar calificación" style={styles.stars}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Pressable
          accessibilityLabel={`${value} estrellas`}
          accessibilityRole="button"
          accessibilityState={rating === value ? { selected: true } : undefined}
          hitSlop={turismoMetrics.chipHitSlop}
          key={value}
          onPress={() => onChange?.(rating === value ? null : value)}
          style={({ pressed }) => [
            styles.starButton,
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.star,
              {
                color: value <= (rating ?? 0) ? colors.warm : colors.textFaint,
              },
            ]}
          >
            {value <= (rating ?? 0) ? "★" : "☆"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function RatingDistribution({
  distribution,
}: Readonly<{
  distribution: Readonly<Record<"1" | "2" | "3" | "4" | "5", number>>;
}>) {
  const colors = useTurismoPalette();
  const total = Object.values(distribution).reduce(
    (sum, value) => sum + value,
    0,
  );
  return (
    <View style={styles.distribution}>
      {[5, 4, 3, 2, 1].map((value) => {
        const count =
          distribution[String(value) as "1" | "2" | "3" | "4" | "5"];
        const percentage = total ? Math.round((count / total) * 100) : 0;
        return (
          <View key={value} style={styles.distributionRow}>
            <Text
              style={[styles.distributionLabel, { color: colors.textMuted }]}
            >
              {value}
            </Text>
            <View style={[styles.track, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.trackValue,
                  {
                    backgroundColor: colors.primary,
                    width: `${total ? (count / total) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
            <Text
              style={[styles.distributionCount, { color: colors.textFaint }]}
            >
              {percentage}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const emptyDistribution = {
  "1": 0,
  "2": 0,
  "3": 0,
  "4": 0,
  "5": 0,
} as const;

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  container: { gap: turismoSpacing.md },
  summary: { borderWidth: 0, padding: turismoSpacing.md },
  summaryContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.lg,
  },
  averageBlock: {
    alignItems: "center",
    minWidth: 100,
  },
  averageValue: {
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 36,
  },
  summaryMeta: { ...turismoTypography.caption, marginTop: turismoSpacing.xxs },
  filters: {
    flexDirection: "row",
    gap: turismoSpacing.xs,
  },
  distribution: { flex: 1, gap: turismoSpacing.xxs },
  distributionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.xs,
  },
  distributionLabel: { ...turismoTypography.caption, width: 12 },
  track: {
    borderRadius: turismoRadii.pill,
    flex: 1,
    height: 6,
    overflow: "hidden",
  },
  trackValue: { borderRadius: turismoRadii.pill, height: "100%" },
  distributionCount: {
    ...turismoTypography.caption,
    textAlign: "right",
    width: 32,
  },
  stateRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    padding: turismoSpacing.md,
  },
  stateSurface: { gap: turismoSpacing.sm, padding: turismoSpacing.lg },
  stateText: { ...turismoTypography.body },
  emptyTitle: { ...turismoTypography.heading },
  opinionItem: { gap: turismoSpacing.sm, padding: turismoSpacing.md },
  opinionHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    justifyContent: "space-between",
  },
  author: { ...turismoTypography.label, flex: 1 },
  date: { ...turismoTypography.caption },
  comment: { ...turismoTypography.body },
  composerNotice: { gap: turismoSpacing.sm, padding: turismoSpacing.md },
  noticeTitle: { ...turismoTypography.label },
  composer: { gap: turismoSpacing.sm, padding: turismoSpacing.md },
  inputLabel: { ...turismoTypography.caption },
  stars: { alignItems: "center", flexDirection: "row", gap: turismoSpacing.xs },
  starButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: turismoMetrics.touchTarget,
    minWidth: turismoMetrics.touchTarget,
  },
  star: { fontSize: 28, lineHeight: 32 },
  starCompact: { fontSize: 16, lineHeight: 20 },
  pressed: { opacity: 0.65 },
  input: {
    borderRadius: turismoRadii.md,
    borderWidth: turismoMetrics.borderWidth,
    minHeight: 100,
    padding: turismoSpacing.sm,
    ...turismoTypography.body,
  },
  error: { ...turismoTypography.caption },
  composerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    justifyContent: "flex-end",
  },
});
