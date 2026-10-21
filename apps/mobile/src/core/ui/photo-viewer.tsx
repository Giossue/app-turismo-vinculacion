import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import { Image } from "expo-image";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { resolveMediaVariantUrl } from "@/core/api/media-url";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { describeViewerPhoto } from "./photo-viewer-label";
import { useMessages } from "@/core/i18n/use-language";

export type ViewerPhoto = Readonly<{
  id: number;
  url: string;
  description: string | null;
  sourceAuthor?: string | null;
}>;

const viewabilityConfig = { itemVisiblePercentThreshold: 60 };

const maxZoom = 4;
const doubleTapZoom = 2.5;
const zoomTiming = { duration: 180 };

/**
 * Foto con zoom: pellizco para ampliar, arrastre para recorrerla ya ampliada
 * y doble toque para alternar. `onZoomChange` permite al visor bloquear el
 * deslizado entre fotos mientras la imagen está ampliada.
 */
function ZoomablePhoto({
  description,
  height,
  onTap,
  onZoomChange,
  uri,
  width,
  zoomed,
}: Readonly<{
  description: string;
  height: number;
  onTap: () => void;
  onZoomChange: (zoomed: boolean) => void;
  uri: string;
  width: number;
  zoomed: boolean;
}>) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const reset = () => {
    "worklet";
    scale.value = withTiming(1, zoomTiming);
    translateX.value = withTiming(0, zoomTiming);
    translateY.value = withTiming(0, zoomTiming);
    savedScale.value = 1;
    savedX.value = 0;
    savedY.value = 0;
    scheduleOnRN(onZoomChange, false);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(
        maxZoom,
        Math.max(1, savedScale.value * event.scale),
      );
    })
    .onEnd(() => {
      if (scale.value <= 1.05) {
        reset();
        return;
      }
      savedScale.value = scale.value;
      scheduleOnRN(onZoomChange, true);
    });

  const pan = Gesture.Pan()
    .enabled(zoomed)
    .onUpdate((event) => {
      const limitX = (width * scale.value - width) / 2;
      const limitY = (height * scale.value - height) / 2;
      translateX.value = Math.min(
        limitX,
        Math.max(-limitX, savedX.value + event.translationX),
      );
      translateY.value = Math.min(
        limitY,
        Math.max(-limitY, savedY.value + event.translationY),
      );
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event) => {
      if (savedScale.value > 1) {
        reset();
        return;
      }
      // Amplía hacia el punto tocado para que quede bajo el dedo.
      const x = ((width / 2 - event.x) * (doubleTapZoom - 1)) | 0;
      const y = ((height / 2 - event.y) * (doubleTapZoom - 1)) | 0;
      scale.value = withTiming(doubleTapZoom, zoomTiming);
      translateX.value = withTiming(x, zoomTiming);
      translateY.value = withTiming(y, zoomTiming);
      savedScale.value = doubleTapZoom;
      savedX.value = x;
      savedY.value = y;
      scheduleOnRN(onZoomChange, true);
    });

  const singleTap = Gesture.Tap()
    .requireExternalGestureToFail(doubleTap)
    .onEnd(() => {
      scheduleOnRN(onTap);
    });

  const gesture = Gesture.Race(
    Gesture.Simultaneous(pinch, pan),
    Gesture.Exclusive(doubleTap, singleTap),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessibilityLabel={description}
        accessible
        style={[{ width, height }, animatedStyle]}
      >
        <Image
          cachePolicy="memory-disk"
          contentFit="contain"
          source={{ uri }}
          style={styles.image}
        />
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * Visor de fotografías a pantalla completa. Se desliza entre fotos, se amplía
 * con pellizco o doble toque y, solo si la foto tiene autor, muestra una «i» discreta que revela su nombre.
 */
export function PhotoViewer({
  photos,
  initialIndex,
  onClose,
}: Readonly<{
  photos: readonly ViewerPhoto[];
  initialIndex: number;
  onClose: () => void;
}>) {
  const m = useMessages();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);
  const [showAuthor, setShowAuthor] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const author = photos[index]?.sourceAuthor?.trim();

  const onViewableItemsChanged = ({
    viewableItems,
  }: {
    viewableItems: ViewToken[];
  }) => {
    const first = viewableItems[0]?.index;
    if (first === null || first === undefined) return;
    setIndex(first);
    setShowAuthor(false);
    setZoomed(false);
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent={false}
      visible
    >
      <GestureHandlerRootView style={styles.root}>
        <FlatList
          data={photos}
          getItemLayout={(_, position) => ({
            index: position,
            length: width,
            offset: width * position,
          })}
          horizontal
          initialScrollIndex={initialIndex}
          keyExtractor={(photo) => String(photo.id)}
          onViewableItemsChanged={onViewableItemsChanged}
          pagingEnabled
          renderItem={({ item, index: position }) => (
            <ZoomablePhoto
              description={describeViewerPhoto(
                item.description,
                position,
                photos.length,
              )}
              height={height}
              onTap={() => setShowAuthor(false)}
              onZoomChange={setZoomed}
              uri={resolveMediaVariantUrl(item.url, "preview")}
              width={width}
              zoomed={zoomed}
            />
          )}
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          viewabilityConfig={viewabilityConfig}
        />
        <Pressable
          accessibilityLabel={m.core.photo.close}
          accessibilityRole="button"
          hitSlop={turismoSpacing.sm}
          onPress={onClose}
          style={[
            styles.control,
            { right: turismoSpacing.md, top: insets.top + turismoSpacing.sm },
          ]}
        >
          <TurismoIcon color="#fff" name="close" size={turismoIconSizes.md} />
        </Pressable>
        {photos.length > 1 ? (
          <Text
            accessibilityLabel={m.core.photo.position(index + 1, photos.length)}
            style={[styles.counter, { top: insets.top + turismoSpacing.md }]}
          >
            {index + 1} / {photos.length}
          </Text>
        ) : null}
        {author ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.footer,
              { bottom: insets.bottom + turismoSpacing.md },
            ]}
          >
            {showAuthor ? (
              <Text style={styles.author}>{m.core.photo.author(author)}</Text>
            ) : (
              <View />
            )}
            <Pressable
              accessibilityLabel={
                showAuthor ? m.core.photo.hideAuthor : m.core.photo.showAuthor
              }
              accessibilityRole="button"
              hitSlop={turismoSpacing.sm}
              onPress={() => setShowAuthor((current) => !current)}
              style={styles.infoButton}
            >
              <TurismoIcon
                color="#fff"
                name="info"
                size={turismoIconSizes.sm}
              />
            </Pressable>
          </View>
        ) : null}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#000", flex: 1 },
  image: { flex: 1, width: "100%" },
  control: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    width: 40,
  },
  counter: {
    ...turismoTypography.caption,
    alignSelf: "center",
    color: "#fff",
    position: "absolute",
  },
  footer: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    justifyContent: "space-between",
    left: turismoSpacing.md,
    position: "absolute",
    right: turismoSpacing.md,
  },
  author: {
    ...turismoTypography.caption,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 8,
    color: "#fff",
    flexShrink: 1,
    overflow: "hidden",
    paddingHorizontal: turismoSpacing.sm,
    paddingVertical: turismoSpacing.xs,
  },
  infoButton: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
});
