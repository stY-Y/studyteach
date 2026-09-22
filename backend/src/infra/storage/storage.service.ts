import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 文件存储抽象：本地磁盘实现（生产可替换 OSS/S3）。
 * 所有可下载资源强制体积压缩，超限直接拒绝。
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly rootDir: string;

  constructor(config: ConfigService) {
    this.rootDir = path.resolve(config.get<string>('storage.dir') || './uploads');
    fs.mkdirSync(this.rootDir, { recursive: true });
    this.logger.log(`存储根目录: ${this.rootDir}`);
  }

  /** 保存文件，返回相对存储 key（相对根目录） */
  save(relativeKey: string, content: Buffer): string {
    const fullPath = path.join(this.rootDir, relativeKey);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
    return relativeKey;
  }

  read(relativeKey: string): Buffer {
    return fs.readFileSync(path.join(this.rootDir, relativeKey));
  }

  remove(relativeKey: string): void {
    const fullPath = path.join(this.rootDir, relativeKey);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }

  exists(relativeKey: string): boolean {
    return fs.existsSync(path.join(this.rootDir, relativeKey));
  }

  /** 校验体积上限（MB），超限抛 400 */
  assertSizeLimit(bytes: number, maxMb: number): void {
    if (bytes > maxMb * 1024 * 1024) {
      throw new BadRequestException(`文件体积超过上限 ${maxMb}MB，请压缩后重试`);
    }
  }
}