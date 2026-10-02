import { useEffect, useState } from "react";

/** One remote search after typing settles; downloaded matches need no delay. */
export function useDebouncedSearchText(text: string, delay = 300): string {
  const normalized = text.trim();
  const [settled, setSettled] = useState(normalized);
  useEffect(() => {
    const timeout = setTimeout(() => setSettled(normalized), delay);
    return () => clearTimeout(timeout);
  }, [normalized, delay]);
  return settled;
}
