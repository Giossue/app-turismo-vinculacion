import { Pressable, StyleSheet, Text, View } from "react-native";

import type { PublicCenter } from "../domain/public-center";

type CenterCardProps = Readonly<{
  center: PublicCenter;
  onPress: () => void;
}>;

export function CenterCard({ center, onPress }: CenterCardProps) {
  return (
    <Pressable
      accessibilityLabel={`Ver ${center.name}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.category}>{center.category}</Text>
      <Text style={styles.name}>{center.name}</Text>
      <Text numberOfLines={3} style={styles.description}>
        {center.description ?? "Información en actualización."}
      </Text>
      <View style={styles.tags}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{center.subtype}</Text>
        </View>
        {center.hierarchy ? (
          <View style={styles.hierarchyTag}>
            <Text style={styles.hierarchyText}>
              Jerarquía {center.hierarchy}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.action}>Ver ficha turística →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 18,
    borderWidth: 1,
    gap: 7,
    padding: 17,
  },
  category: { color: "#047857", fontSize: 13, fontWeight: "800" },
  name: { color: "#0f172a", fontSize: 19, fontWeight: "800", lineHeight: 24 },
  description: { color: "#475569", fontSize: 14, lineHeight: 20 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 3 },
  tag: {
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: { color: "#334155", fontSize: 12, fontWeight: "700" },
  hierarchyTag: {
    backgroundColor: "#d1fae5",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  hierarchyText: { color: "#065f46", fontSize: 12, fontWeight: "800" },
  action: { color: "#047857", fontSize: 14, fontWeight: "800", marginTop: 5 },
  pressed: { opacity: 0.8 },
});
