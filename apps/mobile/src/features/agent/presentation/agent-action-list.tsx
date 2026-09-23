import { StyleSheet, Text, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismActionButton } from "@/core/ui/tourism-controls";
import {
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import type { RouteMode } from "@/features/routing/domain/routing";
import {
  isSameRouteAction,
  type AgentAction,
  type AgentRouteDestination,
  type StartRouteAction,
} from "../domain/agent";

export type AgentRouteHandlers = Readonly<{
  onChangePendingRoute: (action: StartRouteAction | null) => void;
  onStartRoute: (destination: AgentRouteDestination, mode: RouteMode) => void;
  pendingRouteAction: StartRouteAction | null;
}>;

/**
 * Actions proposed by the agent. A route is only a proposal: it opens
 * after the tourist confirms it.
 */
export function AgentActionList({
  actions,
  onChangePendingRoute,
  onOpenCenter,
  onStartRoute,
  pendingRouteAction,
}: Readonly<
  AgentRouteHandlers & {
    actions: readonly AgentAction[];
    onOpenCenter: (code: string) => void;
  }
>) {
  return (
    <>
      {actions.map((action) => (
        <AgentActionItem
          action={action}
          key={
            action.type === "open_center"
              ? `open-${action.code}`
              : `route-${action.destination.name}-${action.mode}`
          }
          onChangePendingRoute={onChangePendingRoute}
          onOpenCenter={onOpenCenter}
          onStartRoute={onStartRoute}
          pendingRouteAction={pendingRouteAction}
        />
      ))}
    </>
  );
}

function AgentActionItem({
  action,
  onChangePendingRoute,
  onOpenCenter,
  onStartRoute,
  pendingRouteAction,
}: Readonly<
  AgentRouteHandlers & {
    action: AgentAction;
    onOpenCenter: (code: string) => void;
  }
>) {
  if (action.type === "open_center") {
    return (
      <TourismActionButton
        accessibilityLabel="Abrir ficha del centro recomendado"
        compact
        label="Abrir ficha"
        onPress={() => onOpenCenter(action.code)}
        style={styles.action}
      />
    );
  }
  const pending =
    pendingRouteAction !== null &&
    isSameRouteAction(pendingRouteAction, action);
  return (
    <View>
      <TourismActionButton
        accessibilityLabel={`Preparar ruta a ${action.destination.name}`}
        compact
        label="Preparar ruta"
        onPress={() => onChangePendingRoute(action)}
        style={styles.action}
      />
      {pending ? (
        <AgentRouteConfirmation
          destinationName={action.destination.name}
          onCancel={() => onChangePendingRoute(null)}
          onConfirm={() => {
            onChangePendingRoute(null);
            onStartRoute(action.destination, action.mode);
          }}
        />
      ) : null}
    </View>
  );
}

function AgentRouteConfirmation({
  destinationName,
  onCancel,
  onConfirm,
}: Readonly<{
  destinationName: string;
  onCancel: () => void;
  onConfirm: () => void;
}>) {
  const colors = useTurismoPalette();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.confirmation, { backgroundColor: colors.surfaceMuted }]}
    >
      <Text style={[styles.confirmationText, { color: colors.text }]}>
        ¿Quieres preparar una ruta a {destinationName}?
      </Text>
      <View style={styles.confirmationActions}>
        <TourismActionButton
          accessibilityLabel="Cancelar preparación de ruta"
          compact
          label="Cancelar"
          mode="ghost"
          onPress={onCancel}
        />
        <TourismActionButton
          accessibilityLabel="Confirmar preparación de ruta"
          compact
          label="Confirmar"
          onPress={onConfirm}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  action: { marginTop: turismoSpacing.xs },
  confirmation: {
    borderRadius: turismoRadii.sm,
    gap: turismoSpacing.sm,
    marginTop: turismoSpacing.xs,
    padding: turismoSpacing.sm,
  },
  confirmationText: { ...turismoTypography.caption },
  confirmationActions: {
    flexDirection: "row",
    gap: turismoSpacing.xs,
    justifyContent: "flex-end",
  },
});
