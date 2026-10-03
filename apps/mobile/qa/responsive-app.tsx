import {
  BottomSheetModalProvider,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import {
  TurismoThemeProvider,
  useTurismoPalette,
} from "../src/core/ui/theme-context";
import { TurismoPaperProvider } from "../src/core/ui/turismo-paper-provider";
import { TourismBottomSheetModal } from "../src/core/ui/tourism-bottom-sheet";
import {
  TourismActionButton,
  TourismIconAction,
} from "../src/core/ui/tourism-controls";
import { TourismTextField } from "../src/core/ui/tourism-fields";
import { TourismGlassScope } from "../src/core/ui/tourism-glass";
import { TourismPressable } from "../src/core/ui/tourism-pressable";
import { TourismScreenFrame } from "../src/core/ui/tourism-screen";
import { TourismSheetHandle } from "../src/core/ui/tourism-sheet-handle";
import {
  TourismTabBar,
  TourismTabBarInsetProvider,
  useTourismTabBarHidden,
} from "../src/core/ui/tourism-tab-bar";
import { TourismTabs } from "../src/core/ui/tourism-tabs";
import { turismoSpacing, turismoTypography } from "../src/core/ui/tokens";
import { AgentChatContent } from "../src/features/agent/presentation/agent-chat-content";
import { useExploreSearch } from "../src/features/explore/application/use-explore-search";
import {
  getSearchRelevance,
  rankSearchSuggestions,
} from "../src/features/search/domain/search-relevance";
import type {
  SearchScope,
  SearchSuggestionItem,
} from "../src/features/search/domain/search-suggestion";
import { SearchOverlay } from "../src/features/search/presentation/search-overlay";
import type { RouteMode } from "../src/features/routing/domain/routing";
import { RoutePreviewPanel } from "../src/features/routing/presentation/route-preview-panel";
import { calculatedRouteFixture, useConversationFixture } from "./fixtures";

const screens = ["tabs", "chat", "route", "form", "search"] as const;
type QaScreen = (typeof screens)[number];

function parseScreen(url: string | null): QaScreen | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "qa") return null;
    const screen = parsed.searchParams.get("screen");
    return screens.find((candidate) => candidate === screen) ?? null;
  } catch {
    return null;
  }
}

