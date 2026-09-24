import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { File } from "expo-file-system";
import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { ApiError } from "@/core/api/http";
import { TourismIconAction } from "@/core/ui/tourism-controls";
import { useAuth } from "@/features/auth/application/auth-context";
import { transcribeAgentAudio } from "../data/agent-media-api";

export function AgentVoiceInput({
  disabled,
  onTranscript,
  onStatus,
  onWorkingChange,
}: Readonly<{
  disabled: boolean;
  onTranscript: (text: string) => void;
  onStatus: (text: string | null, error?: boolean) => void;
  onWorkingChange: (working: boolean) => void;
}>) {
  const auth = useAuth();
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const recordingRef = useRef(false);
  const activeRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      requestRef.current?.abort();
      if (recordingRef.current) {
        recordingRef.current = false;
        void (async () => {
          try {
            await recorder.stop();
            erase(recorder.uri);
          } finally {
            await setAudioModeAsync({ allowsRecording: false });
          }
        })().catch(() => undefined);
      }
    };
  }, [recorder]);

  const begin = async () => {
    onStatus(null);
    onWorkingChange(true);
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!activeRef.current) return;
      if (!permission.granted) {
        onStatus(
          "Sin permiso de micrófono puedes seguir escribiendo tu pregunta.",
          true,
        );
        onWorkingChange(false);
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      if (!activeRef.current) {
        await setAudioModeAsync({ allowsRecording: false });
        return;
      }
      await recorder.prepareToRecordAsync();
      if (!activeRef.current) {
        try {
          await recorder.stop();
        } catch {
          /* Nothing was recorded. */
        }
        await setAudioModeAsync({ allowsRecording: false });
        erase(recorder.uri);
        return;
      }
      recorder.record();
      recordingRef.current = true;
      setRecording(true);
      onStatus("Grabando…");
      timerRef.current = setTimeout(() => void finish(true), 30_000);
    } catch {
      if (activeRef.current) {
        onStatus(
          "No se pudo iniciar el micrófono. Puedes escribir tu pregunta.",
          true,
        );
        onWorkingChange(false);
      }
    }
  };

  const finish = async (transcribe: boolean) => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setRecording(false);
    setProcessing(transcribe);
    onStatus(transcribe ? "Transcribiendo…" : null);
    let uri: string | null = null;
    try {
      await recorder.stop();
      uri = recorder.uri;
      await setAudioModeAsync({ allowsRecording: false });
      if (!transcribe) return;
      if (!uri) {
        onStatus(
          "No se pudo obtener la grabación. Puedes escribir tu pregunta.",
          true,
        );
        return;
      }
      const file = new File(uri);
      if (file.size > 5 * 1024 * 1024) {
        onStatus("El audio supera 5 MB. Graba una pregunta más corta.", true);
        return;
      }
      const controller = new AbortController();
      requestRef.current = controller;
      const text = await transcribeAgentAudio(
        {
          uri,
          mimeType: Platform.OS === "web" ? "audio/webm" : "audio/mp4",
          name: Platform.OS === "web" ? "pregunta.webm" : "pregunta.m4a",
        },
        auth.request,
        controller.signal,
      );
      if (activeRef.current && !controller.signal.aborted) {
        onTranscript(text);
        onStatus(null);
      }
    } catch (failure) {
      if (activeRef.current) {
        onStatus(
          failure instanceof ApiError
            ? failure.message
            : "No se pudo transcribir. Puedes escribir tu pregunta.",
          true,
        );
      }
    } finally {
      requestRef.current = null;
      erase(uri);
      if (activeRef.current) {
        setProcessing(false);
        onWorkingChange(false);
      }
    }
  };

  return (
    <View style={styles.actions}>
      <TourismIconAction
        accessibilityLabel={
          recording
            ? "Detener y transcribir grabación"
            : processing
              ? "Transcribiendo audio"
              : "Grabar pregunta por voz"
        }
        disabled={(!recording && disabled) || processing}
        icon="microphone"
        onPress={recording ? () => void finish(true) : () => void begin()}
        selected={recording}
        variant="ghost"
      />
      {recording ? (
        <TourismIconAction
          accessibilityLabel="Cancelar grabación"
          icon="close"
          onPress={() => void finish(false)}
          variant="ghost"
        />
      ) : null}
    </View>
  );
}

function erase(uri: string | null) {
  if (!uri) return;
  try {
    new File(uri).delete();
  } catch {
    /* Cache deletion is best effort. */
  }
}

const styles = StyleSheet.create({
  actions: { alignItems: "center", flexDirection: "row" },
});
