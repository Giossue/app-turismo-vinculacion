import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { File } from "expo-file-system";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { ApiError } from "@/core/api/http";
import { useAuth } from "@/features/auth/application/auth-context";
import { transcribeAgentAudio } from "../data/agent-media-api";

/**
 * AAC in an .m4a file on every platform. `LOW_QUALITY` records 8 kHz AMR in a
 * .3gp file on Android, which the API rejects as m4a and transcribes poorly.
 */
const voiceRecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64_000,
  isMeteringEnabled: true,
};

/** Above this level (dBFS) the microphone hears speech. */
const speechLevelDb = -42;
/** After speaking, this much quiet ends the question. */
const endSilenceMs = 1_600;
/** Without any speech, stop listening after this long. */
const noSpeechTimeoutMs = 7_000;
const maxRecordingMs = 30_000;
const pollMs = 120;

/**
 * Voice questions like a phone assistant: tap the microphone, speak, and the
 * recording ends by itself after a short pause, then it is transcribed.
 * `finish` ends early and `cancel` discards it.
 */
export function useAgentVoiceInput({
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
  const recorder = useAudioRecorder(voiceRecordingOptions);
  const [recording, setRecording] = useState(false);
  /** Microphone level from 0 to 1, for the listening indicator. */
  const [level, setLevel] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
      if (pollRef.current) clearInterval(pollRef.current);
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
    if (disabled || recordingRef.current || processing) return;
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
      setLevel(0);
      setElapsedMs(0);
      timerRef.current = setTimeout(() => void finish(true), maxRecordingMs);
      // Times come from the recording itself, not the wall clock.
      let heardSpeech = false;
      let quietSince = 0;
      pollRef.current = setInterval(() => {
        if (!recordingRef.current) return;
        const { durationMillis: elapsed, metering } = recorder.getStatus();
        setElapsedMs(elapsed);
        // Without metering (some web browsers) only the buttons end it.
        if (metering === undefined) return;
        setLevel(Math.min(1, Math.max(0, (metering + 60) / 50)));
        if (metering > speechLevelDb) {
          heardSpeech = true;
          quietSince = elapsed;
        } else if (heardSpeech && elapsed - quietSince >= endSilenceMs) {
          void finish(true);
        } else if (!heardSpeech && elapsed >= noSpeechTimeoutMs) {
          void finish(
            false,
            "No te escuché. Toca el micrófono para intentarlo de nuevo.",
          );
        }
      }, pollMs);
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

  const finish = async (transcribe: boolean, message?: string) => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setRecording(false);
    setLevel(0);
    setProcessing(transcribe);
    onStatus(message ?? null, Boolean(message));
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
        if (text.trim()) onTranscript(text.trim());
        else
          onStatus(
            "No entendí el audio. Inténtalo de nuevo o escribe tu pregunta.",
            true,
          );
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

  return {
    begin,
    cancel: () => finish(false),
    elapsedMs,
    finish: () => finish(true),
    level,
    processing,
    recording,
  };
}

function erase(uri: string | null) {
  if (!uri) return;
  try {
    new File(uri).delete();
  } catch {
    /* Cache deletion is best effort. */
  }
}
