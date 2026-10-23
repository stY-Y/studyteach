import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { CryptoService } from '../../common/security/crypto.service';

interface CodeRecord {
  /** 验证码哈希（HMAC），内存中不保存明文 */
  codeHash: string;
  /** 过期时间戳（毫秒） */
  expiresAt: number;
  /** 已尝试次数 */
  attempts: number;
  /** 最近一次发送时间（毫秒），用于重发冷却 */
  lastSentAt: number;
}

/** 验证码策略（可按运营需要调整） */
const CODE_TTL_MS = 5 * 60 * 1000; // 5 分钟有效
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 秒内不可重发
const MAX_ATTEMPTS = 5; // 最多试 5 次，超过即作废

/**
 * 手机验证码服务（零外部依赖，进程内存储）。
 *
 * 安全设计：
 *  - 验证码**不落库、不写日志**，内存中仅存 HMAC 哈希，降低泄露面
 *  - 15 分钟内过期、最多 5 次尝试、60 秒重发冷却，防爆破与短信轰炸
 *  - 以手机号盲索引作为键，不存手机号明文
 *  - 开发环境通过响应返回 devCode 便于联调；生产环境不返回，需接入短信网关
 *
 * 生产部署提示：多实例部署时内存存储不共享，需替换为 Redis 等集中式存储
 * （本服务已按「策略与存储分离」的思路写，替换 send/verify 内部实现即可）。
 */
@Injectable()
export class SmsCodeService {
  private readonly logger = new Logger(SmsCodeService.name);
  private readonly store = new Map<string, CodeRecord>();

  constructor(private readonly crypto: CryptoService) {}

  /**
   * 生成并「发送」验证码。
   * @returns devCode：仅非生产环境返回明文，便于本地联调
   */
  send(phone: string): { cooldownSeconds: number; devCode: string | null } {
    const key = this.crypto.blindIndex(phone);
    if (!key) throw new BadRequestException('手机号格式不正确');

    const now = Date.now();
    this.cleanup(now);

    const existing = this.store.get(key);
    if (existing && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
      throw new HttpException(`请 ${wait} 秒后再获取验证码`, HttpStatus.TOO_MANY_REQUESTS);
    }

    // 6 位数字，使用加密安全随机数
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    this.store.set(key, {
      codeHash: this.crypto.blindIndex(`${phone}:${code}`) ?? '',
      expiresAt: now + CODE_TTL_MS,
      attempts: 0,
      lastSentAt: now,
    });

    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      // 生产环境：此处应调用短信网关（阿里云/腾讯云等），日志中不记录验证码与手机号
      this.logger.log('验证码已生成，等待短信网关下发');
    }

    return { cooldownSeconds: Math.floor(RESEND_COOLDOWN_MS / 1000), devCode: isProduction ? null : code };
  }

  /** 校验验证码；成功即作废（一次性） */
  verify(phone: string, code: string): void {
    const key = this.crypto.blindIndex(phone);
    if (!key) throw new BadRequestException('手机号格式不正确');

    const record = this.store.get(key);
    if (!record) {
      throw new BadRequestException('验证码已失效，请重新获取');
    }

    const now = Date.now();
    // 过期或次数超限都只报错、不删除记录：保留 lastSentAt 让重发冷却继续生效
    if (now > record.expiresAt) {
      throw new BadRequestException('验证码已过期，请重新获取');
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException('尝试次数过多，请重新获取验证码');
    }

    record.attempts += 1;
    const incoming = this.crypto.blindIndex(`${phone}:${code.trim()}`);
    if (!incoming || incoming !== record.codeHash) {
      throw new BadRequestException('验证码不正确');
    }

    // 一次性使用：清空验证码内容并置为过期，但**保留 lastSentAt**，
    // 否则冷却信息一起丢失，会导致注册后能立刻重发验证码（短信轰炸漏洞）
    record.codeHash = '';
    record.expiresAt = 0;
    record.attempts = MAX_ATTEMPTS;
  }

  /** 惰性清理：过期且已过冷却期的记录才移除，避免丢冷却信息 */
  private cleanup(now: number): void {
    for (const [key, record] of this.store) {
      if (now > record.expiresAt && now - record.lastSentAt > RESEND_COOLDOWN_MS) {
        this.store.delete(key);
      }
    }
  }
}
