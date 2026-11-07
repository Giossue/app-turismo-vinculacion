import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet } from "react-native";
import Animated, {
  FadeIn,
  LayoutAnimationConfig,
  ReduceMotion,
} from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";
import { TourismThemeToggle } from "@/core/ui/tourism-navigation";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { turismoSpacing } from "@/core/ui/tokens";
import {
  parseReturnTo,
  returnsThroughHistory,
} from "@/features/auth/application/login-href";
import { chooseGuestAccess } from "@/features/auth/data/auth-entry-storage";
import { AccountEntry } from "@/features/auth/presentation/account-entry";
import { LoginForm } from "@/features/auth/presentation/login-form";
import { RegisterForm } from "@/features/auth/presentation/register-form";
import { useMessages } from "@/core/i18n/use-language";

type AuthMode = "entry" | "login" | "register";

// Fundido al pasar entre la bienvenida y los formularios.
const modeEntering = FadeIn.duration(150).reduceMotion(ReduceMotion.System);

export default function LoginScreen() {
  const m = useMessages();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [mode, setMode] = useState<AuthMode>("entry");
  const target = parseReturnTo(returnTo);

  // The entry is the screen's first state: Back closes an open form first.
  const closeForm = () => {
    if (mode === "entry") return false;
    setMode("entry");
    return true;
  };
  const handleBack = () => {
    if (!closeForm()) router.back();
  };
  useScreenBackHandler(closeForm);

  // `dismissTo` pops back to the target when it is already below the login
  // (so no screen is duplicated) and otherwise replaces the login with it.
  const returnToTarget = () => {
    if (returnsThroughHistory(target) && router.canGoBack()) {
      router.back();
    } else {
      router.dismissTo(target);
    }
  };

  const handleGuest = () => {
    // The choice is cached synchronously, before the map reads it.
    void chooseGuestAccess().catch(() => undefined);
    if (returnTo) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  // `skipEntering` evita el fundido al abrir la pantalla: ahí ya anima el Stack.
  return (
    <LayoutAnimationConfig skipEntering>
      <Animated.View entering={modeEntering} key={mode} style={styles.flex}>
        {mode === "entry" ? (
          <TourismScreenFrame
            fullBleed
            showHeader={false}
            title={m.account.login.account}
          >
            <AccountEntry
              onBack={returnTo ? handleBack : undefined}
              onCreateAccount={() => setMode("register")}
              onGuest={handleGuest}
              onLogin={() => setMode("login")}
            />
          </TourismScreenFrame>
        ) : (
          <TourismScreenFrame
            headerAction={<TourismThemeToggle />}
            onBack={handleBack}
            title={
              mode === "register"
                ? m.account.login.createAccount
                : m.account.login.signIn
            }
          >
            <KeyboardAvoidingView behavior="padding" style={styles.flex}>
              <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {mode === "register" ? (
                  <RegisterForm
                    onSignedIn={returnToTarget}
                    onSwitchMode={() => setMode("login")}
                  />
                ) : (
                  <LoginForm
                    onSignedIn={returnToTarget}
                    onSwitchMode={() => setMode("register")}
                  />
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          </TourismScreenFrame>
        )}
      </Animated.View>
    </LayoutAnimationConfig>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingBottom: turismoSpacing.xxl,
    paddingTop: turismoSpacing.md,
  },
});
