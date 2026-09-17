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

// Reserva para herramientas que no resuelven extensiones .native/.web.
export function CenterMap({ centers }: CenterMapProps) {
  return (
    <View className="rounded-2xl bg-brand-50 p-5">
      <Text className="text-brand-900">
        Mapa disponible con {centers.length} atractivo(s).
      </Text>
    </View>
  );
}