export function ResponsiveQaApp() {
  const [screen, setScreen] = useState<QaScreen>("tabs");
  const [visit, setVisit] = useState(0);
  useEffect(() => {
    let active = true;
    const open = (url: string | null) => {
      const next = parseScreen(url);
      if (!active || !next) return;
      setScreen(next);
      setVisit((current) => current + 1);
    };
    const subscription = Linking.addEventListener("url", ({ url }) =>
      open(url),
    );
    void Linking.getInitialURL()
      .then(open)
      .catch(() => undefined);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <TurismoThemeProvider>
          <TurismoPaperProvider>
            <BottomSheetModalProvider>
              <QaScene key={`${screen}-${visit}`} screen={screen} />
            </BottomSheetModalProvider>
          </TurismoPaperProvider>
        </TurismoThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function QaMetrics({ screen }: Readonly<{ screen: QaScreen }>) {
  const { width, height, fontScale } = useWindowDimensions();
  const metric = `QA_METRICS:${screen}:${width}:${height}:${fontScale}`;
  useEffect(() => {
    console.log(metric);
  }, [metric]);
  return (
    <Text
      accessibilityLabel={metric}
      allowFontScaling={false}
      style={styles.metrics}
    >
      {metric}
    </Text>
  );
}

function QaScene({ screen }: Readonly<{ screen: QaScreen }>) {
  if (screen === "chat") return <ChatScene />;
  if (screen === "route") return <RouteScene />;
  if (screen === "form") return <FormScene />;
  if (screen === "search")
    return (
      <TourismTabBarInsetProvider>
        <SearchScene />
      </TourismTabBarInsetProvider>
    );
  return <TabsScene />;
}

function TabsScene() {
  const [tab, setTab] = useState("information");
  const [bottomTab, setBottomTab] = useState("explore");
  const labels = {
    information: "Información",
    opinions: "Opiniones",
    photos: "Fotos",
  };
  const colors = useTurismoPalette();
  return (
    <TourismTabBarInsetProvider>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <TourismScreenFrame title="Ficha de prueba">
          <QaMetrics screen="tabs" />
          <TourismTabs
            items={[
              { label: "Información", value: "information" },
              { label: "Opiniones", value: "opinions" },
              { label: "Fotos", value: "photos" },
            ]}
            onChange={setTab}
            value={tab}
          />
          <Text
            accessibilityLabel={`QA_TAB:${labels[tab as keyof typeof labels]}`}
            style={styles.copy}
          >
            {labels[tab as keyof typeof labels]}
          </Text>
          <Text style={styles.copy}>
            Contenido de ejemplo para comprobar que la ficha y sus controles
            siguen disponibles al ampliar el texto.
          </Text>
        </TourismScreenFrame>
        <TourismTabBar
          items={[
            {
              key: "explore",
              label: "Explorar",
              icon: "map",
              selected: bottomTab === "explore",
              onPress: () => setBottomTab("explore"),
            },
            {
              key: "saved",
              label: "Guardados",
              icon: "bookmark",
              selected: bottomTab === "saved",
              onPress: () => setBottomTab("saved"),
            },
            {
              key: "menu",
              label: "Menú",
              icon: "menu",
              onPress: () => setBottomTab("menu"),
            },
          ]}
        />
      </View>
    </TourismTabBarInsetProvider>
  );
}

const searchFixtures: readonly SearchSuggestionItem[] = [
  {
    key: "service",
    title: "Cafetería de prueba con un nombre extenso",
    subtitle: "Cafetería · Guaranda, Bolívar",
    kind: "establishment",
    distanceMeters: 300,
  },
  {
    key: "poi",
    title: "Café del mirador",
    subtitle: "Punto de interés · Guaranda",
    kind: "poi",
    distanceMeters: 600,
    offline: { slug: "guaranda", itemKey: "poi:cafe", cityName: "Guaranda" },
  },
  {
    key: "center",
    title: "Cascada de prueba",
    subtitle: "Atractivo natural · Bolívar",
    kind: "center",
    distanceMeters: 900,
  },
];

/** Production search state and views; only the sources and navigation are fixtures. */
function SearchScene() {
  const [scope, setScope] = useState<SearchScope>("country");
  const [selected, setSelected] = useState<string | null>(null);
  const search = useExploreSearch({
    hasLocation: false,
    onRequestLocation: () => console.error("QA_SEARCH:unexpected-gps"),
    onResetOverlay: () => undefined,
  });
  useTourismTabBarHidden(search.focused);
  const items = rankSearchSuggestions(
    searchFixtures.filter(
      (item) =>
        getSearchRelevance(search.text, item.title, item.subtitle) &&
        (search.mode === "ALL" ||
          (search.mode === "ESTABLISHMENTS" && item.kind === "establishment") ||
          (search.mode === "CENTERS" && item.kind === "center") ||
          (search.mode === "GEOGRAPHIC" && item.kind === "poi")),
    ),
    search.text,
  );
  return (
    <View style={styles.root}>
      <QaMetrics screen="search" />
      {search.focused ? (
        <SearchOverlay
          areaAvailable
          field={{
            mode: search.mode,
            value: search.text,
            onChangeText: search.changeText,
            onClear: search.clearInput,
            onFocus: search.beginFocus,
            onSubmit: search.submit,
          }}
          history={search.history}
          isSearching={false}
          items={items}
          offlineCoverage={[{ slug: "guaranda", name: "Guaranda" }]}
          onlineUnavailable={false}
          onClearHistory={search.clearHistory}
          onClose={search.closeFocus}
          onModeChange={search.changeMode}
          onRecentPress={search.repeat}
          onRetry={() => undefined}
          onScopeChange={setScope}
          onSuggestionPress={(item) => {
            setSelected(item.key);
            search.remember(search.text);
            search.closeFocus();
          }}
          scope={scope}
          searchError={null}
        />
      ) : (
        <TourismScreenFrame title="Prueba de búsqueda">
          <TourismActionButton
            label="QA Abrir búsqueda"
            onPress={() => {
              setSelected(null);
              search.beginFocus();
            }}
          />
          {selected ? (
            <Text
              accessibilityLabel={`QA_SEARCH:selected:${selected}`}
              style={styles.copy}
            >
              Resultado seleccionado: {selected}
            </Text>
          ) : null}
        </TourismScreenFrame>
      )}
      <TourismTabBar
        items={[
          {
            key: "explore",
            label: "Explorar",
            icon: "map",
            selected: true,
            onPress: () => undefined,
          },
          {
            key: "saved",
            label: "Guardados",
            icon: "bookmark",
            onPress: () => undefined,
          },
          {
            key: "menu",
            label: "Menú",
            icon: "menu",
            onPress: () => undefined,
          },
        ]}
      />
    </View>
  );
}

function ChatScene() {
  const ref = useRef<BottomSheetModal>(null);
  const conversation = useConversationFixture();
  const colors = useTurismoPalette();
  useEffect(() => {
    ref.current?.present();
  }, []);
  return (
    <View style={styles.root}>
      <TourismBottomSheetModal onDismiss={() => undefined} ref={ref}>
        <BottomSheetView style={styles.chatSheet}>
          <SafeAreaView
            edges={["top", "bottom"]}
            style={[styles.root, { backgroundColor: colors.surface }]}
          >
            <QaMetrics screen="chat" />
            <TourismSheetHandle
              closeLabel="QA Cerrar chat"
              leadingAction={
                <TourismIconAction
                  accessibilityLabel="QA Reiniciar conversación"
                  icon="plus"
                  onPress={conversation.newConversation}
                  variant="ghost"
                />
              }
              onClose={conversation.newConversation}
              hideForLandscapeKeyboard
              showIndicator={false}
            />
            <View style={styles.chatContent}>
              <AgentChatContent
                conversation={conversation}
                onOpenCard={() => console.log("QA_CHAT:card-opened")}
              />
            </View>
          </SafeAreaView>
        </BottomSheetView>
      </TourismBottomSheetModal>
    </View>
  );
}

function RouteScene() {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<RouteMode>("car");
  const [notice, setNotice] = useState<string | null>(null);
  const colors = useTurismoPalette();
  return (
    <TourismGlassScope
      backdrop={
        <View style={[styles.root, { backgroundColor: colors.primarySoft }]} />
      }
      style={styles.root}
    >
      <SafeAreaView edges={["top"]} pointerEvents="box-none">
        <QaMetrics screen="route" />
        <TourismPressable
          accessibilityLabel="QA Alternar panel de ruta"
          accessibilityRole="button"
          onPress={() => setExpanded((value) => !value)}
          style={styles.qaControl}
        >
          <Text allowFontScaling={false}>
            QA {expanded ? "Contraer" : "Expandir"}
          </Text>
        </TourismPressable>
      </SafeAreaView>
      <RoutePreviewPanel
        backgroundTrackingAvailable
        backgroundTrackingBusy={false}
        backgroundTrackingEnabled={false}
        destinationName="Restaurante de prueba con un nombre largo"
        expanded={expanded}
        isCalculating={false}
        locationMessage={null}
        locationRequesting={false}
        mode={mode}
        navigationNotice={notice}
        onBackgroundTrackingChange={() => undefined}
        onCalculateRoute={() => setNotice("Ruta de prueba calculada")}
        onClose={() => setNotice("QA Ruta cerrada")}
        onExpandedChange={setExpanded}
        onModeChange={setMode}
        onStartNavigation={() => setNotice("QA Navegación de prueba iniciada")}
        route={{ ...calculatedRouteFixture, mode }}
        routeError={null}
        startingNavigation={false}
      />
    </TourismGlassScope>
  );
}

function FormScene() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  return (
    <TourismScreenFrame title="Formulario de prueba">
      <QaMetrics screen="form" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.root}
      >
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <TourismTextField
            accessibilityLabel="QA Nombre"
            label="Nombre"
            onChangeText={setName}
            value={name}
          />
          <TourismTextField
            accessibilityLabel="QA Correo"
            autoCapitalize="none"
            keyboardType="email-address"
            label="Correo electrónico"
            onChangeText={setEmail}
            value={email}
          />
          <Text style={styles.copy}>
            Este formulario contiene solo datos ficticios. El texto explica el
            campo y permite revisar el desplazamiento con el teclado abierto.
          </Text>
          <TourismTextField
            accessibilityLabel="QA Comentario"
            label="Comentario"
            multiline
            onChangeText={setComment}
            value={comment}
          />
          <TourismActionButton
            accessibilityLabel="QA Enviar formulario"
            label="Enviar formulario"
            onPress={() => setSubmitted(true)}
          />
          {submitted ? (
            <Text accessibilityLabel="QA_FORM:submitted" style={styles.copy}>
              Formulario de prueba completado.
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </TourismScreenFrame>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  metrics: {
    color: "#176B4D",
    fontSize: 10,
    lineHeight: 12,
    paddingHorizontal: 8,
  },
  copy: { ...turismoTypography.body, marginVertical: turismoSpacing.sm },
  chatSheet: { flex: 1, height: "100%", minHeight: 0 },
  chatContent: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: turismoSpacing.md,
    paddingTop: turismoSpacing.sm,
  },
  qaControl: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  form: {
    flexGrow: 1,
    gap: turismoSpacing.md,
    paddingBottom: turismoSpacing.xxl,
  },
});
