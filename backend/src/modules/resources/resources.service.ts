import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as path from 'path';
import {
  RESOURCE_SIZE_LIMIT_MB,
  ResourceScope,
  ResourceStatus,
  ResourceType,
  ReviewLevel,
  ReviewResult,
  UserRole,
} from '@teachstudy/shared';
import { Resource } from './entities/resource.entity';
import { ReviewRecord } from './entities/review-record.entity';
import { StorageService } from '../../infra/storage/storage.service';
import { OfflineService } from '../../infra/offline/offline.service';
import { AiService } from '../../ai/ai.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import {
  QueryResourceDto,
  ReviewResourceDto,
  UpdateResourceDto,
  UploadResourceDto,
} from './dto/resource.dto';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resource) private readonly repo: Repository<Resource>,
    @InjectRepository(ReviewRecord) private readonly reviewRepo: Repository<ReviewRecord>,
    private readonly storage: StorageService,
    private readonly offlineService: OfflineService,
    private readonly ai: AiService,
  ) {}

  /** 各类型资源体积上限（轻量化强制压缩） */
  private maxSizeMb(type: ResourceType): number {
    switch (type) {
      case ResourceType.VIDEO:
        return RESOURCE_SIZE_LIMIT_MB.VIDEO;
      case ResourceType.AUDIO:
        return RESOURCE_SIZE_LIMIT_MB.AUDIO;
      default:
        return RESOURCE_SIZE_LIMIT_MB.EBOOK;
    }
  }

  async upload(owner: AuthUser, dto: UploadResourceDto, file?: Express.Multer.File): Promise<Resource> {
    if (!file) throw new BadRequestException('缺少上传文件');
    this.storage.assertSizeLimit(file.size, this.maxSizeMb(dto.type));

    const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
    const fileKey = this.storage.save(
      `${owner.id}/${Date.now()}_${randomBytes(4).toString('hex')}${ext}`,
      file.buffer,
    );

    // 知识点标签自动匹配（可人工覆盖）：简介里往往含学段/知识点线索，一并参与匹配
    const autoTags = await this.ai.extractKnowledgeTags(dto.title, dto.description ?? '');
    const knowledgePoints = dto.knowledgePoints
      ? (JSON.parse(dto.knowledgePoints) as string[])
      : autoTags;

    return this.repo.save(
      this.repo.create({
        title: dto.title,
        description: dto.description.trim(),
        type: dto.type,
        subject: dto.subject,
        stage: dto.stage,
        grade: dto.grade ?? null,
        knowledgePoints,
        fileKey,
        fileSize: file.size,
        format: ext,
        ownerId: owner.id,
        schoolId: owner.schoolId,
        scope: dto.scope,
        status: ResourceStatus.PENDING_SCHOOL,
      }),
    );
  }

  async list(viewer: AuthUser, query: QueryResourceDto, page = 1, pageSize = 20) {
    const qb = this.repo
      .createQueryBuilder('r')
      .where('r.status = :status', { status: ResourceStatus.APPROVED });
    if (query.type) qb.andWhere('r.type = :type', { type: query.type });
    if (query.subject) qb.andWhere('r.subject = :subject', { subject: query.subject });
    if (query.stage) qb.andWhere('r.stage = :stage', { stage: query.stage });
    // 年级：指定年级时，同时包含该年级资源与「跨年级通用」（grade 为空）的资源
    if (query.grade) {
      qb.andWhere('(r.grade = :grade OR r.grade IS NULL)', { grade: query.grade });
    }

    // 开放权限：全平台共享 或 本校可见
    if (viewer.schoolId) {
      qb.andWhere('(r.scope = :pub OR r.schoolId = :school)', {
        pub: ResourceScope.PUBLIC,
        school: viewer.schoolId,
      });
    } else {
      qb.andWhere('r.scope = :pub', { pub: ResourceScope.PUBLIC });
    }

    qb.orderBy('r.downloads', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  myResources(ownerId: string): Promise<Resource[]> {
    return this.repo.find({ where: { ownerId }, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Resource> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('资源不存在');
    return found;
  }

  /** 教师自主管理本校上传资源：修改标题/开放范围 */
  async update(id: string, actor: AuthUser, dto: UpdateResourceDto): Promise<Resource> {
    const resource = await this.findById(id);
    if (resource.ownerId !== actor.id && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('无权修改该资源');
    }
    Object.assign(resource, dto);
    return this.repo.save(resource);
  }

  /** 教师自主下架资源 */
  async offline(id: string, actor: AuthUser): Promise<Resource> {
    const resource = await this.findById(id);
    if (resource.ownerId !== actor.id && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('无权下架该资源');
    }
    resource.status = ResourceStatus.OFFLINE;
    return this.repo.save(resource);
  }

  /**
   * 待审核队列：校级审核阶段与平台复核阶段的资源。
   * 教师只看本校（校级审核），管理员看全部（含平台复核）。
   * 这是「资源复核」界面缺的关键接口。
   */
  async listPending(reviewer: AuthUser): Promise<Resource[]> {
    const statuses = [ResourceStatus.PENDING_SCHOOL, ResourceStatus.PENDING_PLATFORM];
    const order = { createdAt: 'DESC' as const };

    if (reviewer.role === UserRole.ADMIN) {
      return this.repo.find({ where: { status: In(statuses) }, order });
    }
    if (reviewer.schoolId) {
      return this.repo.find({
        where: { status: In(statuses), schoolId: reviewer.schoolId },
        order,
      });
    }
    return [];
  }

  /** 双层审核：校级审核（教师/管理员）-> 平台复核（仅管理员）-> 入库 */
  async review(id: string, reviewer: AuthUser, dto: ReviewResourceDto): Promise<Resource> {
    const resource = await this.findById(id);

    // 权限：学生/家长不可审核；校级审核限本校（管理员除外）；平台复核仅管理员
    if (reviewer.role === UserRole.STUDENT || reviewer.role === UserRole.PARENT) {
      throw new ForbiddenException('无权审核资源');
    }
    if (dto.level === ReviewLevel.SCHOOL) {
      if (
        reviewer.role !== UserRole.ADMIN &&
        resource.schoolId &&
        resource.schoolId !== reviewer.schoolId
      ) {
        throw new ForbiddenException('只能审核本校资源');
      }
    } else if (reviewer.role !== UserRole.ADMIN) {
      throw new ForbiddenException('平台复核仅限平台管理员');
    }

    if (dto.level === ReviewLevel.SCHOOL) {
      if (resource.status !== ResourceStatus.PENDING_SCHOOL) {
        throw new BadRequestException('当前状态不可校级审核');
      }
      resource.status =
        dto.result === ReviewResult.APPROVED
          ? ResourceStatus.PENDING_PLATFORM
          : ResourceStatus.REJECTED;
    } else {
      if (resource.status !== ResourceStatus.PENDING_PLATFORM) {
        throw new BadRequestException('当前状态不可平台复核');
      }
      resource.status =
        dto.result === ReviewResult.APPROVED ? ResourceStatus.APPROVED : ResourceStatus.REJECTED;
    }

    await this.reviewRepo.save(
      this.reviewRepo.create({
        resourceId: id,
        level: dto.level,
        reviewerId: reviewer.id,
        result: dto.result,
        comment: dto.comment,
      }),
    );
    return this.repo.save(resource);
  }

  /** 下载（全程免费），返回文件内容供控制器流式输出 */
  /** 在线预览：点开即看，不计入下载量 */
  async getPreview(id: string): Promise<{ filename: string; buffer: Buffer; mime: string }> {
    const resource = await this.findById(id);
    if (resource.status !== ResourceStatus.APPROVED) {
      throw new BadRequestException('资源未审核通过，不可预览');
    }
    const buffer = this.storage.read(resource.fileKey);
    return {
      filename: `${resource.title}${resource.format}`,
      buffer,
      mime: this.mimeOf(resource.format),
    };
  }

  /** 下载：累加下载量 */
  async getDownload(id: string): Promise<{ filename: string; buffer: Buffer; mime: string }> {
    const resource = await this.findById(id);
    if (resource.status !== ResourceStatus.APPROVED) {
      throw new BadRequestException('资源未审核通过，不可下载');
    }
    const buffer = this.storage.read(resource.fileKey);
    resource.downloads += 1;
    await this.repo.save(resource);
    return { filename: `${resource.title}${resource.format}`, buffer, mime: this.mimeOf(resource.format) };
  }

  private mimeOf(format: string): string {
    const map: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.m4a': 'audio/mp4',
      '.wav': 'audio/wav',
      '.pdf': 'application/pdf',
      '.epub': 'application/epub+zip',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.md': 'text/markdown; charset=utf-8',
      '.markdown': 'text/markdown; charset=utf-8',
      '.txt': 'text/plain; charset=utf-8',
      '.csv': 'text/csv; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.zip': 'application/zip',
    };
    return map[format.toLowerCase()] ?? 'application/octet-stream';
  }

  // ---------- 离线缓存 ----------
  offlineManifest(userId: string) {
    return this.offlineService.buildManifest(userId);
  }

  async cacheForOffline(userId: string, resourceId: string) {
    const resource = await this.findById(resourceId);
    if (resource.status !== ResourceStatus.APPROVED) {
      throw new BadRequestException('资源未审核通过');
    }
    this.offlineService.markCached(userId, resourceId);
    return { cached: true };
  }

  releaseOffline(userId: string, resourceId: string) {
    this.offlineService.release(userId, resourceId);
    return { released: true };
  }
}