import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, BizCode } from '@teachstudy/shared';

/** 统一成功响应结构 { code, message, data, timestamp }；文件流直通不包装 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | StreamableFile>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | StreamableFile> {
    return next.handle().pipe(
      map((data) => {
        if (data instanceof StreamableFile) return data;
        return {
          code: BizCode.SUCCESS,
          message: 'success',
          data,
          timestamp: Date.now(),
        };
      }),
    );
  }
}