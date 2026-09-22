/** 本地存储封装：统一前缀 + 异常兜底（隐私模式/存储已满时不抛错） */
const PREFIX = 'teachstudy:';

export const storage = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* 存储不可用或已满：静默降级，不影响主流程 */
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  },

  /** 列出本应用写入的全部键（自动去掉内部前缀） */
  keys(): string[] {
    const result: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) result.push(k.slice(PREFIX.length));
      }
    } catch {
      /* ignore */
    }
    return result;
  },

  /** 清理本应用写入的全部键（不影响同域其它应用） */
  clearAll(): void {
    this.keys().forEach((k) => this.remove(k));
  },
};