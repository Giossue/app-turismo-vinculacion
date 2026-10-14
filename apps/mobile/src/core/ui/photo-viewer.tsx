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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { resolveMediaVariantUrl } from "@/core/api/media-url";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";

export type ViewerPhoto = Readonly<{
  id: number;
  url: string;
  description: string | null;
  sourceAuthor?: string | null;
}>;

const viewabilityConfig = { itemVisiblePercentThreshold: 60 };

/**
 * Visor de fotografías a pantalla completa. Se desliza entre fotos y, solo si
 * la foto tiene autor, muestra una «i» discreta que revela su nombre.
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
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);
  const [showAuthor, setShowAuthor] = useState(false);
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
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent={false}
      visible
    >
      <View style={styles.root}>
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
          renderItem={({ item }) => (
            <Pressable
              accessibilityLabel={item.description ?? "Fotografía del lugar"}
              onPress={() => setShowAuthor(false)}
              style={{ width, height }}
            >
              <Image
                cachePolicy="memory-disk"
                contentFit="contain"
                source={{ uri: resolveMediaVariantUrl(item.url, "preview") }}
                style={styles.image}
              />
            </Pressable>
          )}
          showsHorizontalScrollIndicator={false}
          viewabilityConfig={viewabilityConfig}
        />
        <Pressable
          accessibilityLabel="Cerrar fotografía"
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
              <Text style={styles.author}>Foto: {author}</Text>
            ) : (
              <View />
            )}
            <Pressable
              accessibilityLabel={
                showAuthor ? "Ocultar autor de la foto" : "Ver autor de la foto"
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
      </View>
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
