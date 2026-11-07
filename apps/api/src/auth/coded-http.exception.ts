import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";

export type AuthErrorCode =
  | "ACCOUNT_NOT_DELETABLE"
  | "INVALID_PASSWORD"
  | "LEGAL_VERSION_OUTDATED"
  | "UNDERAGE";

/** Error que el cliente distingue por código, no por el estado HTTP. */
export class CodedHttpException extends HttpException {
  constructor(
    status: number,
    readonly code: AuthErrorCode,
    message: string,
  ) {
    super({ message }, status);
  }
}

/**
 * `HttpExceptionFilter` deriva `error.code` del estado HTTP. Este filtro conserva
 * ese mismo cuerpo, pero con el código propio de la excepción.
 */
@Catch(CodedHttpException)
export class CodedHttpExceptionFilter implements ExceptionFilter {
  catch(exception: CodedHttpException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    response.status(exception.getStatus()).send({
      error: { code: exception.code, message: exception.message },
    });
  }
}
