import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";

const transcriptionSchema = z.object({
  text: z.string().trim().min(1).max(2_000),
});
export const agentAudioMaxBytes = 5 * 1024 * 1024;

@Injectable()
export class AgentMediaService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  async transcribeAudio(
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ text: string }> {
    const format = audioFormat(buffer, mimeType);
    if (!format || buffer.length > agentAudioMaxBytes) {
      throw new BadRequestException(
        "El audio debe ser M4A, WAV o WebM y durar menos de un minuto.",
      );
    }
    const key = this.config.get<string>("OPENAI_API_KEY");
    if (!key)
      throw new ServiceUnavailableException(
        "La transcripción no está disponible.",
      );
    const form = new FormData();
    form.set("model", "gpt-transcribe");
    form.set(
      "file",
      new Blob([new Uint8Array(buffer)], { type: format.mime }),
      `pregunta.${format.extension}`,
    );
    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new ServiceUnavailableException(
        "La transcripción no está disponible.",
      );
    }
    if (!response.ok)
      throw new ServiceUnavailableException(
        "La transcripción no está disponible.",
      );
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ServiceUnavailableException(
        "La transcripción no está disponible.",
      );
    }
    const result = transcriptionSchema.safeParse(payload);
    if (!result.success)
      throw new ServiceUnavailableException("No se pudo entender el audio.");
    return { text: result.data.text };
  }
}

function audioFormat(buffer: Buffer, mimeType: string) {
  if (
    (mimeType === "audio/mp4" ||
      mimeType === "audio/m4a" ||
      mimeType === "audio/x-m4a") &&
    buffer.toString("ascii", 4, 8) === "ftyp"
  )
    return { mime: "audio/mp4", extension: "m4a" };
  if (
    (mimeType === "audio/wav" || mimeType === "audio/x-wav") &&
    buffer.toString("ascii", 0, 4) === "RIFF"
  )
    return { mime: "audio/wav", extension: "wav" };
  if (
    mimeType === "audio/webm" &&
    buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
  )
    return { mime: "audio/webm", extension: "webm" };
  return null;
}
