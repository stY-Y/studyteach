import { Injectable } from '@nestjs/common';

interface CacheItem {
  value: unknown;
  expireAt: number;
}

/** 进程内缓存（框架阶段）；接口与 Redis 对齐，生产可无缝替换 */
@Injectable()
export class CacheService {
  private readonly store = new Map<string, CacheItem>();

  get<T>(key: string): T | undefined {
    const item = this.store.get(key);
    if (!item) return undefined;
    if (Date.now() > item.expireAt) {
      this.store.delete(key);
      return undefined;
    }
    return item.value as T;
  }

  set(key: string, value: unknown, ttlSeconds = 300): void {
    this.store.set(key, { value, expireAt: Date.now() + ttlSeconds * 1000 });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
}