import {
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const message =
      typeof body === "object" && body !== null && "message" in body
        ? String(body.message)
        : status === HttpStatus.INTERNAL_SERVER_ERROR
          ? "Ocurrió un error inesperado."
          : String(body ?? "Solicitud no válida.");

    if (!(exception instanceof HttpException)) {
      this.logger.error(exception);
    }

    response.status(status).send({
      error: {
        code:
          exception instanceof HttpException
            ? `HTTP_${status}`
            : "INTERNAL_ERROR",
        message,
      },
    });
  }
}
