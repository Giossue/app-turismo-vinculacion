import type { useAgentVoiceInput as useProductAgentVoiceInput } from "../src/features/agent/presentation/agent-voice-input";

/** Layout QA never starts a recorder or transcribes audio over the network. */
export function useAgentVoiceInput({
  onStatus,
}: Parameters<typeof useProductAgentVoiceInput>[0]) {
  return {
    begin: async () => {
      onStatus("La grabación está desactivada en esta prueba visual.");
    },
    cancel: async () => undefined,
    finish: async () => undefined,
    processing: false,
    recording: false,
  };
}
