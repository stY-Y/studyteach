import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse, BizCode } from '@teachstudy/shared';

/** 全局异常过滤，统一错误响应结构 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: number = BizCode.INTERNAL_ERROR;
    let message = '服务器内部错误';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = this.statusToCode(status);
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object') {
        const m = (res as Record<string, unknown>).message;
        message = Array.isArray(m) ? m.join('；') : (m as string) ?? exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.message, exception.stack);
    }

    const body: ApiResponse<null> = {
      code,
      message,
      data: null,
      timestamp: Date.now(),
    };
    response.status(status).json(body);
  }

  private statusToCode(status: number): number {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return BizCode.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return BizCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return BizCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return BizCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return BizCode.CONFLICT;
      default:
        return BizCode.INTERNAL_ERROR;
    }
  }
}