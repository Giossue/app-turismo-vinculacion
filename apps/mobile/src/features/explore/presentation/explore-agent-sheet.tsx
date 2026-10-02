import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismBottomSheetModal } from "@/core/ui/tourism-bottom-sheet";
import { TourismIconAction } from "@/core/ui/tourism-controls";
import { TourismSheetHandle } from "@/core/ui/tourism-sheet-handle";
import { turismoSpacing } from "@/core/ui/tokens";
import type {
  AgentCard,
  AgentRouteDestination,
} from "@/features/agent/domain/agent";
import type { useAgentConversation } from "@/features/agent/application/use-agent-conversation";
import { useAuth } from "@/features/auth/application/auth-context";
import { AgentChatContent } from "@/features/agent/presentation/agent-chat-content";
import type { RouteMode } from "@/features/routing/domain/routing";
import { AgentPlaceSheet, type AgentPlaceSelection } from "./agent-place-sheet";

const sheetEdges: readonly Edge[] = ["top", "bottom"];

type ExploreAgentSheetProps = Readonly<{
  conversation: ReturnType<typeof useAgentConversation>;
  onClose: () => void;
  onRequireAuth: () => void;
  onStartRoute: (destination: AgentRouteDestination, mode: RouteMode) => void;
  open: boolean;
}>;

export function ExploreAgentSheet(props: ExploreAgentSheetProps) {
  const auth = useAuth();
  return <ExploreAgentSheetInner key={auth.user?.id ?? "guest"} {...props} />;
}

/**
 * Full-height agent chat over the map, driven by `open`. The modal keeps its
 * own presented flag because gorhom only exposes present()/dismiss(); the
 * screen state stays the single source of truth.
 */
function ExploreAgentSheetInner({
  conversation,
  onClose,
  onRequireAuth,
  onStartRoute,
  open,
}: ExploreAgentSheetProps) {
  const colors = useTurismoPalette();
  const sheetRef = useRef<BottomSheetModal>(null);
  const presentedRef = useRef(false);
  const [selectedPlace, setSelectedPlace] =
    useState<AgentPlaceSelection | null>(null);
  const openCenter = (code: string) =>
    setSelectedPlace({ type: "center-code", code });
  const openCard = (card: AgentCard) => setSelectedPlace(card);
  const closePlace = () => setSelectedPlace(null);
  const closeAgent = () => {
    closePlace();
    onClose();
  };

  useEffect(() => {
    if (open === presentedRef.current) return;
    presentedRef.current = open;
    if (open) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [open]);

  return (
    <>
      <TourismBottomSheetModal
        onDismiss={() => {
          presentedRef.current = false;
          setSelectedPlace(null);
          onClose();
        }}
        ref={sheetRef}
      >
        <BottomSheetView style={styles.sheet}>
          <SafeAreaView
            edges={sheetEdges}
            style={[styles.safeArea, { backgroundColor: colors.surface }]}
          >
            <TourismSheetHandle
              closeLabel="Cerrar agente turístico"
              leadingAction={
                <TourismIconAction
                  accessibilityLabel="Nueva conversación"
                  icon="plus"
                  onPress={conversation.newConversation}
                  variant="ghost"
                />
              }
              onClose={closeAgent}
              hideForLandscapeKeyboard
              showIndicator={false}
            />
            <View style={styles.content}>
              <AgentChatContent
                conversation={conversation}
                onOpenCard={openCard}
                onOpenCenter={openCenter}
                onStartRoute={onStartRoute}
              />
            </View>
          </SafeAreaView>
        </BottomSheetView>
      </TourismBottomSheetModal>
      <AgentPlaceSheet
        onClose={closePlace}
        onRequireAuth={onRequireAuth}
        onStartRoute={(destination, mode) => {
          closePlace();
          onStartRoute(destination, mode);
        }}
        selection={open ? selectedPlace : null}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, height: "100%", minHeight: 0 },
  safeArea: { flex: 1, minHeight: 0 },
  content: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.sm,
  },
});
