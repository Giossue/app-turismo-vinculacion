import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { hideSplash } from "@/core/ui/splash";
import { TourismStateView } from "@/core/ui/tourism-state";
import { useAuth } from "@/features/auth/application/auth-context";
import {
  readAuthEntryChoice,
  type AuthEntryChoice,
} from "@/features/auth/data/auth-entry-storage";
import { ExploreMapScreen } from "@/features/explore/presentation/explore-map-screen";
import { useMessages } from "@/core/i18n/use-language";

/**
 * Explore entry: guests who already chose "Explorar como invitado" and
 * signed-in tourists see the map; everyone else goes to the account entry.
 */
export default function HomeScreen() {
  const m = useMessages();
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

  const preparing =
    entryChoice === undefined ||
    (auth.status === "loading" && entryChoice !== "guest");

  // La pantalla de inicio cubre la preparación; se oculta al estar resuelta.
  useEffect(() => {
    if (!preparing) hideSplash();
  }, [preparing]);

  if (preparing) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <TourismStateView message={m.account.preparingApp} variant="loading" />
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
