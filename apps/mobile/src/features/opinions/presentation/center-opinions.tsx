import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
import { TurismoIcon } from "@/core/ui/turismo-icons";
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
  active = true,
  code,
  onRequireAuth,
}: Readonly<{
  active?: boolean;
  code: string;
  onRequireAuth?: () => void;
}>) {
  const colors = useTurismoPalette();
  const router = useRouter();
  const auth = useAuth();
  const opinions = useCenterOpinions(code, active);
  const own = useOwnCenterOpinion(code, active);
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
  const isOwnPublishedOpinion = (publishedAt: string) =>
    auth.status === "authenticated" &&
    ownState?.status === "APROBADA" &&
    ownState.canEdit &&
    ownState.current?.submittedAt === publishedAt;

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

  const opinionComposer = (
    <OpinionComposer
      comment={comment}
      error={formError}
      loading={mutation.isPending}
      rating={rating}
      title={formMode === "edit" ? "Editar mi opinión" : "Escribe una opinión"}
      onCancel={formMode === "edit" ? () => setEditing(false) : undefined}
      onChangeComment={setComment}
      onChangeRating={setRating}
      onSubmit={() => void submit()}
    />
  );

  return (
    <View style={styles.container}>
      <TourismSurface
        style={[styles.summary, { backgroundColor: colors.surfaceMuted }]}
      >
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
          <View
            style={[styles.summaryDivider, { backgroundColor: colors.border }]}
          />
          <RatingDistribution
            distribution={
              opinions.data?.summary.distribution ?? emptyDistribution
            }
          />
        </View>
      </TourismSurface>
      <View style={[styles.separator, { backgroundColor: colors.border }]} />

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
            style={[
              styles.opinionItem,
              { backgroundColor: colors.surfaceMuted },
            ]}
          >
            <View style={styles.opinionHeader}>
              <View style={styles.authorInfo}>
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: colors.primarySoft,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={[styles.avatarText, { color: colors.primaryStrong }]}
                  >
                    {getInitials(opinion.authorName)}
                  </Text>
                </View>
                <View style={styles.authorDetails}>
                  <Text style={[styles.author, { color: colors.text }]}>
                    {opinion.authorName}
                  </Text>
                  <Text style={[styles.date, { color: colors.textFaint }]}>
                    {formatRelativeDate(opinion.publishedAt)}
                  </Text>
                </View>
              </View>
              {opinion.rating !== null ||
              isOwnPublishedOpinion(opinion.publishedAt) ? (
                <View style={styles.opinionActions}>
                  {opinion.rating !== null ? (
                    <Stars compact rating={opinion.rating} readOnly />
                  ) : null}
                  {isOwnPublishedOpinion(opinion.publishedAt) ? (
                    <Pressable
                      accessibilityLabel="Editar mi opinión"
                      accessibilityRole="button"
                      hitSlop={turismoMetrics.chipHitSlop}
                      onPress={startEdit}
                      style={({ pressed }) => [
                        styles.editOpinionButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <TurismoIcon
                        color={colors.accent}
                        name="pencil"
                        size={16}
                      />
                    </Pressable>
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
      ) : auth.status === "authenticated" &&
        canOpenForm &&
        !ownState?.current ? (
        opinionComposer
      ) : null}
      {editing && formMode === "edit" ? (
        <Modal
          animationType="fade"
          onRequestClose={() => setEditing(false)}
          transparent
          visible
        >
          <View
            style={[
              styles.editModalBackdrop,
              { backgroundColor: colors.scrim },
            ]}
          >
            {opinionComposer}
          </View>
        </Modal>
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
              numberOfLines={1}
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

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
  return initials || "?";
}

function formatRelativeDate(value: string): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "";

  const elapsed = Date.now() - timestamp;
  if (elapsed <= 0) return "Ahora";

  const minute = 60 * 1000;
  const day = 24 * 60 * minute;
  const days = Math.floor(elapsed / day);
  if (days === 0) return "Hoy";
  if (days < 7) return `Hace ${days} ${days === 1 ? "día" : "días"}`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `Hace ${weeks} ${weeks === 1 ? "semana" : "semanas"}`;

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `Hace ${months} ${months === 1 ? "mes" : "meses"}`;
  }

  const years = Math.floor(days / 365);
  return `Hace ${years} ${years === 1 ? "año" : "años"}`;
}

const styles = StyleSheet.create({
  container: { gap: turismoSpacing.md },
  summary: {
    borderRadius: turismoRadii.sm,
    padding: turismoSpacing.md,
  },
  summaryContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  summaryDivider: {
    alignSelf: "stretch",
    width: turismoMetrics.borderWidth,
  },
  averageBlock: {
    alignItems: "center",
    flexShrink: 0,
    minWidth: 112,
  },
  averageValue: {
    fontSize: 36,
    fontWeight: "700",
    lineHeight: 40,
  },
  summaryMeta: { ...turismoTypography.caption, marginTop: turismoSpacing.xxs },
  filters: {
    flexDirection: "row",
    gap: turismoSpacing.xs,
  },
  separator: { height: turismoMetrics.borderWidth, width: "100%" },
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
    width: 12,
  },
  track: {
    borderRadius: turismoRadii.pill,
    flex: 1,
    height: 6,
    overflow: "hidden",
  },
  trackValue: { borderRadius: turismoRadii.pill, height: "100%" },
  distributionCount: {
    ...turismoTypography.caption,
    flexShrink: 0,
    textAlign: "right",
    width: 40,
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
  opinionItem: {
    borderRadius: turismoRadii.sm,
    gap: turismoSpacing.sm,
    padding: turismoSpacing.md,
  },
  opinionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    justifyContent: "space-between",
  },
  opinionActions: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: turismoSpacing.xxs,
  },
  editOpinionButton: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    minHeight: turismoMetrics.touchTarget,
    minWidth: turismoMetrics.touchTarget,
    paddingTop: turismoSpacing.xxs,
  },
  authorInfo: {
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
  author: { ...turismoTypography.label },
  date: { ...turismoTypography.caption },
  comment: { ...turismoTypography.body, fontSize: 14, lineHeight: 20 },
  composerNotice: { gap: turismoSpacing.sm, padding: turismoSpacing.md },
  noticeTitle: { ...turismoTypography.label },
  composer: { gap: turismoSpacing.sm, padding: turismoSpacing.md },
  editModalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: turismoSpacing.md,
  },
  inputLabel: { ...turismoTypography.caption },
  stars: { alignItems: "center", flexDirection: "row", gap: turismoSpacing.xs },
  starButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: turismoMetrics.touchTarget,
    minWidth: turismoMetrics.touchTarget,
  },
  star: { fontSize: 28, lineHeight: 32 },
  starCompact: {
    fontSize: 16,
    letterSpacing: 1,
    lineHeight: 20,
  },
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
