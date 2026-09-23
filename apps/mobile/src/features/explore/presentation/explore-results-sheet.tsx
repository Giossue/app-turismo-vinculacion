import type { ComponentProps } from "react";

import { TourismBottomSheet } from "@/core/ui/tourism-bottom-sheet";
import { SearchResultsSheet } from "@/features/centers/presentation/search-results-sheet";
import { EstablishmentResultsSheet } from "@/features/establishments/presentation/establishment-results-sheet";
import type { SearchMode } from "@/features/search/presentation/search-mode-chips";

type SharedProps = "onClose" | "query";

/**
 * Sheet with the submitted search. It is mounted while the search has
 * results to show and no other overlay is open; swiping it down or its "X"
 * ends the search (`onClose`).
 */
export function ExploreResultsSheet({
  centerResults,
  establishmentResults,
  mode,
  onClose,
  query,
}: Readonly<{
  centerResults: Omit<ComponentProps<typeof SearchResultsSheet>, SharedProps>;
  establishmentResults: Omit<
    ComponentProps<typeof EstablishmentResultsSheet>,
    SharedProps
  >;
  mode: SearchMode;
  onClose: () => void;
  query: string;
}>) {
  return (
    <TourismBottomSheet onClose={onClose}>
      {mode === "CENTERS" ? (
        <SearchResultsSheet
          {...centerResults}
          onClose={onClose}
          query={query}
        />
      ) : (
        <EstablishmentResultsSheet
          {...establishmentResults}
          onClose={onClose}
          query={query}
        />
      )}
    </TourismBottomSheet>
  );
}
