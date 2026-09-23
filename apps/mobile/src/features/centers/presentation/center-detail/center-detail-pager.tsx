import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { turismoSpacing } from "@/core/ui/tokens";
import { centerDetailTabOrder, type CenterDetailTab } from "./center-detail-tabs";

/**
 * Horizontal pager for the center tabs inside a bottom sheet. Pages render
 * the first time they are shown and stay mounted afterwards, so an opinion
 * draft survives switching tabs. The viewport takes the active page height.
 */
export function CenterDetailPager({
  onChange,
  renderPage,
  value,
}: Readonly<{
  onChange: (tab: CenterDetailTab) => void;
  renderPage: (tab: CenterDetailTab) => ReactNode;
  value: CenterDetailTab;
}>) {
  const pagerRef = useRef<ScrollView>(null);
  const syncedWidthRef = useRef(0);
  const [width, setWidth] = useState(0);
  const [pageHeights, setPageHeights] = useState<
    Partial<Record<CenterDetailTab, number>>
  >({});
  const [visitedTabs, setVisitedTabs] = useState<readonly CenterDetailTab[]>([
    value,
  ]);
  if (!visitedTabs.includes(value)) setVisitedTabs([...visitedTabs, value]);

  useEffect(() => {
    if (width <= 0) return;
    // A new width (rotation, split screen) jumps straight to the active page
    // so the offset keeps matching `value`; tab changes animate.
    const animated = syncedWidthRef.current === width;
    syncedWidthRef.current = width;
    pagerRef.current?.scrollTo({
      animated,
      x: centerDetailTabOrder.indexOf(value) * width,
    });
  }, [value, width]);

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (width <= 0) return;
    const index = Math.max(
      0,
      Math.min(
        centerDetailTabOrder.length - 1,
        Math.round(event.nativeEvent.contentOffset.x / width),
      ),
    );
    const tab = centerDetailTabOrder[index];
    if (tab !== value) onChange(tab);
  };

  const updatePageHeight = (tab: CenterDetailTab, height: number) => {
    const nextHeight = Math.ceil(height);
    setPageHeights((current) =>
      current[tab] === nextHeight ? current : { ...current, [tab]: nextHeight },
    );
  };
  const activePageHeight = pageHeights[value] ?? 0;

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[
        styles.viewport,
        activePageHeight > 0 && { height: activePageHeight },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        horizontal
        nestedScrollEnabled
        onMomentumScrollEnd={handleMomentumEnd}
        pagingEnabled
        ref={pagerRef}
        showsHorizontalScrollIndicator={false}
        style={styles.pager}
      >
        {centerDetailTabOrder.map((tab) => (
          <View
            key={tab}
            onLayout={(event) =>
              updatePageHeight(tab, event.nativeEvent.layout.height)
            }
            style={[styles.page, { width: width || "100%" }]}
          >
            {visitedTabs.includes(tab) ? renderPage(tab) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { overflow: "hidden", width: "100%" },
  pager: { width: "100%" },
  content: { alignItems: "flex-start", flexDirection: "row" },
  page: { flexShrink: 0, gap: turismoSpacing.md },
});
