import { TourismSearchField } from "@/core/ui/tourism-controls";
import type { SearchMode } from "./search-mode-chips";

export type SearchModeFieldProps = Readonly<{
  mode: SearchMode;
  onChangeText: (text: string) => void;
  onClear: () => void;
  onFocus: () => void;
  onSubmit: () => void;
  value: string;
}>;

/** Map search box; its spoken label follows the search mode. */
export function SearchModeField({
  autoFocus,
  glass,
  mode,
  onBlur,
  onChangeText,
  onClear,
  onFocus,
  onSubmit,
  value,
}: SearchModeFieldProps &
  Readonly<{ autoFocus?: boolean; glass?: boolean; onBlur?: () => void }>) {
  return (
    <TourismSearchField
      accessibilityLabel={
        mode === "ESTABLISHMENTS"
          ? "Buscar servicios cercanos"
          : "Buscar atractivos"
      }
      autoFocus={autoFocus}
      glass={glass}
      onBlur={onBlur}
      onChangeText={onChangeText}
      onClear={onClear}
      onFocus={onFocus}
      onSubmitEditing={onSubmit}
      placeholder="Buscar aquí"
      value={value}
    />
  );
}
