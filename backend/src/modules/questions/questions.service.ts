import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  DifficultyLevel,
  QuestionType,
  StudyStage,
  Subject,
} from '@teachstudy/shared';
import { Question } from './entities/question.entity';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';

export interface QuestionQuery {
  subject?: Subject;
  stage?: StudyStage;
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
    const { subject, stage, type, difficulty, knowledgePointId, page = 1, pageSize = 20 } = query;
    const qb = this.repo.createQueryBuilder('q').where('q.status = :status', { status: 'approved' });
    if (subject) qb.andWhere('q.subject = :subject', { subject });
    if (stage) qb.andWhere('q.stage = :stage', { stage });
    if (type) qb.andWhere('q.type = :type', { type });
    if (difficulty) qb.andWhere('q.difficulty = :difficulty', { difficulty });
    if (knowledgePointId) qb.andWhere('q.knowledgePoints LIKE :kp', { kp: `%${knowledgePointId}%` });
    qb.orderBy('q.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
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

  create(dto: CreateQuestionDto): Promise<Question> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateQuestionDto): Promise<Question> {
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