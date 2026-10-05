import { useState } from "react";
import { Keyboard } from "react-native";

import type { GeoCoordinate } from "@/core/geo/types";
import { useSearchHistory } from "@/features/search/application/use-search-history";
import type { SearchMode } from "@/features/search/presentation/search-mode-chips";

type FocusCoordinateRequest = Readonly<{
  coordinate: GeoCoordinate;
  /** Changes on every request so the map moves even to the same place. */
  key: number;
  /** Nombre del lugar geográfico mostrado como marcador en el mapa. */
  title: string;
}>;

/**
 * Text, mode and focus of the Explore search. Actions that start a new search
 * context call `onResetOverlay` so no stale sheet stays open.
 */
export function useExploreSearch({
  hasLocation,
  onResetOverlay,
}: Readonly<{
  hasLocation: boolean;
  onRequestLocation: () => void;
  onResetOverlay: () => void;
}>) {
  const history = useSearchHistory();
  const [text, setText] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [mode, setMode] = useState<SearchMode>("ALL");
  const [focused, setFocused] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [focusCoordinate, setFocusCoordinate] =
    useState<FocusCoordinateRequest | null>(null);
  const submittedQuery = submittedText.trim();

  /** Every way out of the full-screen search ends here. */
  const closeFocus = () => {
    Keyboard.dismiss();
    setFocused(false);
  };

  const search = (query: string) => {
    Keyboard.dismiss();
    setFocused(true);
    setFocusCoordinate(null);
    void history.remember(query);
    setSubmittedText(query);
    setSortByDistance(false);
    onResetOverlay();
  };

  const clear = () => {
    closeFocus();
    setFocusCoordinate(null);
    setText("");
    setSubmittedText("");
    setMode("ALL");
    setSortByDistance(false);
    onResetOverlay();
  };

  return {
    focusCoordinate,
    /** Lugar geográfico elegido en la búsqueda; sin ficha ni pin propio. */
    placeMarker: focusCoordinate
      ? { coordinate: focusCoordinate.coordinate, title: focusCoordinate.title }
      : null,
    focused,
    history: history.history,
    mode,
    sortByDistance,
    submittedQuery,
    text,
    /**
     * Typed or submitted text, or the nearby services mode: the top bar shows
     * the mode chips and Back clears the search.
     */
    active: focused || mode !== "ALL" || Boolean(submittedQuery || text.trim()),
    beginFocus: () => {
      setFocused(true);
      onResetOverlay();
    },
    changeMode: (nextMode: SearchMode) => {
      setMode(nextMode);
      setFocused(true);
      onResetOverlay();
    },
    changeText: (value: string) => {
      setText(value);
      setFocused(true);
    },
    clear,
    clearHistory: () => void history.clear(),
    /** Empties the box and keeps typing in the full-screen search. */
    clearInput: () => {
      setFocusCoordinate(null);
      setText("");
      setSubmittedText("");
      setFocused(true);
    },
    /** Quita el marcador cuando la selección pasa a un centro o servicio. */
    clearPlace: () => setFocusCoordinate(null),
    closeFocus,
    remember: (query: string) => void history.remember(query),
    repeat: (query: string) => {
      setText(query);
      search(query);
    },
    /** Shows a geographic place: its name stays in the box, no sheet opens. */
    showPlace: (title: string, coordinate: GeoCoordinate) => {
      closeFocus();
      onResetOverlay();
      setText(title);
      setSubmittedText("");
      setFocusCoordinate((current) => ({
        coordinate,
        key: (current?.key ?? 0) + 1,
        title,
      }));
    },
    submit: () => {
      const query = text.trim();
      if (query.length < 2) return;
      search(query);
    },
    toggleSortByDistance: () => {
      if (!hasLocation) return;
      setSortByDistance((current) => !current);
    },
  };
}
