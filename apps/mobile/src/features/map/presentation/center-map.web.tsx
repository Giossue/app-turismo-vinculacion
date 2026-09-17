import { Text, View } from "react-native";

import type { PublicCenter } from "@/features/centers/domain/public-center";

type CenterMapProps = Readonly<{
  centers: readonly PublicCenter[];
  onCenterPress: (center: PublicCenter) => void;
  onViewportChange: (bounds: {
    west: number;
    south: number;
    east: number;
    north: number;
  }) => void;
}>;

export function CenterMap({ centers }: CenterMapProps) {
  return (
    <View
      accessibilityLabel="Mapa disponible en la aplicación móvil"
      className="rounded-2xl bg-brand-50 p-5"
    >
      <Text className="text-lg font-semibold text-brand-900">Mapa móvil</Text>
      <Text className="mt-2 leading-6 text-slate-700">
        El mapa interactivo MapLibre se muestra en el Development Build móvil.
        Hay {centers.length} atractivo(s) publicados.
      </Text>
    </View>
  );
}
