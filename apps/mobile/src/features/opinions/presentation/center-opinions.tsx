import { useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ApiError } from "@/core/api/http";
import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  TourismActionButton,
  TourismChoiceChip,
  TourismSurface,
} from "@/core/ui/tourism-controls";
import { TourismStateView } from "@/core/ui/tourism-state";
import {
  turismoMetrics,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { useAuth } from "@/features/auth/application/auth-context";
import { buildLoginHref } from "@/features/auth/application/login-href";
import {
  useCenterOpinionMutation,
  useCenterOpinions,
  useOwnCenterOpinion,
} from "../application/use-center-opinions";
import { getOpinionKey } from "../domain/opinion";
import { OpinionComposer } from "./opinion-composer";
import { OpinionListItem } from "./opinion-list-item";
import { OpinionSummary } from "./opinion-summary";

// The API lists opinions newest first, so "Recientes" is the head of it.
const recentOpinionsCount = 3;

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

  const authenticated = auth.status === "authenticated";
  const ownState = own.data ?? null;
  const formMode = ownState?.canEdit && editing ? "edit" : "create";
  const canOpenForm =
    authenticated &&
    (ownState === null || ownState.canCreate || ownState.canEdit);
  const isOwnPublishedOpinion = (publishedAt: string) =>
    authenticated &&
    ownState?.status === "APROBADA" &&
    ownState.canEdit &&
    ownState.current?.submittedAt === publishedAt;

  const items = opinions.data?.items ?? [];
  const visibleOpinions =
    reviewFilter === "recent" ? items.slice(0, recentOpinionsCount) : items;

  function requireAuth() {
    if (onRequireAuth) {
      onRequireAuth();
      return;
    }
    router.push(buildLoginHref(`/centers/${code}`));
  }

  function startCreate() {
    if (!authenticated) {
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
        cause instanceof ApiError
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
      onCancel={formMode === "edit" ? () => setEditing(false) : undefined}
      onChangeComment={setComment}
      onChangeRating={setRating}
      onSubmit={() => void submit()}
      rating={rating}
      title={formMode === "edit" ? "Editar mi opinión" : "Escribe una opinión"}
    />
  );

  return (
    <View style={styles.container}>
      <OpinionSummary summary={opinions.data?.summary} />
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
        <TourismStateView
          layout="inline"
          message="Cargando opiniones…"
          variant="loading"
        />
      ) : opinions.isError && !opinions.data ? (
        <TourismStateView
          actionPending={opinions.isFetching}
          layout="card"
          message="No pudimos cargar las opiniones."
          onAction={() => void opinions.refetch()}
          variant="error"
        />
      ) : (
        visibleOpinions.map((opinion) => (
          <OpinionListItem
            key={getOpinionKey(opinion)}
            onEdit={
              isOwnPublishedOpinion(opinion.publishedAt) ? startEdit : undefined
            }
            opinion={opinion}
          />
        ))
      )}

      {reviewFilter === "all" && opinions.hasNextPage ? (
        <TourismActionButton
          compact
          disabled={opinions.isFetchingNextPage}
          label="Cargar más opiniones"
          loading={opinions.isFetchingNextPage}
          mode="outlined"
          onPress={() => void opinions.fetchNextPage()}
        />
      ) : null}

      {auth.status === "anonymous" ? (
        <TourismSurface style={styles.notice}>
          <Text style={[styles.noticeTitle, { color: colors.text }]}>
            Comparte tu experiencia
          </Text>
          <Text style={[styles.noticeText, { color: colors.textMuted }]}>
            Inicia sesión para calificar y escribir una opinión.
          </Text>
          <TourismActionButton
            compact
            label="Escribir una opinión"
            onPress={requireAuth}
          />
        </TourismSurface>
      ) : authenticated && own.isPending ? (
        // Until the own opinion is known the composer could offer to write
        // a second one; wait for it instead of flashing the form.
        <TourismStateView
          layout="inline"
          message="Consultando tu opinión…"
          variant="loading"
        />
      ) : authenticated && own.error ? (
        <TourismSurface style={styles.notice}>
          <Text style={[styles.noticeText, { color: colors.textMuted }]}>
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
      ) : authenticated && ownState?.pending ? (
        <TourismSurface style={styles.notice}>
          <Text style={[styles.noticeTitle, { color: colors.text }]}>
            Tu opinión está en revisión
          </Text>
          <Text style={[styles.noticeText, { color: colors.textMuted }]}>
            La versión enviada será visible cuando un administrador la apruebe.
          </Text>
          {ownState.current ? (
            <Text style={[styles.noticeText, { color: colors.textMuted }]}>
              Mientras tanto, tu versión publicada anterior permanece visible.
            </Text>
          ) : null}
        </TourismSurface>
      ) : authenticated && ownState?.lastRejected ? (
        <TourismSurface style={styles.notice}>
          <Text style={[styles.noticeTitle, { color: colors.text }]}>
            La última versión fue rechazada
          </Text>
          {ownState.lastRejected.reason ? (
            <Text style={[styles.noticeText, { color: colors.textMuted }]}>
              Motivo: {ownState.lastRejected.reason}
            </Text>
          ) : null}
          {ownState.current ? (
            <>
              <Text style={[styles.noticeText, { color: colors.textMuted }]}>
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
      ) : authenticated && canOpenForm && !ownState?.current ? (
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
            style={[styles.editBackdrop, { backgroundColor: colors.scrim }]}
          >
            {opinionComposer}
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: turismoSpacing.md },
  filters: { flexDirection: "row", gap: turismoSpacing.xs },
  separator: { height: turismoMetrics.borderWidth, width: "100%" },
  notice: { gap: turismoSpacing.sm, padding: turismoSpacing.md },
  noticeTitle: { ...turismoTypography.label },
  noticeText: { ...turismoTypography.body },
  editBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: turismoSpacing.md,
  },
});
