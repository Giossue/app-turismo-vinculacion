import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";

@Injectable()
export class MediaStorageService {
  private readonly provider: "LOCAL" | "S3";
  private readonly root: string;
  private readonly bucket: string;
  private readonly client: S3Client | null;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    this.provider = config.getOrThrow<"LOCAL" | "S3">("MEDIA_STORAGE_PROVIDER");
    const configuredRoot = config.getOrThrow<string>("MEDIA_STORAGE_ROOT");
    this.root = isAbsolute(configuredRoot)
      ? configuredRoot
      : resolve(process.cwd(), configuredRoot);
    this.bucket = config.getOrThrow<string>("MEDIA_S3_BUCKET");
    if (this.provider === "S3") {
      const accessKeyId = config.get<string>("MEDIA_S3_ACCESS_KEY_ID");
      const secretAccessKey = config.get<string>("MEDIA_S3_SECRET_ACCESS_KEY");
      if (!accessKeyId || !secretAccessKey) {
        throw new Error(
          "MEDIA_S3_ACCESS_KEY_ID y MEDIA_S3_SECRET_ACCESS_KEY son obligatorios con S3.",
        );
      }
      this.client = new S3Client({
        region: config.getOrThrow<string>("MEDIA_S3_REGION"),
        endpoint: config.get<string>("MEDIA_S3_ENDPOINT"),
        forcePathStyle: Boolean(config.get<string>("MEDIA_S3_ENDPOINT")),
        credentials: { accessKeyId, secretAccessKey },
      });
    } else {
      this.client = null;
    }
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    if (this.provider === "S3") {
      await this.client!.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
      return;
    }
    const target = this.localPath(key);
    await mkdir(dirname(target), { recursive: true, mode: 0o750 });
    await writeFile(target, body, { mode: 0o640 });
  }

  async remove(key: string): Promise<void> {
    if (this.provider === "S3") {
      await this.client!.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return;
    }
    try {
      await unlink(this.localPath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  async get(key: string): Promise<Buffer> {
    if (this.provider === "S3") {
      const output = await this.client!.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!output.Body)
        throw new NotFoundException("No se encontró el archivo.");
      const chunks: Buffer[] = [];
      for await (const chunk of output.Body as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    }
    try {
      return await readFile(this.localPath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new NotFoundException("No se encontró el archivo.");
      }
      throw error;
    }
  }

  private localPath(key: string): string {
    if (!key || key.includes("..") || key.startsWith("/")) {
      throw new Error("Clave de objeto inválida.");
    }
    const target = resolve(join(this.root, key));
    if (!target.startsWith(`${this.root}/`))
      throw new Error("Clave de objeto inválida.");
    return target;
  }
}
