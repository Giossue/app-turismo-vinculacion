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
import { OPINIONS_PAGE_SIZE, getOpinionKey } from "../domain/opinion";
import { OpinionComposer } from "./opinion-composer";
import { OpinionListItem } from "./opinion-list-item";
import { OpinionSummary } from "./opinion-summary";
import { useMessages } from "@/core/i18n/use-language";

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
  const m = useMessages();
  const text = useMessages().community.opinions;
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

  const [page, setPage] = useState(0);

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
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(items.length / OPINIONS_PAGE_SIZE) - 1),
  );
  const visibleOpinions =
    reviewFilter === "recent"
      ? items.slice(0, recentOpinionsCount)
      : items.slice(
          currentPage * OPINIONS_PAGE_SIZE,
          (currentPage + 1) * OPINIONS_PAGE_SIZE,
        );
  const hasLoadedNext = (currentPage + 1) * OPINIONS_PAGE_SIZE < items.length;

  async function nextPage() {
    if (hasLoadedNext) {
      setPage(currentPage + 1);
      return;
    }
    const result = await opinions.fetchNextPage();
    if (
      result.data &&
      result.data.items.length > (currentPage + 1) * OPINIONS_PAGE_SIZE
    )
      setPage(currentPage + 1);
  }

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
      setFormError(text.ratingOrComment);
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
      setFormError(cause instanceof ApiError ? cause.message : text.sendFailed);
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
      title={formMode === "edit" ? text.editTitle : text.createTitle}
    />
  );

  return (
    <View style={styles.container}>
      <OpinionSummary summary={opinions.data?.summary} />
      <View style={[styles.separator, { backgroundColor: colors.border }]} />

      {opinions.data?.total ? (
        <View style={styles.filters}>
          <TourismChoiceChip
            label={text.all}
            onPress={() => setReviewFilter("all")}
            selected={reviewFilter === "all"}
          />
          <TourismChoiceChip
            label={text.recent}
            onPress={() => setReviewFilter("recent")}
            selected={reviewFilter === "recent"}
          />
        </View>
      ) : null}

      {opinions.isPending && !opinions.isPaused ? (
        <TourismStateView
          layout="inline"
          message={text.loading}
          variant="loading"
        />
      ) : (opinions.isError || opinions.isPaused) && !opinions.data ? (
        <TourismStateView
          actionPending={opinions.isFetching}
          layout="card"
          message={opinions.isPaused ? text.offline : text.loadFailed}
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

      {reviewFilter === "all" && items.length > 0 ? (
        <View style={styles.pagination}>
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.noticeText, { color: colors.textMuted }]}
          >
            Opiniones {currentPage * OPINIONS_PAGE_SIZE + 1}–
            {Math.min((currentPage + 1) * OPINIONS_PAGE_SIZE, items.length)} de{" "}
            {opinions.data?.total ?? items.length}
          </Text>
          {currentPage > 0 ? (
            <TourismActionButton
              compact
              label={text.previous}
              mode="outlined"
              onPress={() => setPage(currentPage - 1)}
            />
          ) : null}
          {hasLoadedNext || opinions.hasNextPage ? (
            <TourismActionButton
              compact
              disabled={opinions.isFetching}
              label={text.next}
              loading={opinions.isFetchingNextPage}
              mode="outlined"
              onPress={() => void nextPage()}
            />
          ) : null}
          {opinions.isError || opinions.isPaused ? (
            <TourismStateView
              layout="inline"
              message={text.updateFailed}
              onAction={() =>
                void (opinions.isFetchNextPageError
                  ? opinions.fetchNextPage()
                  : opinions.refetch())
              }
              actionPending={opinions.isFetching}
              variant="error"
            />
          ) : null}
        </View>
      ) : null}

      {auth.status === "anonymous" ? (
        <TourismSurface style={styles.notice}>
          <Text style={[styles.noticeTitle, { color: colors.text }]}>
            {text.shareTitle}
          </Text>
          <Text style={[styles.noticeText, { color: colors.textMuted }]}>
            {text.shareBody}
          </Text>
          <TourismActionButton
            compact
            label={text.write}
            onPress={requireAuth}
          />
        </TourismSurface>
      ) : authenticated && own.isPending && !own.isPaused ? (
        // Until the own opinion is known the composer could offer to write
        // a second one; wait for it instead of flashing the form.
        <TourismStateView
          layout="inline"
          message={text.checkingOwn}
          variant="loading"
        />
      ) : authenticated && (own.error || own.isPaused) ? (
        <TourismSurface style={styles.notice}>
          <Text style={[styles.noticeText, { color: colors.textMuted }]}>
            {own.isPaused ? text.ownOffline : text.ownFailed}
          </Text>
          <TourismActionButton
            compact
            icon="refresh"
            label={m.core.retry}
            mode="outlined"
            onPress={() => void own.refetch()}
          />
        </TourismSurface>
      ) : authenticated && ownState?.pending ? (
        <TourismSurface style={styles.notice}>
          <Text style={[styles.noticeTitle, { color: colors.text }]}>
            {text.pendingTitle}
          </Text>
          <Text style={[styles.noticeText, { color: colors.textMuted }]}>
            {text.pendingBody}
          </Text>
          {ownState.current ? (
            <Text style={[styles.noticeText, { color: colors.textMuted }]}>
              {text.pendingPrevious}
            </Text>
          ) : null}
        </TourismSurface>
      ) : authenticated && ownState?.lastRejected ? (
        <TourismSurface style={styles.notice}>
          <Text style={[styles.noticeTitle, { color: colors.text }]}>
            {text.rejectedTitle}
          </Text>
          {ownState.lastRejected.reason ? (
            <Text style={[styles.noticeText, { color: colors.textMuted }]}>
              {text.rejectedReason(ownState.lastRejected.reason)}
            </Text>
          ) : null}
          {ownState.current ? (
            <>
              <Text style={[styles.noticeText, { color: colors.textMuted }]}>
                {text.previousPublished}
              </Text>
              <TourismActionButton
                compact
                label={text.edit}
                onPress={startEdit}
              />
            </>
          ) : (
            <TourismActionButton
              compact
              label={text.writeAnother}
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
  pagination: { gap: turismoSpacing.xs },
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
