import { TourismSearchField } from "@/core/ui/tourism-controls";
import type { SearchMode } from "./search-mode-chips";
import { useMessages } from "@/core/i18n/use-language";

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
  const m = useMessages();
  return (
    <TourismSearchField
      accessibilityLabel={
        mode === "ESTABLISHMENTS"
          ? m.explore.search.fieldLabel.establishments
          : mode === "CENTERS"
            ? m.explore.search.fieldLabel.centers
            : mode === "GEOGRAPHIC"
              ? m.explore.search.fieldLabel.geographic
              : m.explore.search.fieldLabel.all
      }
      autoFocus={autoFocus}
      glass={glass}
      onBlur={onBlur}
      onChangeText={onChangeText}
      onClear={onClear}
      onFocus={onFocus}
      onSubmitEditing={onSubmit}
      placeholder={m.explore.search.placeholder}
      value={value}
    />
  );
}
