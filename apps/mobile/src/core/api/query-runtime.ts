type Subscription = Readonly<{ remove: () => void }>;
type NetworkState = Readonly<{
  isConnected?: boolean;
  isInternetReachable?: boolean;
}>;

type QueryRuntime = Readonly<{
  appState: string | null;
  onFocus: (focused: boolean) => void;
  onOnline: (online: boolean) => void;
  readNetwork: () => Promise<NetworkState>;
  subscribeAppState: (listener: (state: string) => void) => Subscription;
  subscribeNetwork: (listener: (state: NetworkState) => void) => Subscription;
}>;

/** Comunica el ciclo nativo sin permitir que una lectura vieja gane a un evento. */
export function connectQueryRuntime(runtime: QueryRuntime): () => void {
  let active = true;
  let networkEvent = 0;
  let networkRead = 0;

  const updateNetwork = (state: NetworkState) => {
    if (!active) return;
    if (state.isConnected === false || state.isInternetReachable === false) {
      runtime.onOnline(false);
    } else if (state.isConnected === true) {
      runtime.onOnline(true);
    }
  };

  const readNetwork = () => {
    const event = networkEvent;
    const read = ++networkRead;
    void runtime.readNetwork().then(
      (state) => {
        if (event === networkEvent && read === networkRead) {
          updateNetwork(state);
        }
      },
      () => {
        // Un fallo al consultar el sistema no demuestra que no haya red.
      },
    );
  };

  const network = runtime.subscribeNetwork((state) => {
    networkEvent++;
    updateNetwork(state);
  });
  const appState = runtime.subscribeAppState((state) => {
    if (!active) return;
    if (state === "active") readNetwork();
    runtime.onFocus(state === "active");
  });

  if (runtime.appState !== null) {
    runtime.onFocus(runtime.appState === "active");
  }
  readNetwork();

  return () => {
    active = false;
    network.remove();
    appState.remove();
  };
}
