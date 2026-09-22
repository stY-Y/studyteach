import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage/storage.service';
import { CacheService } from './cache/cache.service';
import { QueueService } from './queue/queue.service';
import { OfflineService } from './offline/offline.service';

/** 基础设施层：文件存储 / 缓存 / 队列 / 离线缓存（全局单例） */
@Global()
@Module({
  providers: [StorageService, CacheService, QueueService, OfflineService],
  exports: [StorageService, CacheService, QueueService, OfflineService],
})
export class InfraModule {}