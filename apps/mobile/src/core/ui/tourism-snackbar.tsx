import { Portal, Snackbar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Brief feedback at the bottom of the screen, e.g. an action that could not
 * be completed. Rendered in Paper's portal so it floats over the screen, and
 * announced politely by screen readers.
 */
export function TourismSnackbar({
  actionLabel,
  message,
  onAction,
  onDismiss,
  visible,
}: Readonly<{
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  onDismiss: () => void;
  visible: boolean;
}>) {
  const insets = useSafeAreaInsets();
  return (
    <Portal>
      <Snackbar
        action={
          actionLabel && onAction
            ? { label: actionLabel, onPress: onAction }
            : undefined
        }
        onDismiss={onDismiss}
        visible={visible}
        wrapperStyle={{ paddingBottom: insets.bottom }}
      >
        {message}
      </Snackbar>
    </Portal>
  );
}
