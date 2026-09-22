import { Injectable, Logger } from '@nestjs/common';

type TaskHandler = (payload: unknown) => Promise<void>;

/**
 * 异步任务队列抽象：转码/压缩/AI 诊断等耗时任务统一走队列。
 * 当前为进程内实现，生产可替换 BullMQ/Redis 实现削峰、重试与超时。
 */
@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly handlers = new Map<string, TaskHandler>();

  register<T>(name: string, handler: (payload: T) => Promise<void>): void {
    this.handlers.set(name, handler as TaskHandler);
  }

  async dispatch<T>(name: string, payload: T): Promise<void> {
    const handler = this.handlers.get(name);
    if (!handler) throw new Error(`未注册的任务处理器: ${name}`);
    this.logger.log(`派发任务: ${name}`);
    await handler(payload);
  }
}