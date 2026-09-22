import { ref } from 'vue';
import { storage } from './storage';

/** 网络状态（响应式，供界面显示离线提示） */
export const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine);

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline.value = true;
  });
  window.addEventListener('offline', () => {
    isOnline.value = false;
  });
}

interface CacheEntry<T> {
  data: T;
  at: number;
}

/** 缓存索引项：只存键与写入时间，避免淘汰时解析全部缓存正文 */
interface IndexItem {
  k: string;
  at: number;
}

const CACHE_PREFIX = 'cache:';
const INDEX_KEY = 'cacheIndex';

/** 缓存有效期：7 天 */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 内存与存储保护阈值（低配设备关键参数）
 * - 单条超过 64KB 的响应不缓存：避免大 JSON 常驻内存与解析尖峰
 * - 缓存条目上限 30 条，超出按写入时间淘汰最旧的
 */
const MAX_ENTRY_CHARS = 64 * 1024;
const MAX_ENTRIES = 30;

/** 估算序列化体积；无法序列化时返回 -1 */
function estimateSize(value: unknown): number {
  try {
    return JSON.stringify(value).length;
  } catch {
    return -1;
  }
}

/** 读取索引；索引缺失或损坏时依据实际键重建（保持自愈） */
function readIndex(): IndexItem[] {
  const index = storage.get<IndexItem[]>(INDEX_KEY);
  if (Array.isArray(index)) return index;

  const rebuilt: IndexItem[] = storage
    .keys()
    .filter((k) => k.startsWith(CACHE_PREFIX))
    .map((k) => ({ k, at: 0 }));
  storage.set(INDEX_KEY, rebuilt);
  return rebuilt;
}

function writeIndex(index: IndexItem[]): void {
  storage.set(INDEX_KEY, index);
}

/** 只操作索引即可完成淘汰，无需解析任何缓存正文 */
function evictIfNeeded(): void {
  const index = readIndex();
  if (index.length <= MAX_ENTRIES) return;

  index.sort((a, b) => a.at - b.at);
  const overflow = index.length - MAX_ENTRIES;
  const removed = index.splice(0, overflow);
  removed.forEach((item) => storage.remove(item.k));
  writeIndex(index);
}

/**
 * 离线缓存：把已获取的数据缓存到本地，断网时仍可查看。
 * 对应需求「支持核心功能离线缓存，适配乡村低带宽、网络不稳定场景」，
 * 同时限制单条体积与总条目数，避免占用过多本地存储与运行时内存。
 */
export const offline = {
  save<T>(key: string, data: T): void {
    // 体积过大的响应直接放弃缓存（防止内存尖峰），不影响在线使用
    if (estimateSize(data) > MAX_ENTRY_CHARS) return;

    const fullKey = CACHE_PREFIX + key;
    const entry: CacheEntry<T> = { data, at: Date.now() };

    storage.set(fullKey, entry);

    const index = readIndex().filter((item) => item.k !== fullKey);
    index.push({ k: fullKey, at: entry.at });
    writeIndex(index);

    evictIfNeeded();
  },

  load<T>(key: string, maxAgeMs: number = MAX_AGE_MS): T | null {
    const fullKey = CACHE_PREFIX + key;
    const entry = storage.get<CacheEntry<T>>(fullKey);
    if (!entry || typeof entry.at !== 'number') return null;

    if (Date.now() - entry.at > maxAgeMs) {
      this.remove(key);
      return null;
    }
    return entry.data;
  },

  remove(key: string): void {
    const fullKey = CACHE_PREFIX + key;
    storage.remove(fullKey);
    writeIndex(readIndex().filter((item) => item.k !== fullKey));
  },

  /** 已缓存条目数（读索引，O(1)） */
  size(): number {
    return readIndex().length;
  },

  /** 清空全部离线缓存，释放本地空间 */
  clear(): number {
    const index = readIndex();
    index.forEach((item) => storage.remove(item.k));
    writeIndex([]);
    return index.length;
  },
};