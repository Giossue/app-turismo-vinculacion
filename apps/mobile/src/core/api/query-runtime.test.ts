import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryObserver,
} from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { connectQueryRuntime } from "./query-runtime";

function harness() {
  let appListener: (state: string) => void = () => undefined;
  let networkListener: (state: { isConnected?: boolean }) => void = () =>
    undefined;
  const removeApp = vi.fn();
  const removeNetwork = vi.fn();
  const reads: ((state: { isConnected?: boolean }) => void)[] = [];
  const onFocus = vi.fn((focused: boolean) => focusManager.setFocused(focused));
  const onOnline = vi.fn((online: boolean) => onlineManager.setOnline(online));
  const disconnect = connectQueryRuntime({
    appState: "background",
    onFocus,
    onOnline,
    readNetwork: () =>
      new Promise((resolve) => {
        reads.push(resolve);
      }),
    subscribeAppState: (listener) => {
      appListener = listener;
      return { remove: removeApp };
    },
    subscribeNetwork: (listener) => {
      networkListener = listener;
      return { remove: removeNetwork };
    },
  });
  return {
    app: (state: string) => appListener(state),
    network: (connected?: boolean) =>
      networkListener({ isConnected: connected }),
    reads,
    onOnline,
    onFocus,
    removeApp,
    removeNetwork,
    disconnect,
  };
}

afterEach(() => {
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
});

describe("ciclo nativo de consultas", () => {
  it("conserva el evento reciente frente a una lectura inicial tardía", async () => {
    const runtime = harness();
    runtime.network(true);
    runtime.reads[0]({ isConnected: false });
    await Promise.resolve();
    expect(runtime.onOnline.mock.calls).toEqual([[true]]);
    runtime.disconnect();
  });

  it("ignora estados desconocidos y lecturas anteriores a otro regreso", async () => {
    const runtime = harness();
    runtime.network();
    runtime.app("active");
    runtime.app("background");
    runtime.app("active");
    runtime.reads[2]({ isConnected: true });
    runtime.reads[1]({ isConnected: false });
    runtime.reads[0]({ isConnected: false });
    await Promise.resolve();
    expect(runtime.onOnline.mock.calls).toEqual([[true]]);
    runtime.disconnect();
  });

  it("limpia listeners y descarta eventos y lecturas al desmontar", async () => {
    const runtime = harness();
    runtime.disconnect();
    runtime.onFocus.mockClear();
    runtime.app("active");
    runtime.network(true);
    runtime.reads[0]({ isConnected: true });
    await Promise.resolve();
    expect(runtime.removeApp).toHaveBeenCalledOnce();
    expect(runtime.removeNetwork).toHaveBeenCalledOnce();
    expect(runtime.onFocus).not.toHaveBeenCalled();
    expect(runtime.onOnline).not.toHaveBeenCalled();
  });

  it.each(["foco", "red"])(
    "revalida consultas activas vencidas al recuperar %s, conservando las vigentes",
    async (event) => {
      const runtime = harness();
      runtime.network(event === "foco");
      const client = new QueryClient();
      client.mount();
      const staleFetch = vi.fn(async () => "actual");
      const freshFetch = vi.fn(async () => "actual");
      client.setQueryData(["vencida"], "copia", {
        updatedAt: Date.now() - 10_000,
      });
      client.setQueryData(["vigente"], "copia");
      const stale = new QueryObserver(client, {
        queryKey: ["vencida"],
        queryFn: staleFetch,
        staleTime: 5_000,
        refetchOnMount: false,
      });
      const fresh = new QueryObserver(client, {
        queryKey: ["vigente"],
        queryFn: freshFetch,
        staleTime: 60_000,
        refetchOnMount: false,
      });
      const unsubscribeStale = stale.subscribe(() => undefined);
      const unsubscribeFresh = fresh.subscribe(() => undefined);
      if (event === "foco") runtime.app("active");
      else runtime.network(true);
      await vi.waitFor(() => expect(staleFetch).toHaveBeenCalledOnce());
      expect(freshFetch).not.toHaveBeenCalled();
      unsubscribeStale();
      unsubscribeFresh();
      client.unmount();
      client.clear();
      runtime.disconnect();
    },
  );
});
