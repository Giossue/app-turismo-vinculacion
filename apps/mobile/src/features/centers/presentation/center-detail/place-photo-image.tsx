import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { TourismSkeleton } from "@/core/ui/tourism-skeleton";

/**
 * Foto remota de un lugar con skeleton hasta que termina de cargar. Un fallo
 * también lo retira para que el bloque no quede pulsando sin fin.
 */
export function PlacePhotoImage({
  recyclingKey,
  style,
  uri,
}: Readonly<{
  recyclingKey?: string;
  style?: StyleProp<ViewStyle>;
  uri: string;
}>) {
  const [settledUri, setSettledUri] = useState<string | null>(null);
  const settle = () => setSettledUri(uri);

  return (
    <View style={style}>
      <Image
        cachePolicy="memory-disk"
        contentFit="cover"
        onError={settle}
        onLoad={settle}
        recyclingKey={recyclingKey}
        source={{ uri }}
        style={StyleSheet.absoluteFill}
      />
      {settledUri === uri ? null : (
        <TourismSkeleton style={[StyleSheet.absoluteFill, styles.overlay]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { borderRadius: 0 },
});
