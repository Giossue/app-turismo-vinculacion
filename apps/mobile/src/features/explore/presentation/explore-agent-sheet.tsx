import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismBottomSheetModal } from "@/core/ui/tourism-bottom-sheet";
import { TourismIconAction } from "@/core/ui/tourism-controls";
import { TourismSheetHandle } from "@/core/ui/tourism-sheet-handle";
import { turismoMetrics, turismoSpacing } from "@/core/ui/tokens";
import type { AgentRouteDestination } from "@/features/agent/domain/agent";
import type { useAgentConversation } from "@/features/agent/application/use-agent-conversation";
import { useAgentPlans } from "@/features/agent/application/use-agent-plans";
import { useAuth } from "@/features/auth/application/auth-context";
import { AgentChatContent } from "@/features/agent/presentation/agent-chat-content";
import { AgentSavedPlans } from "@/features/agent/presentation/agent-saved-plans";
import { AgentHistoryPanel } from "@/features/agent/presentation/agent-history-panel";
import type { RouteMode } from "@/features/routing/domain/routing";

const sheetEdges: readonly Edge[] = ["top", "bottom"];

type ExploreAgentSheetProps = Readonly<{
  conversation: ReturnType<typeof useAgentConversation>;
  onClose: () => void;
  onOpenCenter: (code: string) => void;
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
  onOpenCenter,
  onStartRoute,
  open,
}: ExploreAgentSheetProps) {
  const colors = useTurismoPalette();
  const sheetRef = useRef<BottomSheetModal>(null);
  const presentedRef = useRef(false);
  const plans = useAgentPlans();
  const auth = useAuth();
  const [view, setView] = useState<"chat" | "plans" | "history">("chat");

  useEffect(() => {
    if (open === presentedRef.current) return;
    presentedRef.current = open;
    if (open) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [open]);

  return (
    <TourismBottomSheetModal
      onDismiss={() => {
        presentedRef.current = false;
        setView("chat");
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
            onClose={onClose}
            showIndicator={false}
          />
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TourismIconAction
              accessibilityLabel={
                view === "plans" ? "Volver al chat" : "Ver mis planes"
              }
              icon={view === "plans" ? "arrowLeft" : "calendar"}
              onPress={() => {
                if (view !== "plans") void plans.load();
                setView(view === "plans" ? "chat" : "plans");
              }}
              variant="ghost"
            />
            <TourismIconAction
              accessibilityLabel={
                view === "history" ? "Volver al chat" : "Ver historial"
              }
              icon={view === "history" ? "arrowLeft" : "history"}
              onPress={() => setView(view === "history" ? "chat" : "history")}
              variant="ghost"
            />
            <TourismIconAction
              accessibilityLabel="Nueva conversación"
              icon="plus"
              onPress={() => {
                conversation.newConversation();
                setView("chat");
              }}
              variant="ghost"
            />
          </View>
          <View style={styles.content}>
            {view === "plans" ? (
              <AgentSavedPlans
                key={auth.user?.id}
                plans={plans}
                onOpenCenter={onOpenCenter}
              />
            ) : view === "history" ? (
              <AgentHistoryPanel
                key={auth.user?.id}
                onDisable={conversation.newConversation}
                onDelete={conversation.forgetSavedConversation}
                onSelect={(saved) => {
                  conversation.loadSavedConversation(saved);
                  setView("chat");
                }}
              />
            ) : (
              <AgentChatContent
                conversation={conversation}
                onOpenCenter={onOpenCenter}
                onStartRoute={onStartRoute}
                plans={plans}
              />
            )}
          </View>
        </SafeAreaView>
      </BottomSheetView>
    </TourismBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, height: "100%", minHeight: 0 },
  safeArea: { flex: 1, minHeight: 0 },
  header: {
    alignItems: "center",
    borderBottomWidth: turismoMetrics.borderWidth,
    flexDirection: "row",
    justifyContent: "flex-end",
    minHeight: turismoMetrics.controlLg,
    paddingHorizontal: turismoSpacing.md,
  },
  content: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.sm,
  },
});
