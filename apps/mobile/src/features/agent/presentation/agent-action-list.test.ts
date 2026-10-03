import { describe, expect, it, vi } from "vitest";

import type { AgentAction } from "../domain/agent";
import { AgentActionList } from "./agent-action-list";

vi.mock("react-native", () => ({
  StyleSheet: { create: (styles: unknown) => styles },
}));
vi.mock("@/core/ui/tourism-controls", () => ({
  TourismActionButton: "button",
}));
vi.mock("@/core/ui/tokens", () => ({ turismoSpacing: { xs: 4 } }));

const legacyActions: readonly AgentAction[] = [
  { type: "open_center", code: "GUA-1" },
  {
    type: "start_route",
    destination: {
      type: "center",
      code: "GUA-1",
      name: "Museo",
      latitude: -1.59,
      longitude: -79,
    },
    mode: "car",
    requiresConfirmation: true,
  },
];

describe("agent chat controls", () => {
  it("does not expose place or route buttons from older responses", () => {
    const onRequestLocation = vi.fn();
    expect(
      AgentActionList({
        actions: legacyActions,
        onRequestLocation,
        requestingLocation: false,
      }),
    ).toBeNull();
    expect(onRequestLocation).not.toHaveBeenCalled();
  });

  it("keeps one location request alongside legacy actions", () => {
    const onRequestLocation = vi.fn();
    const button = AgentActionList({
      actions: [
        ...legacyActions,
        { type: "request_location" },
        { type: "request_location" },
      ],
      onRequestLocation,
      requestingLocation: false,
    });
    expect(button?.props).toMatchObject({
      label: "Usar mi ubicación",
      disabled: false,
      loading: false,
      onPress: onRequestLocation,
    });
    button?.props.onPress();
    expect(onRequestLocation).toHaveBeenCalledOnce();
  });

  it("preserves the loading and disabled state while reading location", () => {
    const button = AgentActionList({
      actions: [{ type: "request_location" }],
      onRequestLocation: vi.fn(),
      requestingLocation: true,
    });
    expect(button?.props).toMatchObject({ disabled: true, loading: true });
  });
});
