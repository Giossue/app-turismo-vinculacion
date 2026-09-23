import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import { TourismActionButton } from "@/core/ui/tourism-controls";
import { TourismHeader } from "@/core/ui/tourism-navigation";
import { TurismoIcon, type TurismoIconName } from "@/core/ui/turismo-icons";
import {
  turismoAccountEntryLayout as layout,
  turismoFixedColors,
  turismoOpacity,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";

const accountHeroImage = require("@/assets/images/account-hero.png");

const benefits: readonly Readonly<{ icon: TurismoIconName; label: string }>[] =
  [
    { icon: "bookmark", label: "Guarda tus\nlugares favoritos" },
    { icon: "map", label: "Accede a rutas\npersonalizadas" },
    { icon: "bot", label: "Accede a un\nagente IA turístico" },
  ];

/**
 * Identity entry: hero image, benefits and the three ways in. Render it
 * inside `TurismoSchemeScope scheme="dark"`; its palette follows the scope.
 */
export function AccountEntry({
  onBack,
  onCreateAccount,
  onGuest,
  onLogin,
}: Readonly<{
  onBack?: () => void;
  onCreateAccount: () => void;
  onGuest: () => void;
  onLogin: () => void;
}>) {
  const colors = useTurismoPalette();
  const { height } = useWindowDimensions();
  const heroHeight = Math.min(
    Math.max(height * layout.heroHeightRatio, layout.heroMinHeight),
    layout.heroMaxHeight,
  );
  const bodyMinHeight = Math.max(
    height * layout.bodyHeightRatio - layout.bodyHeightOffset,
    layout.bodyMinHeight,
  );

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      style={styles.scroll}
    >
      <ImageBackground
        imageStyle={styles.heroImage}
        resizeMode="contain"
        source={accountHeroImage}
        style={[styles.hero, { height: heroHeight }]}
      >
        <View pointerEvents="none" style={styles.heroShade} />
        <View style={styles.headerOverlay}>
          <TourismHeader onBack={onBack} title="Cuenta" />
        </View>
      </ImageBackground>

      <View
        style={[
          styles.body,
          { backgroundColor: colors.background, minHeight: bodyMinHeight },
        ]}
      >
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          Descubre{" "}
          <Text style={{ color: colors.primaryStrong }}>Ecuador</Text>
        </Text>

        <View style={styles.benefits}>
          {benefits.map((benefit) => (
            <View key={benefit.icon} style={styles.benefit}>
              <View
                style={[
                  styles.benefitBadge,
                  { backgroundColor: colors.primarySoft },
                ]}
              >
                <TurismoIcon
                  color={colors.primaryStrong}
                  name={benefit.icon}
                  size={layout.benefitIconSize}
                  strokeWidth={layout.benefitIconStroke}
                />
              </View>
              <Text style={[styles.benefitText, { color: colors.textMuted }]}>
                {benefit.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <TourismActionButton
            label="Iniciar sesión"
            onPress={onLogin}
            size="lg"
            trailingIcon="chevronRight"
          />
          <TourismActionButton
            label="Crear cuenta"
            mode="outlined"
            onPress={onCreateAccount}
            size="lg"
            trailingIcon="chevronRight"
          />
          <TourismActionButton
            label="Explorar como invitado"
            mode="ghost"
            onPress={onGuest}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, width: "100%" },
  scrollContent: { flexGrow: 1, width: "100%" },
  hero: { overflow: "hidden", width: "100%" },
  heroImage: { opacity: turismoOpacity.heroImage },
  heroShade: {
    backgroundColor: turismoFixedColors.heroShade,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  headerOverlay: { paddingHorizontal: turismoSpacing.md, width: "100%" },
  body: {
    alignItems: "center",
    flexGrow: 1,
    marginTop: -layout.bodyOverlap,
    paddingBottom: turismoSpacing.xl,
    paddingHorizontal: turismoSpacing.md,
    width: "100%",
  },
  title: {
    ...turismoTypography.display,
    marginTop: turismoSpacing.xs,
    maxWidth: layout.titleMaxWidth,
    textAlign: "center",
    width: "100%",
  },
  benefits: {
    flexDirection: "row",
    gap: turismoSpacing.xs,
    marginTop: turismoSpacing.xl,
    maxWidth: layout.benefitsMaxWidth,
    width: "100%",
  },
  benefit: { alignItems: "center", flex: 1, gap: turismoSpacing.xs },
  benefitBadge: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    height: layout.benefitBadgeSize,
    justifyContent: "center",
    width: layout.benefitBadgeSize,
  },
  benefitText: { ...turismoTypography.bodySmall, textAlign: "center" },
  actions: {
    gap: turismoSpacing.sm,
    marginTop: turismoSpacing.xl,
    maxWidth: layout.actionsMaxWidth,
    width: "100%",
  },
});
