import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { TourismIconAction } from "@/core/ui/tourism-controls";

export function AgentPhotoInput({
  disabled,
  onPhoto,
  onStatus,
  onWorkingChange,
}: Readonly<{
  disabled: boolean;
  onPhoto: (file: {
    uri: string;
    mimeType: string;
    name: string;
  }) => Promise<void>;
  onStatus: (text: string | null, error?: boolean) => void;
  onWorkingChange: (working: boolean) => void;
}>) {
  const [working, setWorking] = useState(false);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const pick = async (camera: boolean) => {
    if (working || disabled) return;
    onStatus(null);
    setWorking(true);
    onWorkingChange(true);
    let uri: string | null = null;
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!activeRef.current) return;
        if (!permission.granted) {
          onStatus(
            "Sin permiso de cámara puedes elegir una foto de la galería o escribir.",
            true,
          );
          return;
        }
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            quality: 0.55,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            quality: 0.55,
          });
      if (!activeRef.current || result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      uri = asset.uri;
      const mimeType = asset.mimeType;
      if (
        mimeType !== "image/jpeg" &&
        mimeType !== "image/png" &&
        mimeType !== "image/webp"
      ) {
        onStatus("Usa una foto JPEG, PNG o WebP.", true);
        return;
      }
      const size = asset.fileSize ?? new File(asset.uri).size;
      if (size > 4 * 1024 * 1024) {
        onStatus(
          "La foto supera 4 MB. Prueba con una imagen más pequeña.",
          true,
        );
        return;
      }
      await onPhoto({
        uri: asset.uri,
        mimeType,
        name:
          mimeType === "image/png"
            ? "consulta.png"
            : mimeType === "image/webp"
              ? "consulta.webp"
              : "consulta.jpg",
      });
    } catch {
      if (activeRef.current)
        onStatus(
          "No se pudo consultar la foto. Puedes seguir escribiendo.",
          true,
        );
    } finally {
      if (uri?.startsWith(Paths.cache.uri)) {
        try {
          new File(uri).delete();
        } catch {
          /* Cache deletion is best effort. */
        }
      }
      if (activeRef.current) {
        setWorking(false);
        onWorkingChange(false);
      }
    }
  };

  return (
    <View style={styles.root}>
      <TourismIconAction
        accessibilityLabel="Tomar foto para consultar al agente"
        disabled={disabled || working}
        icon="camera"
        onPress={() => void pick(true)}
        variant="ghost"
      />
      <TourismIconAction
        accessibilityLabel="Elegir foto de la galería para consultar al agente"
        disabled={disabled || working}
        icon="image"
        onPress={() => void pick(false)}
        variant="ghost"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", flexDirection: "row" },
});
