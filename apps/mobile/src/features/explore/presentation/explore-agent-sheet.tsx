import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismBottomSheetModal } from "@/core/ui/tourism-bottom-sheet";
import { TourismIconAction } from "@/core/ui/tourism-controls";
import { TourismSheetHandle } from "@/core/ui/tourism-sheet-handle";
import { turismoMetrics, turismoSpacing } from "@/core/ui/tokens";
import type { AgentRouteDestination } from "@/features/agent/domain/agent";
import type { useAgentConversation } from "@/features/agent/application/use-agent-conversation";
import { AgentChatContent } from "@/features/agent/presentation/agent-chat-content";
import type { RouteMode } from "@/features/routing/domain/routing";

const sheetEdges: readonly Edge[] = ["top", "bottom"];

/**
 * Full-height agent chat over the map, driven by `open`. The modal keeps its
 * own presented flag because gorhom only exposes present()/dismiss(); the
 * screen state stays the single source of truth.
 */
export function ExploreAgentSheet({
  conversation,
  onClose,
  onOpenCenter,
  onStartRoute,
  open,
}: Readonly<{
  conversation: ReturnType<typeof useAgentConversation>;
  onClose: () => void;
  onOpenCenter: (code: string) => void;
  onStartRoute: (destination: AgentRouteDestination, mode: RouteMode) => void;
  open: boolean;
}>) {
  const colors = useTurismoPalette();
  const sheetRef = useRef<BottomSheetModal>(null);
  const presentedRef = useRef(false);

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
              accessibilityLabel="Nueva conversación"
              icon="plus"
              onPress={conversation.newConversation}
              variant="ghost"
            />
          </View>
          <View style={styles.content}>
            <AgentChatContent
              conversation={conversation}
              onOpenCenter={onOpenCenter}
              onStartRoute={onStartRoute}
            />
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
