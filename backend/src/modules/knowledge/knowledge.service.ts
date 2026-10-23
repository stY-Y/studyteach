import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { StudyStage, Subject } from '@teachstudy/shared';
import { KnowledgePoint } from './entities/knowledge-point.entity';
import { CreateKnowledgePointDto, UpdateKnowledgePointDto } from './dto/knowledge.dto';

/** 知识点树节点（导出以便控制器标注返回类型，满足声明文件要求） */
export interface KnowledgeNode extends KnowledgePoint {
  children: KnowledgeNode[];
}

/** 学科编码前缀 */
const SUBJECT_PREFIX: Record<Subject, string> = {
  [Subject.CHINESE]: 'CHN',
  [Subject.MATH]: 'MATH',
  [Subject.ENGLISH]: 'ENG',
  [Subject.PHYSICS]: 'PHY',
  [Subject.CHEMISTRY]: 'CHE',
  [Subject.BIOLOGY]: 'BIO',
  [Subject.POLITICS]: 'POL',
  [Subject.HISTORY]: 'HIS',
  [Subject.GEOGRAPHY]: 'GEO',
};

/** 学段编码前缀：小学 P / 初中 J / 高中 S，未指定用 X */
const STAGE_PREFIX: Record<string, string> = {
  [StudyStage.PRIMARY_HIGH]: 'P',
  [StudyStage.JUNIOR]: 'J',
  [StudyStage.SENIOR]: 'S',
};

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(KnowledgePoint)
    private readonly repo: Repository<KnowledgePoint>,
  ) {}

  list(subject?: Subject, stage?: StudyStage): Promise<KnowledgePoint[]> {
    return this.repo.find({
      where: { ...(subject ? { subject } : {}), ...(stage ? { stage } : {}) },
      order: { subject: 'ASC', order: 'ASC' },
    });
  }

  /** 构建知识点树 */
  async tree(subject?: Subject): Promise<KnowledgeNode[]> {
    const all = await this.repo.find({ order: { order: 'ASC' } });
    const nodes = new Map<string, KnowledgeNode>(
      all.map((k) => [k.id, { ...k, children: [] }]),
    );
    const roots: KnowledgeNode[] = [];
    for (const node of nodes.values()) {
      if (subject && node.subject !== subject) continue;
      if (node.parentId && nodes.has(node.parentId)) {
        nodes.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async findById(id: string): Promise<KnowledgePoint> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('知识点不存在');
    return found;
  }

  /**
   * 新增知识点。编码由系统生成（教师无需手写）：
   * 格式 `学科-学段-三位序号`，例如 `MATH-J-001`。
   * 同一「学科+学段」下序号递增，冲突时继续向后找。
   */
  async create(dto: CreateKnowledgePointDto): Promise<KnowledgePoint> {
    const manual = dto.code?.trim();
    const code = manual || (await this.generateCode(dto.subject, dto.stage));
    return this.repo.save(
      this.repo.create({
        ...dto,
        code,
        stage: dto.stage ?? null,
        parentId: dto.parentId || null,
      } as Partial<KnowledgePoint>),
    );
  }

  /**
   * 按「学科-学段-序号」生成唯一编码，如 `MATH-J-05`。
   * 从 01 起找第一个空位，因此不会被 `MATH-J-0101` 这类子节点编码干扰。
   */
  async generateCode(subject: Subject, stage?: StudyStage | null): Promise<string> {
    const prefix = `${SUBJECT_PREFIX[subject] ?? 'KP'}-${stage ? (STAGE_PREFIX[stage] ?? 'X') : 'X'}`;
    const rows = await this.repo.find({ where: { code: Like(`${prefix}-%`) } });
    const used = new Set(rows.map((r) => r.code));

    for (let seq = 1; seq < 1000; seq += 1) {
      const code = `${prefix}-${String(seq).padStart(seq < 100 ? 2 : 3, '0')}`;
      if (!used.has(code)) return code;
    }
    // 兜底：极端情况下用时间戳后缀
    return `${prefix}-${Date.now().toString().slice(-6)}`;
  }

  async update(id: string, dto: UpdateKnowledgePointDto): Promise<KnowledgePoint> {
    await this.repo.update(id, dto);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}