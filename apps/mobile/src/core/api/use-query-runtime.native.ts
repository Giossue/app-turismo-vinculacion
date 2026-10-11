import { focusManager, onlineManager } from "@tanstack/react-query";
import * as Network from "expo-network";
import { useEffect } from "react";
import { AppState } from "react-native";

import { connectQueryRuntime } from "./query-runtime";

export function useQueryRuntime(): void {
  useEffect(
    () =>
      connectQueryRuntime({
        appState: AppState.currentState,
        onFocus: (focused) => focusManager.setFocused(focused),
        onOnline: (online) => onlineManager.setOnline(online),
        readNetwork: Network.getNetworkStateAsync,
        subscribeAppState: (listener) =>
          AppState.addEventListener("change", listener),
        subscribeNetwork: Network.addNetworkStateListener,
      }),
    [],
  );
}
