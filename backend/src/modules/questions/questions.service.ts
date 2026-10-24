import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  DifficultyLevel,
  QuestionType,
  StudyStage,
  Subject,
} from '@teachstudy/shared';
import { primaryCurriculumViolation } from '../../common/curriculum';
import { Question } from './entities/question.entity';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';

/** 小学只开语数外：写入题库前先卡住越界的「学科 + 学段/年级」组合 */
function assertPrimaryCurriculum(
  subject: Subject,
  stage?: StudyStage | null,
  grade?: number | null,
): void {
  const violation = primaryCurriculumViolation(subject, stage, grade);
  if (violation) throw new BadRequestException(violation);
}

export interface QuestionQuery {
  subject?: Subject;
  stage?: StudyStage;
  /** 年级（题库第 1 层） */
  grade?: number;
  /** 章节（题库第 3 层） */
  chapter?: string;
  type?: QuestionType;
  difficulty?: DifficultyLevel;
  knowledgePointId?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly repo: Repository<Question>,
  ) {}

  async search(query: QuestionQuery) {
    const {
      subject,
      stage,
      grade,
      chapter,
      type,
      difficulty,
      knowledgePointId,
      page = 1,
      pageSize = 20,
    } = query;
    const qb = this.repo.createQueryBuilder('q').where('q.status = :status', { status: 'approved' });
    if (subject) qb.andWhere('q.subject = :subject', { subject });
    if (stage) qb.andWhere('q.stage = :stage', { stage });
    if (grade) qb.andWhere('q.grade = :grade', { grade });
    if (chapter) qb.andWhere('q.chapter = :chapter', { chapter });
    if (type) qb.andWhere('q.type = :type', { type });
    if (difficulty) qb.andWhere('q.difficulty = :difficulty', { difficulty });
    if (knowledgePointId) qb.andWhere('q.knowledgePoints LIKE :kp', { kp: `%${knowledgePointId}%` });
    qb.orderBy('q.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  /**
   * 章节列表（题库第 3 层）：按年级/科目筛选后去重返回，附题目数。
   * 供题库三级筛选与作业选题使用。
   */
  async chapters(
    grade?: number,
    subject?: Subject,
  ): Promise<Array<{ chapter: string; count: number }>> {
    const qb = this.repo
      .createQueryBuilder('q')
      .select('q.chapter', 'chapter')
      .addSelect('COUNT(*)', 'count')
      .where('q.status = :status', { status: 'approved' })
      .andWhere('q.chapter IS NOT NULL')
      .andWhere("q.chapter <> ''");

    if (grade) qb.andWhere('q.grade = :grade', { grade });
    if (subject) qb.andWhere('q.subject = :subject', { subject });

    const rows = await qb
      .groupBy('q.chapter')
      .orderBy('q.chapter', 'ASC')
      .getRawMany<{ chapter: string; count: string | number }>();

    return rows.map((r) => ({ chapter: r.chapter, count: Number(r.count) }));
  }

  async findById(id: string): Promise<Question> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('题目不存在');
    return found;
  }

  findByIds(ids: string[]): Promise<Question[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repo.findBy({ id: In(ids) });
  }

  async create(dto: CreateQuestionDto): Promise<Question> {
    assertPrimaryCurriculum(dto.subject, dto.stage, dto.grade);
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateQuestionDto): Promise<Question> {
    const current = await this.findById(id);
    assertPrimaryCurriculum(
      dto.subject ?? current.subject,
      dto.stage ?? current.stage,
      dto.grade ?? current.grade,
    );
    await this.repo.update(id, dto);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  /** 按知识点随机抽取检测题（用于知识诊断 10-15 题） */
  async pickByKnowledgePoints(
    subject: Subject,
    stage: StudyStage,
    knowledgePointIds: string[],
    count: number,
  ): Promise<Question[]> {
    // 必须按学段过滤：否则小学/初中/高中的题会混进同一份诊断
    const qb = this.repo
      .createQueryBuilder('q')
      .where('q.subject = :subject', { subject })
      .andWhere('q.stage = :stage', { stage });
    qb.andWhere('q.status = :status', { status: 'approved' });
    if (knowledgePointIds.length > 0) {
      qb.andWhere(
        knowledgePointIds.map((_, i) => `q.knowledgePoints LIKE :kp${i}`).join(' OR '),
        Object.fromEntries(knowledgePointIds.map((kp, i) => [`kp${i}`, `%${kp}%`])),
      );
    }
    // 取候选池后在内存随机打乱（避免 SQL 方言差异，保证 sqlite/mysql 一致）
    const pool = await qb.take(500).getMany();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }

  /**
   * 按选题计划条目从题库抽题（智能组卷用）。
   * 逐步放宽条件以保证出题量：精确匹配 → 放宽难度 → 放宽题型 → 同科目兜底。
   */
  async pickQuestions(params: {
    subject: Subject;
    stage: StudyStage;
    knowledgePointId: string;
    questionType?: QuestionType;
    difficulty?: DifficultyLevel;
    count: number;
    excludeIds?: string[];
  }): Promise<Question[]> {
    const picked: Question[] = [];
    const used = new Set<string>(params.excludeIds ?? []);

    const attempts = [
      { kp: true, type: true, diff: true },
      { kp: true, type: true, diff: false },
      { kp: true, type: false, diff: false },
      { kp: false, type: false, diff: false },
    ];

    for (const attempt of attempts) {
      if (picked.length >= params.count) break;

      const qb = this.repo
        .createQueryBuilder('q')
        .where('q.subject = :subject', { subject: params.subject })
        .andWhere('q.stage = :stage', { stage: params.stage })
        .andWhere('q.status = :status', { status: 'approved' });

      if (attempt.kp) {
        qb.andWhere('q.knowledgePoints LIKE :kp', { kp: `%${params.knowledgePointId}%` });
      }
      if (attempt.type && params.questionType) {
        qb.andWhere('q.type = :type', { type: params.questionType });
      }
      if (attempt.diff && params.difficulty) {
        qb.andWhere('q.difficulty = :difficulty', { difficulty: params.difficulty });
      }

      const candidates = await qb.take(200).getMany();
      for (const q of candidates) {
        if (picked.length >= params.count) break;
        if (used.has(q.id)) continue;
        used.add(q.id);
        picked.push(q);
      }
    }

    return picked;
  }
}