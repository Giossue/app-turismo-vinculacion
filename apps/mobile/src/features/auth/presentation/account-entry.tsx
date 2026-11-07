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
import {
  TourismHeader,
  TourismThemeToggle,
} from "@/core/ui/tourism-navigation";
import { TurismoIcon, type TurismoIconName } from "@/core/ui/turismo-icons";
import {
  turismoAccountEntryLayout as layout,
  turismoOpacity,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { useMessages } from "@/core/i18n/use-language";

const accountHeroImage = require("@/assets/images/account-hero.webp");

const benefits: readonly Readonly<{
  icon: TurismoIconName;
  key: "saved" | "routes" | "agent";
}>[] = [
  { icon: "bookmark", key: "saved" },
  { icon: "map", key: "routes" },
  { icon: "bot", key: "agent" },
];

/** Identity entry: hero image, benefits and the three ways in. */
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
  const m = useMessages();
  const colors = useTurismoPalette();
  const { height, width } = useWindowDimensions();
  const heroHeight = Math.min(
    (width * layout.heroImageScale) / layout.heroImageAspect,
    height * layout.heroMaxHeightRatio,
  );
  const heroImageWidth = Math.max(width, heroHeight * layout.heroImageAspect);
  const heroImageHeight = heroImageWidth / layout.heroImageAspect;
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
        // Alineada a la derecha para no cortar «Ecuador te espera».
        imageStyle={[
          styles.heroImage,
          {
            height: heroImageHeight,
            left: width - heroImageWidth,
            top: (heroHeight - heroImageHeight) / 2,
            width: heroImageWidth,
          },
        ]}
        resizeMode="cover"
        source={accountHeroImage}
        style={[styles.hero, { height: heroHeight }]}
      >
        <View style={styles.headerOverlay}>
          <TourismHeader action={<TourismThemeToggle />} onBack={onBack} />
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
          {m.account.login.discover}{" "}
          <Text style={{ color: colors.primaryStrong }}>
            {m.account.login.country}
          </Text>
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
                {m.account.login.benefits[benefit.key]}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <TourismActionButton
            label={m.account.login.signIn}
            onPress={onLogin}
            size="lg"
            trailingIcon="chevronRight"
          />
          <TourismActionButton
            label={m.account.login.createAccount}
            mode="outlined"
            onPress={onCreateAccount}
            size="lg"
            trailingIcon="chevronRight"
          />
          <TourismActionButton
            label={m.account.login.guest}
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
  headerOverlay: { paddingHorizontal: turismoSpacing.md, width: "100%" },
  body: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "flex-start",
    marginTop: -layout.bodyOverlap,
    paddingBottom: turismoSpacing.xl,
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.lg,
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
