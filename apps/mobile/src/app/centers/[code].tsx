import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { usePublishedCenter } from "@/features/centers/application/use-published-center";

export default function CenterDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const {
    data: center,
    error,
    isPending,
    refetch,
  } = usePublishedCenter(code ?? "");
  if (isPending)
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#047857" size="large" />
      </View>
    );
  if (!center || error)
    return (
      <View style={styles.loading}>
        <Text style={styles.errorTitle}>No pudimos abrir la ficha.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void refetch()}
          style={styles.retryButton}
        >
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </View>
    );

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <Stack.Screen options={{ title: center.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>
            {center.category} · {center.type}
          </Text>
          <Text style={styles.title}>{center.name}</Text>
          <Text style={styles.description}>
            {center.description ??
              "La descripción de este atractivo está en actualización."}
          </Text>
        </View>
        <Section title="Ubicación">
          <Text style={styles.body}>{center.touristZone}</Text>
          {center.address ? (
            <Text style={styles.body}>{center.address}</Text>
          ) : null}
          {center.altitudeMeters ? (
            <Text style={styles.body}>{center.altitudeMeters} msnm</Text>
          ) : null}
        </Section>
        {center.admission ? (
          <Section title="Ingreso y horario">
            <Text style={styles.body}>
              {center.admission.type} · {center.admission.attention}
            </Text>
            {center.admission.opensAt || center.admission.closesAt ? (
              <Text style={styles.body}>
                {center.admission.opensAt ?? "--:--"} –{" "}
                {center.admission.closesAt ?? "--:--"}
              </Text>
            ) : null}
          </Section>
        ) : null}
        <Tags title="Actividades" values={center.activities} />
        <Tags title="Accesibilidad confirmada" values={center.accessibility} />
        <Tags title="Facilidades" values={center.facilities} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function Tags({
  title,
  values,
}: Readonly<{ title: string; values: readonly string[] }>) {
  if (!values.length) return null;
  return (
    <Section title={title}>
      <View style={styles.tags}>
        {values.map((value) => (
          <View key={value} style={styles.tag}>
            <Text style={styles.tagText}>{value}</Text>
          </View>
        ))}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#f8fafc", flex: 1 },
  content: { gap: 18, padding: 20, paddingBottom: 40 },
  hero: { gap: 9, paddingTop: 8 },
  eyebrow: { color: "#047857", fontSize: 13, fontWeight: "800" },
  title: {
    color: "#0f172a",
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  description: { color: "#475569", fontSize: 16, lineHeight: 24 },
  section: {
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 17,
  },
  sectionTitle: { color: "#0f172a", fontSize: 18, fontWeight: "800" },
  sectionContent: { gap: 5 },
  body: { color: "#475569", fontSize: 15, lineHeight: 22 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    backgroundColor: "#d1fae5",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  tagText: { color: "#065f46", fontSize: 13, fontWeight: "700" },
  loading: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    flex: 1,
    gap: 14,
    justifyContent: "center",
    padding: 24,
  },
  errorTitle: { color: "#0f172a", fontSize: 20, fontWeight: "800" },
  retryButton: {
    backgroundColor: "#047857",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  retryText: { color: "#fff", fontWeight: "800" },
});
