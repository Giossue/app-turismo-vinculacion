export const tourismFlexibleSheetSnapPoints = ["44%", "92%"];

export const tourismFlexibleSheetBehavior = {
  enableContentPanningGesture: true,
  enableDynamicSizing: false,
  enableHandlePanningGesture: true,
  enablePanDownToClose: true,
} as const;

export const tourismAgentSheetSnapPoints = ["100%"];

export const tourismAgentSheetBehavior = {
  android_keyboardInputMode: "adjustResize",
  enableContentPanningGesture: true,
  enableDynamicSizing: false,
  enableHandlePanningGesture: false,
  enableOverDrag: false,
  enablePanDownToClose: false,
  keyboardBehavior: "interactive",
  keyboardBlurBehavior: "restore",
} as const;
