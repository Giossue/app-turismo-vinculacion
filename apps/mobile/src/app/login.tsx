import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useScreenBackHandler } from "@/core/navigation/use-screen-back-handler";
import {
  TourismActionButton,
  useTurismoPalette,
} from "@/core/ui/tourism-controls";
import { TourismHeader } from "@/core/ui/tourism-navigation";
import { TourismScreenFrame } from "@/core/ui/tourism-screen";
import { TurismoIcon } from "@/core/ui/turismo-icons";
import {
  turismoIconSizes,
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
  getTurismoColors,
} from "@/core/ui/tokens";
import { useAuth } from "@/features/auth/application/auth-context";
import { chooseGuestAccess } from "@/features/auth/data/auth-entry-storage";
import {
  touristGenderOptions,
  type TouristGender,
} from "@/features/auth/domain/registration-options";

type AuthMode = "entry" | "login" | "register";

const accountHeroImage = require("../../assets/images/account-hero.png");
const accountEntryColors = getTurismoColors("dark");

export default function LoginScreen() {
  const router = useRouter();
  const colors = useTurismoPalette();
  const auth = useAuth();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [mode, setMode] = useState<AuthMode>("entry");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<TouristGender | "">("");
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const targetPath = safeReturnPath(returnTo);
  const canGoBack = mode !== "entry" || Boolean(returnTo);

  const handleBack = useCallback(() => {
    if (mode !== "entry") {
      setMode("entry");
      setFormError(null);
      return;
    }
    router.back();
  }, [mode, router]);

  const openMode = (nextMode: Exclude<AuthMode, "entry">) => {
    setFormError(null);
    setMode(nextMode);
  };

  const handleGuest = async () => {
    await chooseGuestAccess();
    router.replace("/" as never);
  };

  const handleBirthDateChange = useCallback(
    (_event: DateTimePickerChangeEvent, selectedDate: Date) => {
      setShowBirthDatePicker(Platform.OS === "ios");
      setBirthDate(selectedDate);
    },
    [],
  );

  useScreenBackHandler(() => {
    if (mode !== "entry") {
      setMode("entry");
      setFormError(null);
      return true;
    }
    return false;
  });

  if (mode === "entry") {
    return (
      <TourismScreenFrame
        backgroundColor={accountEntryColors.background}
        immersive
        onBack={canGoBack ? handleBack : undefined}
        showHeader={false}
        title="Cuenta"
      >
        <StatusBar style="light" />
        <AccountEntryContent
          onCreateAccount={() => openMode("register")}
          onGuest={() => void handleGuest()}
          onLogin={() => openMode("login")}
          onBack={canGoBack ? handleBack : undefined}
        />
      </TourismScreenFrame>
    );
  }

  const handleSubmit = async () => {
    setFormError(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setFormError("Escribe un correo electrónico válido.");
      return;
    }
    if (mode === "register") {
      if (trimmedName.length < 2) {
        setFormError("Escribe tu nombre.");
        return;
      }
      if (!gender) {
        setFormError("Selecciona tu género.");
        return;
      }
      if (password.length < 12) {
        setFormError("La contraseña debe tener al menos 12 caracteres.");
        return;
      }
      if (password !== passwordConfirmation) {
        setFormError("Las contraseñas no coinciden.");
        return;
      }
    } else if (password.length < 8) {
      setFormError("Escribe tu contraseña.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "register") {
        await auth.register({
          birthDate: birthDate ? formatDateForApi(birthDate) : undefined,
          email: trimmedEmail,
          gender: gender as TouristGender,
          name: trimmedName,
          password,
        });
      } else {
        await auth.login(trimmedEmail, password);
      }
      router.replace(targetPath as never);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : mode === "register"
            ? "No se pudo crear la cuenta."
            : "No se pudo iniciar sesión.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TourismScreenFrame
      onBack={canGoBack ? handleBack : undefined}
      title={modeLabel(mode)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FormContent
            birthDate={birthDate}
            colors={colors}
            email={email}
            gender={gender}
            mode={mode}
            name={name}
            onBirthDateChange={handleBirthDateChange}
            onCloseBirthDatePicker={() => setShowBirthDatePicker(false)}
            onEmailChange={setEmail}
            onGenderChange={setGender}
            onNameChange={setName}
            onOpenBirthDatePicker={() => setShowBirthDatePicker(true)}
            onPasswordChange={setPassword}
            onPasswordConfirmationChange={setPasswordConfirmation}
            password={password}
            passwordConfirmation={passwordConfirmation}
            showBirthDatePicker={showBirthDatePicker}
          />

          {formError || auth.error ? (
            <Text style={[styles.error, { color: colors.danger }]}>
              {formError ?? auth.error}
            </Text>
          ) : null}

          <TourismActionButton
            disabled={submitting || auth.status === "loading"}
            label={
              submitting
                ? mode === "register"
                  ? "Creando cuenta…"
                  : "Iniciando sesión…"
                : mode === "register"
                  ? "Crear cuenta"
                  : "Iniciar sesión"
            }
            onPress={() => void handleSubmit()}
          />
          {submitting ? <ActivityIndicator color={colors.primary} /> : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => openMode(mode === "login" ? "register" : "login")}
            style={styles.switchAction}
          >
            <Text style={[styles.switchText, { color: colors.primaryStrong }]}>
              {mode === "login"
                ? "¿Aún no tienes cuenta? Crear cuenta"
                : "¿Ya tienes cuenta? Iniciar sesión"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </TourismScreenFrame>
  );
}

function AccountEntryContent({
  onCreateAccount,
  onGuest,
  onLogin,
  onBack,
}: Readonly<{
  onCreateAccount: () => void;
  onGuest: () => void;
  onLogin: () => void;
  onBack?: () => void;
}>) {
  const { height } = useWindowDimensions();
  const heroHeight = Math.min(Math.max(height * 0.34, 250), 330);

  return (
    <ScrollView
      contentContainerStyle={styles.accountScrollContent}
      showsVerticalScrollIndicator={false}
      style={styles.accountScroll}
    >
      <View
        style={[
          styles.accountEntry,
          { backgroundColor: accountEntryColors.background },
        ]}
      >
        <ImageBackground
          imageStyle={styles.accountHeroImage}
          resizeMode="cover"
          source={accountHeroImage}
          style={[styles.accountHero, { height: heroHeight }]}
        >
          <View pointerEvents="none" style={styles.accountHeroShade} />
          <TourismHeader onBack={onBack} title="Cuenta" />
        </ImageBackground>

        <View
          style={[
            styles.accountBody,
            {
              backgroundColor: accountEntryColors.background,
              minHeight: Math.max(height * 0.68, 520),
            },
          ]}
        >
          <View style={styles.accountIdentityBadge}>
            <View
              style={[
                styles.accountIdentityBadgeInner,
                { backgroundColor: accountEntryColors.primarySoft },
              ]}
            >
              <TurismoIcon
                color={accountEntryColors.primaryStrong}
                name="mapPinned"
                size={40}
                strokeWidth={1.8}
              />
            </View>
          </View>

          <View style={styles.accountCopy}>
            <Text accessibilityRole="header" style={styles.accountTitle}>
              Descubre <Text style={styles.accountTitleAccent}>Ecuador</Text>
            </Text>
            <Text style={styles.accountSubtitle}>
              Guarda lugares, consulta recomendaciones y planifica tus visitas
              con tu cuenta turística.
            </Text>
          </View>

          <View style={styles.accountBenefits}>
            <AccountBenefit
              icon="bookmark"
              label={"Guarda tus\nlugares favoritos"}
            />
            <AccountBenefit
              icon="map"
              label={"Accede a rutas\npersonalizadas"}
            />
            <AccountBenefit
              icon="bot"
              label={"Accede a un\nagente IA turístico"}
            />
          </View>

          <View style={styles.accountActions}>
            <AccountEntryButton
              icon="user"
              label="Iniciar sesión"
              onPress={onLogin}
              variant="primary"
            />
            <AccountEntryButton
              label="Crear cuenta"
              onPress={onCreateAccount}
              variant="outline"
            />
          </View>

          <Pressable
            accessibilityLabel="Explorar como invitado"
            accessibilityRole="button"
            onPress={onGuest}
            style={({ pressed }) => [
              styles.accountGuestLink,
              { opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <Text style={styles.accountGuestText}>Explorar como invitado</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function AccountBenefit({
  icon,
  label,
}: Readonly<{
  icon: "bookmark" | "bot" | "map";
  label: string;
}>) {
  return (
    <View style={styles.accountBenefit}>
      <View
        style={[
          styles.accountBenefitIcon,
          { backgroundColor: accountEntryColors.primarySoft },
        ]}
      >
        <TurismoIcon
          color={accountEntryColors.primaryStrong}
          name={icon}
          size={24}
          strokeWidth={1.9}
        />
      </View>
      <Text style={styles.accountBenefitText}>{label}</Text>
    </View>
  );
}

function AccountEntryButton({
  icon,
  label,
  onPress,
  variant,
}: Readonly<{
  icon?: "user";
  label: string;
  onPress: () => void;
  variant: "outline" | "primary";
}>) {
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      android_ripple={{
        color: primary ? "rgba(0, 0, 0, 0.12)" : "rgba(34, 197, 94, 0.12)",
      }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.accountButton,
        {
          backgroundColor: primary ? accountEntryColors.primary : "transparent",
          borderColor: primary
            ? accountEntryColors.primary
            : accountEntryColors.border,
          opacity: pressed ? 0.84 : 1,
        },
      ]}
    >
      <View style={styles.accountButtonLabel}>
        {icon ? (
          <TurismoIcon
            color={accountEntryColors.onPrimary}
            name={icon}
            size={22}
            strokeWidth={2.2}
          />
        ) : null}
        <Text
          style={[
            styles.accountButtonText,
            {
              color: primary
                ? accountEntryColors.onPrimary
                : accountEntryColors.primaryStrong,
            },
          ]}
        >
          {label}
        </Text>
      </View>
      <TurismoIcon
        color={
          primary
            ? accountEntryColors.onPrimary
            : accountEntryColors.primaryStrong
        }
        name="chevronRight"
        size={22}
        strokeWidth={2.3}
      />
    </Pressable>
  );
}

function FormContent({
  birthDate,
  colors,
  email,
  gender,
  mode,
  name,
  onBirthDateChange,
  onCloseBirthDatePicker,
  onEmailChange,
  onGenderChange,
  onNameChange,
  onOpenBirthDatePicker,
  onPasswordChange,
  onPasswordConfirmationChange,
  password,
  passwordConfirmation,
  showBirthDatePicker,
}: Readonly<{
  birthDate: Date | null;
  colors: ReturnType<typeof useTurismoPalette>;
  email: string;
  gender: TouristGender | "";
  mode: Exclude<AuthMode, "entry">;
  name: string;
  onBirthDateChange: (
    event: DateTimePickerChangeEvent,
    selectedDate: Date,
  ) => void;
  onCloseBirthDatePicker: () => void;
  onEmailChange: (value: string) => void;
  onGenderChange: (value: TouristGender) => void;
  onNameChange: (value: string) => void;
  onOpenBirthDatePicker: () => void;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmationChange: (value: string) => void;
  password: string;
  passwordConfirmation: string;
  showBirthDatePicker: boolean;
}>) {
  return (
    <View style={styles.formContent}>
      <View style={styles.intro}>
        <Text style={[styles.title, { color: colors.text }]}>
          {mode === "register"
            ? "Crea tu cuenta turística"
            : "Vuelve a tus lugares"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {mode === "register"
            ? "Usaremos estos datos para identificar tu cuenta y sincronizar tus guardados."
            : "Inicia sesión para continuar con tus funciones personales."}
        </Text>
      </View>

      <View style={styles.form}>
        {mode === "register" ? (
          <Field
            accessibilityLabel="Nombre completo"
            autoCapitalize="words"
            colors={colors}
            label="Nombre completo"
            onChangeText={onNameChange}
            placeholder="Tu nombre"
            value={name}
          />
        ) : null}
        <Field
          accessibilityLabel="Correo electrónico"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          colors={colors}
          keyboardType="email-address"
          label="Correo electrónico"
          onChangeText={onEmailChange}
          placeholder="tu@correo.com"
          value={email}
        />
        {mode === "register" ? (
          <>
            <GenderOptions
              colors={colors}
              onChange={onGenderChange}
              value={gender}
            />
            <BirthDateField
              birthDate={birthDate}
              colors={colors}
              onChange={onBirthDateChange}
              onOpen={onOpenBirthDatePicker}
              onClose={onCloseBirthDatePicker}
              showPicker={showBirthDatePicker}
            />
          </>
        ) : null}
        <Field
          accessibilityLabel="Contraseña"
          autoComplete={mode === "register" ? "new-password" : "password"}
          colors={colors}
          label="Contraseña"
          onChangeText={onPasswordChange}
          placeholder="Tu contraseña"
          secureTextEntry
          value={password}
        />
        {mode === "register" ? (
          <Field
            accessibilityLabel="Repetir contraseña"
            autoComplete="new-password"
            colors={colors}
            label="Repetir contraseña"
            onChangeText={onPasswordConfirmationChange}
            placeholder="Repite tu contraseña"
            secureTextEntry
            value={passwordConfirmation}
          />
        ) : null}
      </View>
      {mode === "register" ? (
        <Text style={[styles.helper, { color: colors.textFaint }]}>
          La contraseña debe tener al menos 12 caracteres.
        </Text>
      ) : null}
    </View>
  );
}

function GenderOptions({
  colors,
  onChange,
  value,
}: Readonly<{
  colors: ReturnType<typeof useTurismoPalette>;
  onChange: (value: TouristGender) => void;
  value: TouristGender | "";
}>) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>Género *</Text>
      <View style={styles.genderOptions}>
        {touristGenderOptions.map((option) => {
          const selected = value === option;
          return (
            <Pressable
              accessibilityLabel={option}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={option}
              onPress={() => onChange(option)}
              style={({ pressed }) => [
                styles.genderOption,
                {
                  backgroundColor: selected
                    ? colors.primarySoft
                    : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.genderOptionText,
                  { color: selected ? colors.primaryStrong : colors.text },
                ]}
              >
                {option}
              </Text>
              {selected ? (
                <TurismoIcon
                  color={colors.primaryStrong}
                  name="check"
                  size={turismoIconSizes.sm}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function BirthDateField({
  birthDate,
  colors,
  onChange,
  onClose,
  onOpen,
  showPicker,
}: Readonly<{
  birthDate: Date | null;
  colors: ReturnType<typeof useTurismoPalette>;
  onChange: (event: DateTimePickerChangeEvent, selectedDate: Date) => void;
  onClose: () => void;
  onOpen: () => void;
  showPicker: boolean;
}>) {
  const maximumDate = new Date();
  const pickerValue = birthDate ?? new Date(2000, 0, 1);

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>
        Fecha de nacimiento · opcional
      </Text>
      <Pressable
        accessibilityLabel="Elegir fecha de nacimiento"
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [
          styles.dateButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.72 : 1,
          },
        ]}
      >
        <TurismoIcon
          color={colors.primaryStrong}
          name="calendar"
          size={turismoIconSizes.md}
        />
        <Text
          style={[
            styles.dateButtonText,
            { color: birthDate ? colors.text : colors.textFaint },
          ]}
        >
          {birthDate ? formatDateForDisplay(birthDate) : "Selecciona una fecha"}
        </Text>
      </Pressable>

      {Platform.OS === "android" && showPicker ? (
        <DateTimePicker
          display="calendar"
          maximumDate={maximumDate}
          mode="date"
          onDismiss={onClose}
          onValueChange={onChange}
          value={pickerValue}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal
          animationType="slide"
          onRequestClose={onClose}
          transparent
          visible={showPicker}
        >
          <View
            style={[
              styles.dateModalBackdrop,
              { backgroundColor: colors.scrim },
            ]}
          >
            <View
              style={[
                styles.dateModalCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.dateModalHeader}>
                <Text style={[styles.dateModalTitle, { color: colors.text }]}>
                  Fecha de nacimiento
                </Text>
                <Pressable
                  accessibilityLabel="Cerrar selector de fecha"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={onClose}
                >
                  <TurismoIcon
                    color={colors.textMuted}
                    name="close"
                    size={turismoIconSizes.md}
                  />
                </Pressable>
              </View>
              <DateTimePicker
                display="inline"
                maximumDate={maximumDate}
                mode="date"
                onDismiss={onClose}
                onValueChange={onChange}
                value={pickerValue}
              />
              <TourismActionButton label="Listo" onPress={onClose} />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function Field({
  accessibilityLabel,
  autoCapitalize,
  autoComplete,
  autoCorrect,
  colors,
  keyboardType,
  label,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  value,
}: Readonly<{
  accessibilityLabel: string;
  autoCapitalize?: "none" | "sentences" | "words";
  autoComplete?: "email" | "new-password" | "password";
  autoCorrect?: boolean;
  colors: ReturnType<typeof useTurismoPalette>;
  keyboardType?: "email-address" | "numbers-and-punctuation";
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  value: string;
}>) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={autoCorrect}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        value={value}
      />
    </View>
  );
}

function modeLabel(mode: Exclude<AuthMode, "entry">): string {
  return mode === "register" ? "Crear cuenta" : "Iniciar sesión";
}

function formatDateForApi(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatDateForDisplay(date: Date): string {
  const monthNames = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return `${date.getDate()} de ${monthNames[date.getMonth()]} de ${date.getFullYear()}`;
}

function safeReturnPath(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/";
  }
  if (candidate.startsWith("/login")) return "/";
  return candidate;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    gap: turismoSpacing.lg,
    justifyContent: "center",
    paddingVertical: turismoSpacing.xl,
    paddingBottom: turismoSpacing.xxl,
  },
  accountScroll: { flex: 1 },
  accountScrollContent: { flexGrow: 1 },
  accountEntry: { flexGrow: 1 },
  accountHero: { overflow: "hidden", width: "100%" },
  accountHeroImage: { opacity: 0.92 },
  accountHeroShade: {
    backgroundColor: "rgba(0, 0, 0, 0.24)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  accountBody: {
    alignItems: "center",
    borderTopLeftRadius: 86,
    borderTopRightRadius: 160,
    marginTop: -58,
    paddingBottom: turismoSpacing.xl,
    paddingHorizontal: turismoSpacing.md,
    position: "relative",
    width: "100%",
    zIndex: 1,
  },
  accountIdentityBadge: {
    alignItems: "center",
    backgroundColor: accountEntryColors.background,
    borderRadius: turismoRadii.pill,
    height: 96,
    justifyContent: "center",
    marginTop: -24,
    width: 96,
  },
  accountIdentityBadgeInner: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    height: 80,
    justifyContent: "center",
    width: 80,
  },
  accountCopy: {
    alignItems: "center",
    gap: turismoSpacing.xs,
    marginTop: turismoSpacing.xs,
    maxWidth: 390,
    width: "100%",
  },
  accountTitle: {
    color: accountEntryColors.text,
    fontSize: 27,
    fontWeight: "700",
    lineHeight: 34,
    textAlign: "center",
  },
  accountTitleAccent: { color: accountEntryColors.primaryStrong },
  accountSubtitle: {
    color: accountEntryColors.textMuted,
    fontSize: 16,
    lineHeight: 23,
    maxWidth: 360,
    textAlign: "center",
  },
  accountBenefits: {
    flexDirection: "row",
    gap: turismoSpacing.xs,
    marginTop: turismoSpacing.xl,
    maxWidth: 430,
    width: "100%",
  },
  accountBenefit: {
    alignItems: "center",
    flex: 1,
    gap: turismoSpacing.xs,
  },
  accountBenefitIcon: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  accountBenefitText: {
    color: accountEntryColors.textMuted,
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
  },
  accountActions: {
    gap: turismoSpacing.sm,
    marginTop: turismoSpacing.xl,
    maxWidth: 500,
    width: "100%",
  },
  accountButton: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    borderWidth: turismoMetrics.borderWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: turismoMetrics.controlLg,
    paddingHorizontal: turismoSpacing.lg,
    width: "100%",
  },
  accountButtonLabel: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  accountButtonText: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 20,
  },
  accountGuestLink: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: turismoSpacing.xs,
    minHeight: turismoMetrics.touchTarget,
    paddingHorizontal: turismoSpacing.md,
  },
  accountGuestText: {
    color: accountEntryColors.textFaint,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  intro: { gap: turismoSpacing.xs },
  title: { ...turismoTypography.title },
  subtitle: { ...turismoTypography.body },
  entryActions: { gap: turismoSpacing.sm },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: turismoSpacing.sm,
  },
  divider: { flex: 1, height: turismoMetrics.borderWidth },
  dividerText: { ...turismoTypography.caption },
  guestHint: { ...turismoTypography.caption, textAlign: "center" },
  formContent: { gap: turismoSpacing.lg },
  form: { gap: turismoSpacing.md },
  field: { gap: turismoSpacing.xs },
  label: { ...turismoTypography.label },
  genderOptions: { flexDirection: "row", gap: turismoSpacing.sm },
  genderOption: {
    alignItems: "center",
    borderRadius: turismoRadii.pill,
    borderWidth: turismoMetrics.borderWidth,
    flex: 1,
    flexDirection: "row",
    gap: turismoSpacing.xs,
    justifyContent: "center",
    minHeight: turismoMetrics.controlLg,
    paddingHorizontal: turismoSpacing.sm,
  },
  genderOptionText: { ...turismoTypography.label },
  dateButton: {
    alignItems: "center",
    borderRadius: turismoRadii.sm,
    borderWidth: turismoMetrics.borderWidth,
    flexDirection: "row",
    gap: turismoSpacing.sm,
    minHeight: turismoMetrics.controlLg,
    paddingHorizontal: turismoSpacing.md,
  },
  dateButtonText: { ...turismoTypography.body },
  dateModalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  dateModalCard: {
    borderTopLeftRadius: turismoRadii.lg,
    borderTopRightRadius: turismoRadii.lg,
    borderWidth: turismoMetrics.borderWidth,
    gap: turismoSpacing.md,
    padding: turismoSpacing.lg,
  },
  dateModalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateModalTitle: { ...turismoTypography.heading },
  input: {
    borderRadius: turismoRadii.sm,
    borderWidth: turismoMetrics.borderWidth,
    ...turismoTypography.body,
    minHeight: turismoMetrics.controlLg,
    paddingHorizontal: turismoSpacing.md,
  },
  helper: { ...turismoTypography.caption },
  error: { ...turismoTypography.label },
  switchAction: { alignItems: "center", minHeight: turismoMetrics.touchTarget },
  switchText: { ...turismoTypography.label },
});
