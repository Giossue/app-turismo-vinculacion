import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { TurismoIcon } from "./turismo-icons";
import { useTurismoPalette, TourismSurface } from "./tourism-controls";
import {
  turismoIconSizes,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "./tokens";

export type TurismoTab = "explore" | "agent" | "itinerary";

export function TourismTabBar({
  active,
  onChange,
}: Readonly<{ active: TurismoTab; onChange: (tab: TurismoTab) => void }>) {
  const colors = useTurismoPalette();
  const tabs: readonly {
    key: TurismoTab;
    label: string;
    icon: "compass" | "sparkles" | "calendar";
  }[] = [
    { key: "explore", label: "Explorar", icon: "compass" },
    { key: "agent", label: "Agente", icon: "sparkles" },
    { key: "itinerary", label: "Itinerario", icon: "calendar" },
  ];
  return (
    <View
      style={[
        styles.tabBar,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {tabs.map((tab) => {
        const selected = active === tab.key;
        return (
          <Pressable
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[
                styles.tabIcon,
                {
                  backgroundColor: selected
                    ? colors.primarySoft
                    : "transparent",
                },
              ]}
            >
              <TurismoIcon
                color={selected ? colors.primaryStrong : colors.textMuted}
                name={tab.icon}
                size={turismoIconSizes.md}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                { color: selected ? colors.primaryStrong : colors.textMuted },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TourismProfileButton({
  onPress,
}: Readonly<{ onPress: () => void }>) {
  const colors = useTurismoPalette();
  return (
    <Pressable
      accessibilityLabel="Abrir perfil y guardados"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.profileButton,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <TurismoIcon color={colors.text} name="user" size={turismoIconSizes.md} />
    </Pressable>
  );
}

export function TourismHeader({
  onBack,
  onProfile,
  subtitle,
  title,
}: Readonly<{
  onBack?: () => void;
  onProfile: () => void;
  subtitle?: string;
  title: string;
}>) {
  const colors = useTurismoPalette();
  return (
    <View style={styles.header}>
      <View style={styles.headerLeading}>
        {onBack ? (
          <Pressable
            accessibilityLabel="Volver"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
            style={styles.headerBack}
          >
            <TurismoIcon color={colors.text} name="arrowLeft" size={22} />
          </Pressable>
        ) : null}
        <View style={styles.headerCopy}>
          {subtitle ? (
            <Text
              style={[styles.headerSubtitle, { color: colors.primaryStrong }]}
            >
              {subtitle}
            </Text>
          ) : null}
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {title}
          </Text>
        </View>
      </View>
      <TourismProfileButton onPress={onProfile} />
    </View>
  );
}

export function TourismProfilePopover({
  onClose,
  onItinerary,
  onSaved,
  visible,
}: Readonly<{
  onClose: () => void;
  onItinerary: () => void;
  onSaved: () => void;
  visible: boolean;
}>) {
  const colors = useTurismoPalette();
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable onPress={onClose} style={styles.popoverBackdrop}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={styles.popoverAnchor}
        >
          <TourismSurface style={styles.popover}>
            <View style={styles.popoverHeader}>
              <View
                style={[styles.avatar, { backgroundColor: colors.primary }]}
              >
                <TurismoIcon
                  color={colors.onPrimary}
                  name="user"
                  size={turismoIconSizes.md}
                />
              </View>
              <View style={styles.popoverCopy}>
                <Text style={[styles.popoverTitle, { color: colors.text }]}>
                  Turista
                </Text>
                <Text
                  style={[styles.popoverSubtitle, { color: colors.textMuted }]}
                >
                  Explora Ecuador
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Cerrar menú de perfil"
                accessibilityRole="button"
                onPress={onClose}
              >
                <TurismoIcon color={colors.textMuted} name="close" size={20} />
              </Pressable>
            </View>
            <PopoverAction
              icon="bookmark"
              label="Guardados"
              onPress={onSaved}
            />
            <PopoverAction
              icon="calendar"
              label="Mi itinerario"
              onPress={onItinerary}
            />
            <PopoverAction
              icon="settings"
              label="Configuración"
              onPress={onClose}
            />
          </TourismSurface>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PopoverAction({
  icon,
  label,
  onPress,
}: Readonly<{
  icon: "bookmark" | "calendar" | "settings";
  label: string;
  onPress: () => void;
}>) {
  const colors = useTurismoPalette();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.popoverAction,
        { opacity: pressed ? 0.65 : 1 },
      ]}
    >
      <TurismoIcon color={colors.primaryStrong} name={icon} size={20} />
      <Text style={[styles.popoverActionText, { color: colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    alignItems: "center",
    borderRadius: turismoRadii.lg,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    minHeight: 72,
    paddingHorizontal: turismoSpacing.xs,
    paddingVertical: turismoSpacing.xs,
  },
  tab: { alignItems: "center", flex: 1, gap: 2, minHeight: 58 },
  tabIcon: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 52,
    paddingHorizontal: turismoSpacing.sm,
  },
  tabLabel: { ...turismoTypography.caption },
  profileButton: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 64,
  },
  headerLeading: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  headerBack: { padding: turismoSpacing.xxs },
  headerCopy: { flex: 1, gap: 2 },
  headerSubtitle: { ...turismoTypography.caption },
  headerTitle: { ...turismoTypography.title },
  popoverBackdrop: { backgroundColor: "#00000055", flex: 1 },
  popoverAnchor: {
    alignItems: "flex-end",
    paddingHorizontal: turismoSpacing.md,
    paddingTop: 70,
  },
  popover: {
    gap: turismoSpacing.xs,
    minWidth: 250,
    padding: turismoSpacing.md,
  },
  popoverHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    paddingBottom: turismoSpacing.sm,
  },
  avatar: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  popoverCopy: { flex: 1, gap: 1 },
  popoverTitle: { ...turismoTypography.label },
  popoverSubtitle: { ...turismoTypography.caption },
  popoverAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minHeight: 44,
    paddingHorizontal: turismoSpacing.xs,
  },
  popoverActionText: { ...turismoTypography.body },
});
