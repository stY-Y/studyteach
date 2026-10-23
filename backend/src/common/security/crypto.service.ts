import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SEPARATOR = ':';

/**
 * 轻量字段级加密与脱敏（保护手机号、监护人手机等在库落地的个人敏感信息）。
 *
 * 加密：
 *  - 算法：AES-256-GCM（带认证标签，可防篡改/防密文替换）
 *  - 密钥：来自环境变量 ENCRYPTION_KEY；未配置时回退内置「开发密钥」并打印告警（仅限本地，生产必须配置）
 *  - 输出：`base64(iv) : base64(tag) : base64(ciphertext)`，用 : 分隔三段
 *
 * 兼容迁移：
 *  - decrypt 遇到非三段格式或解密失败时原样返回，避免历史明文数据无法读取、也避免密钥变更导致崩溃
 *
 * 脱敏：
 *  - maskPhone：保留前 3 后 4（手机号标准脱敏），其余以 **** 代替
 *  - maskName：保留首字，其余以 * 代替（用于非必要的姓名展示场景）
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly key: Buffer;

  constructor() {
    const envKey = process.env.ENCRYPTION_KEY;
    if (!envKey || envKey.trim().length === 0) {
      this.logger.warn(
        'ENCRYPTION_KEY 未配置，已使用内置「开发密钥」。生产环境务必配置 ≥32 字节的随机密钥，否则敏感字段加密形同虚设。',
      );
      this.key = createHash('sha256').update('dev-only-encryption-key-qinghe').digest();
    } else {
      // 任意长度密钥统一派生为 32 字节，降低配置门槛且避免弱密钥
      this.key = createHash('sha256').update(envKey).digest();
    }
  }

  /** 加密（null/空值原样返回，便于直接落库） */
  encrypt(plain: string | null | undefined): string | null {
    if (plain === null || plain === undefined) return null;
    if (plain === '') return '';
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(
      SEPARATOR,
    );
  }

  /** 解密（兼容迁移：非三段格式或失败均原样返回） */
  decrypt(payload: string | null | undefined): string | null {
    if (payload === null || payload === undefined) return null;
    if (payload === '') return '';
    const parts = payload.split(SEPARATOR);
    if (parts.length !== 3) return payload;
    try {
      const iv = Buffer.from(parts[0], 'base64');
      const tag = Buffer.from(parts[1], 'base64');
      const encrypted = Buffer.from(parts[2], 'base64');
      const decipher = createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString('utf8');
    } catch {
      return payload;
    }
  }

  /** 手机号脱敏：保留前 3 后 4（其余 ****），非 11 位手机号按「前 2 + 中间 * + 末 1」兜底 */
  maskPhone(phone: string | null | undefined): string | null {
    if (!phone) return null;
    const p = phone.trim();
    if (/^1\d{10}$/.test(p)) {
      return `${p.slice(0, 3)}****${p.slice(7)}`;
    }
    if (p.length <= 2) return `${p[0]}*`;
    return `${p.slice(0, 2)}${'*'.repeat(p.length - 3)}${p.slice(-1)}`;
  }

  /** 姓名脱敏：保留首字，其余以 * 代替（中文姓名「张三」→「张*」） */
  maskName(name: string | null | undefined): string | null {
    if (!name) return null;
    const n = name.trim();
    if (n.length <= 1) return n.length ? `${n[0]}*` : n;
    return `${n[0]}${'*'.repeat(n.length - 1)}`;
  }
}
