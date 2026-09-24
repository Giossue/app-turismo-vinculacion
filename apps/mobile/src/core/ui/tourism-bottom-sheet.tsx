import BottomSheet, {
  BottomSheetModal,
  BottomSheetScrollView,
  useBottomSheetTimingConfigs,
  type BottomSheetBackgroundProps,
} from "@gorhom/bottom-sheet";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import {
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useTurismoPalette } from "./theme-context";
import { TourismSheetHandle } from "./tourism-sheet-handle";
import { turismoRadii, turismoSpacing } from "./tokens";
import { turismoHairline } from "./tourism-hairline";

/**
 * Borde superior que no deben cruzar las sheets al expandirse (por ejemplo,
 * el buscador fijo de Explorar), para no quedar por detrás de él.
 */
const TourismSheetTopInsetContext = createContext(0);

export function TourismSheetTopInsetProvider({
  children,
  value,
}: Readonly<{ children: ReactNode; value: number }>) {
  return (
    <TourismSheetTopInsetContext.Provider value={value}>
      {children}
    </TourismSheetTopInsetContext.Provider>
  );
}

/**
 * Fondo opaco de las sheets del mapa en cualquier altura, para que el mapa y
 * los controles no se transparenten detrás de la ficha.
 */
function SolidSheetBackground({ style }: BottomSheetBackgroundProps) {
  const colors = useTurismoPalette();
  return (
    <View
      pointerEvents="none"
      style={[
        style,
        styles.sheetBackground,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    />
  );
}

/** Acción de cerrar de la sheet visible, para el botón de su asa. */
const TourismSheetCloseContext = createContext<() => void>(() => undefined);

/** Asa estándar (barra + cerrar) conectada a la sheet visible. */
function SheetHandle() {
  const close = useContext(TourismSheetCloseContext);
  return <TourismSheetHandle insetClose onClose={close} />;
}

/** Fracción de pantalla que ocupa una sheet del mapa al abrirse. */
export const tourismSheetOpenRatio = 0.44;

const tourismFlexibleSheetSnapPoints = [
  `${tourismSheetOpenRatio * 100}%`,
  "100%",
];

const tourismFlexibleSheetBehavior = {
  enableContentPanningGesture: true,
  enableDynamicSizing: false,
  enableHandlePanningGesture: true,
  enablePanDownToClose: true,
} as const;

const tourismAgentSheetSnapPoints = ["100%"];

const tourismAgentSheetBehavior = {
  android_keyboardInputMode: "adjustResize",
  enableContentPanningGesture: true,
  enableDynamicSizing: false,
  enableHandlePanningGesture: false,
  enableOverDrag: false,
  enablePanDownToClose: false,
  keyboardBehavior: "interactive",
  keyboardBlurBehavior: "restore",
} as const;

/** Apertura y cierre de las sheets del mapa (timing en vez del resorte por defecto). */
const sheetAnimationDurationMs = 250;

type SheetEntry = Readonly<{ children: ReactNode; onClose: () => void }>;

/**
 * Registro de la sheet visible en un `TourismBottomSheetHost`. `null` fuera de
 * un host: cada `TourismBottomSheet` crea entonces su propia sheet.
 */
const TourismSheetHostContext = createContext<
  ((entry: SheetEntry | null) => void) | null
>(null);

/**
 * Una única sheet del mapa, siempre montada y cerrada (`index: -1`). Montar
 * una `BottomSheet` nueva en cada apertura obliga a crearla, calcular su
 * layout y recién entonces animarla (`animateOnMount`); con el host solo se
 * cambia el contenido y se llama a `snapToIndex`. Las `TourismBottomSheet` de
 * su subárbol le entregan su contenido en vez de crear su propia sheet.
 */
export function TourismBottomSheetHost({
  children,
}: Readonly<{ children: ReactNode }>) {
  const sheetRef = useRef<BottomSheet>(null);
  const topInset = useContext(TourismSheetTopInsetContext);
  const [entry, setEntry] = useState<SheetEntry | null>(null);
  // El contenido se conserva mientras la sheet termina de cerrarse.
  const [shown, setShown] = useState<SheetEntry | null>(null);
  const entryRef = useRef<SheetEntry | null>(null);
  const animationConfigs = useBottomSheetTimingConfigs({
    duration: sheetAnimationDurationMs,
  });
  const isOpen = entry !== null;
  const closeVisible = () => entryRef.current?.onClose();

  if (entry !== null && shown !== entry) setShown(entry);

  useEffect(() => {
    entryRef.current = entry;
  });

  useEffect(() => {
    if (isOpen) sheetRef.current?.snapToIndex(0);
    else sheetRef.current?.close();
  }, [isOpen]);

  return (
    <TourismSheetHostContext.Provider value={setEntry}>
      {children}
      <TourismSheetCloseContext.Provider value={closeVisible}>
        <BottomSheet
          {...tourismFlexibleSheetBehavior}
          animationConfigs={animationConfigs}
          backgroundComponent={SolidSheetBackground}
          handleComponent={SheetHandle}
          index={-1}
          onChange={(index) => {
            if (index === -1 && entryRef.current === null) setShown(null);
          }}
          // Deslizar hacia abajo cierra la sheet visible como su botón.
          onClose={closeVisible}
          ref={sheetRef}
          snapPoints={tourismFlexibleSheetSnapPoints}
          topInset={topInset}
        >
          {shown?.children ?? null}
        </BottomSheet>
      </TourismSheetCloseContext.Provider>
    </TourismSheetHostContext.Provider>
  );
}

/**
 * Map overlay sheet that opens at 44 % and expands to 92 %. Swiping it down
 * calls `onClose`; the owner then unmounts it. Inside a
 * `TourismBottomSheetHost` it only hands its content to the host's sheet.
 */
export function TourismBottomSheet({
  children,
  onClose,
}: Readonly<{ children: ReactNode; onClose: () => void }>) {
  const host = useContext(TourismSheetHostContext);
  const topInset = useContext(TourismSheetTopInsetContext);
  const animationConfigs = useBottomSheetTimingConfigs({
    duration: sheetAnimationDurationMs,
  });

  useLayoutEffect(() => {
    host?.({ children, onClose });
  });
  useLayoutEffect(() => {
    if (!host) return undefined;
    return () => host(null);
  }, [host]);

  if (host) return null;
  return (
    <TourismSheetCloseContext.Provider value={onClose}>
      <BottomSheet
        {...tourismFlexibleSheetBehavior}
        animationConfigs={animationConfigs}
        backgroundComponent={SolidSheetBackground}
        handleComponent={SheetHandle}
        topInset={topInset}
        index={0}
        onClose={onClose}
        snapPoints={tourismFlexibleSheetSnapPoints}
      >
        {children}
      </BottomSheet>
    </TourismSheetCloseContext.Provider>
  );
}

/**
 * Full-height sheet presented with `ref.current?.present()` (the agent chat).
 * It only closes from its own `TourismSheetHandle`, not by dragging.
 */
export function TourismBottomSheetModal({
  children,
  onDismiss,
  ref,
}: Readonly<{
  children: ReactNode;
  onDismiss: () => void;
  ref?: Ref<BottomSheetModal>;
}>) {
  const colors = useTurismoPalette();
  return (
    <BottomSheetModal
      {...tourismAgentSheetBehavior}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleComponent={null}
      index={0}
      onDismiss={onDismiss}
      ref={ref}
      snapPoints={tourismAgentSheetSnapPoints}
    >
      {children}
    </BottomSheetModal>
  );
}

/**
 * Scrollable sheet body with the shared padding. With `landscapeMaxWidth`,
 * the content is centered and capped in landscape so lines stay readable.
 */
export function TourismSheetScrollView({
  children,
  contentStyle,
  landscapeMaxWidth,
}: Readonly<{
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  landscapeMaxWidth?: number;
}>) {
  const { height, width } = useWindowDimensions();
  const capWidth = landscapeMaxWidth !== undefined && width > height;
  return (
    <BottomSheetScrollView
      contentContainerStyle={[
        styles.content,
        contentStyle,
        capWidth && { maxWidth: landscapeMaxWidth },
      ]}
      showsVerticalScrollIndicator={false}
      style={styles.scroll}
    >
      {children}
    </BottomSheetScrollView>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: turismoRadii.lg,
    borderTopRightRadius: turismoRadii.lg,
    borderWidth: turismoHairline,
    overflow: "hidden",
  },
  scroll: { flex: 1 },
  content: {
    alignSelf: "center",
    flexGrow: 1,
    padding: turismoSpacing.lg,
    width: "100%",
  },
});
