import { useEffect, useState } from "react";

import {
  clearSearchHistory,
  listSearchHistory,
  rememberSearch,
} from "../data/search-history-storage";

/** Recent searches stored on the device, most recent first. */
export function useSearchHistory() {
  const [history, setHistory] = useState<readonly string[]>([]);

  useEffect(() => {
    let active = true;
    void listSearchHistory().then((stored) => {
      if (active) setHistory(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  const remember = async (query: string) => {
    setHistory(await rememberSearch(query));
  };

  const clear = async () => {
    await clearSearchHistory();
    setHistory([]);
  };

  return { clear, history, remember };
}
