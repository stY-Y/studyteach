import { Injectable } from '@nestjs/common';

export interface OfflineCacheItem {
  resourceId: string;
  cachedAt: number;
}

export interface OfflineManifest {
  userId: string;
  count: number;
  items: OfflineCacheItem[];
  generatedAt: number;
}

/**
 * 离线缓存：核心功能离线可用，下载资源可无网访问；
 * 支持随时删除已用资源，不强制占用本地存储空间。
 */
@Injectable()
export class OfflineService {
  // 用户 -> 已缓存资源（进程内；生产落库/Redis）
  private readonly cacheMap = new Map<string, OfflineCacheItem[]>();

  list(userId: string): OfflineCacheItem[] {
    return this.cacheMap.get(userId) ?? [];
  }

  markCached(userId: string, resourceId: string): void {
    const list = this.cacheMap.get(userId) ?? [];
    if (!list.some((i) => i.resourceId === resourceId)) {
      list.push({ resourceId, cachedAt: Date.now() });
    }
    this.cacheMap.set(userId, list);
  }

  /** 删除已用资源，释放本地空间 */
  release(userId: string, resourceId: string): void {
    const list = (this.cacheMap.get(userId) ?? []).filter((i) => i.resourceId !== resourceId);
    this.cacheMap.set(userId, list);
  }

  buildManifest(userId: string): OfflineManifest {
    const items = this.list(userId);
    return { userId, count: items.length, items, generatedAt: Date.now() };
  }
}