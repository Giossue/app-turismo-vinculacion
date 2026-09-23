import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismStateView } from "@/core/ui/tourism-state";
import { useAuth } from "@/features/auth/application/auth-context";
import {
  readAuthEntryChoice,
  type AuthEntryChoice,
} from "@/features/auth/data/auth-entry-storage";
import { ExploreMapScreen } from "@/features/explore/presentation/explore-map-screen";

/**
 * Explore entry: guests who already chose "Explorar como invitado" and
 * signed-in tourists see the map; everyone else goes to the account entry.
 */
export default function HomeScreen() {
  const colors = useTurismoPalette();
  const auth = useAuth();
  const [entryChoice, setEntryChoice] = useState<
    AuthEntryChoice | null | undefined
  >(undefined);

  useEffect(() => {
    let active = true;
    void readAuthEntryChoice().then((choice) => {
      if (active) setEntryChoice(choice);
    });
    return () => {
      active = false;
    };
  }, []);

  if (
    entryChoice === undefined ||
    (auth.status === "loading" && entryChoice !== "guest")
  ) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <TourismStateView
          message="Preparando Turismo Vinculación…"
          variant="loading"
        />
      </View>
    );
  }

  if (auth.status !== "authenticated" && entryChoice !== "guest") {
    return <Redirect href="/login" />;
  }

  return <ExploreMapScreen />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
