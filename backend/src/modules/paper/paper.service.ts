import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Paper, PaperMeta } from './entities/paper.entity';
import { GeneratePaperDto } from './dto/paper.dto';
import { AiService } from '../../ai/ai.service';
import { QuestionsService } from '../questions/questions.service';
import { Question } from '../questions/entities/question.entity';

@Injectable()
export class PaperService {
  constructor(
    @InjectRepository(Paper) private readonly repo: Repository<Paper>,
    private readonly ai: AiService,
    private readonly questionsService: QuestionsService,
  ) {}

  /**
   * 智能组卷：AI 制定选题计划 → 按计划从题库真实抽题 → 落库并返回试卷。
   * 题库题量不足时不做静默填充，而是记录缺口（meta.shortages）供教师查看。
   */
  async generate(
    creatorId: string,
    dto: GeneratePaperDto,
  ): Promise<Paper & { questions: Question[] }> {
    // 1) AI 选题计划（考什么知识点 / 什么题型 / 什么难度 / 各几道）
    const plan = await this.ai.generatePaper({
      subject: dto.subject,
      stage: dto.stage,
      knowledgePoints: dto.knowledgePoints,
      difficulty: dto.difficulty,
      count: dto.count,
    });

    // 2) 按计划逐条从题库抽题
    const picked: Question[] = [];
    const shortages: PaperMeta['shortages'] = [];

    for (const item of plan.blueprint) {
      if (picked.length >= dto.count) break;
      const need = Math.min(item.count, dto.count - picked.length);
      const got = await this.questionsService.pickQuestions({
        subject: dto.subject,
        stage: dto.stage,
        knowledgePointId: item.knowledgePointId,
        questionType: item.questionType,
        difficulty: item.difficulty,
        count: need,
        excludeIds: picked.map((q) => q.id),
      });
      picked.push(...got);
      if (got.length < need) {
        shortages.push({
          knowledgePointId: item.knowledgePointId,
          requested: need,
          actual: got.length,
        });
      }
    }

    if (picked.length === 0) {
      throw new BadRequestException(
        '题库中没有符合条件的题目，请先录入题目，或放宽组卷条件（学科/知识点/题型/难度）',
      );
    }

    // 3) 落库：同时保存选题计划与抽取结果
    const meta: PaperMeta = { requested: dto.count, actual: picked.length, shortages };
    const paper = await this.repo.save(
      this.repo.create({
        title: dto.title,
        subject: dto.subject,
        stage: dto.stage,
        knowledgePoints: dto.knowledgePoints,
        difficulty: dto.difficulty,
        count: dto.count,
        questionIds: picked.map((q) => q.id),
        blueprint: plan.blueprint,
        summary: plan.summary,
        meta,
        creatorId,
        status: 'generated',
      }),
    );

    return { ...paper, questions: picked };
  }

  listByCreator(creatorId: string): Promise<Paper[]> {
    return this.repo.find({ where: { creatorId }, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Paper> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('试卷不存在');
    return found;
  }

  /** 试卷详情：附带解析后的真实题目 */
  async detail(id: string): Promise<Paper & { questions: Question[] }> {
    const paper = await this.findById(id);
    const questions = await this.questionsService.findByIds(paper.questionIds ?? []);
    return { ...paper, questions };
  }
}