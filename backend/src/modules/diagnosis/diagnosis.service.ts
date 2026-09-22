import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DIAGNOSIS, DiagnosisStatus } from '@teachstudy/shared';
import { DiagnosisRecord } from './entities/diagnosis-record.entity';
import { StartDiagnosisDto, SubmitAnswersDto } from './dto/diagnosis.dto';
import { QuestionsService } from '../questions/questions.service';
import { Question } from '../questions/entities/question.entity';
import { AiService } from '../../ai/ai.service';
import { isAnswerCorrect } from '../../common/utils/answer.util';

/** 逐题解析条目（提交后返回给学生） */
export interface ReviewItem {
  questionId: string;
  type: string;
  difficulty: string;
  content: string;
  options: string[] | null;
  knowledgePoints: string[];
  /** 学生作答 */
  studentAnswer: string;
  /** 正确答案 */
  correctAnswer: string;
  isCorrect: boolean;
  /** 解析 */
  analysis: string;
  /** 典型错因 */
  typicalErrors: string[];
}

/** 本次诊断统计 */
export interface DiagnosisStats {
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  /** 正确率 0-1 */
  accuracy: number;
}

@Injectable()
export class DiagnosisService {
  constructor(
    @InjectRepository(DiagnosisRecord)
    private readonly repo: Repository<DiagnosisRecord>,
    private readonly questionsService: QuestionsService,
    private readonly ai: AiService,
  ) {}

  /** 开始诊断：抽题（10-15 道），创建记录 */
  async start(studentId: string, dto: StartDiagnosisDto) {
    const count = DIAGNOSIS.QUESTION_COUNT_MIN;
    const questions = await this.questionsService.pickByKnowledgePoints(
      dto.subject,
      dto.stage,
      dto.knowledgePoints ?? [],
      count,
    );

    const coverage = Array.from(
      new Set(questions.flatMap((q) => q.knowledgePoints)),
    );

    const record = await this.repo.save(
      this.repo.create({
        studentId,
        subject: dto.subject,
        stage: dto.stage,
        coverage,
        questionIds: questions.map((q) => q.id),
        status: DiagnosisStatus.RUNNING,
      }),
    );

    // 作答前不下发答案与解析，避免学生直接看答案
    const publicQuestions = questions.map(({ answer, analysis, ...rest }) => rest);
    return { recordId: record.id, count: publicQuestions.length, questions: publicQuestions };
  }

  /**
   * 提交作答：
   *  1. 逐题批改，给出正确答案与解析（学生做完后才给出）
   *  2. 调用 AI 诊断，输出薄弱点清单与补漏学习路径
   */
  async submit(studentId: string, recordId: string, dto: SubmitAnswersDto) {
    const record = await this.findById(recordId);
    if (record.studentId !== studentId) throw new ForbiddenException('无权提交该诊断');

    const questionIds = record.questionIds ?? [];
    const questions = await this.questionsService.findByIds(questionIds);

    const review = this.buildReview(questionIds, questions, dto.answers);
    const stats = this.buildStats(review);

    const result = await this.ai.diagnose({
      subject: record.subject,
      answers: dto.answers,
      knowledgePoints: record.coverage ?? [],
    });

    record.answers = dto.answers;
    record.weakPoints = result.weakPoints;
    record.learningPath = result.learningPath;
    record.status = DiagnosisStatus.DONE;
    await this.repo.save(record);

    return {
      recordId: record.id,
      stats,
      weakPoints: result.weakPoints,
      learningPath: result.learningPath,
      review,
    };
  }

  /** 诊断详情：含逐题解析（仅本人可看） */
  async detail(studentId: string, id: string) {
    const record = await this.findById(id);
    if (record.studentId !== studentId) {
      throw new ForbiddenException('无权查看该诊断记录');
    }

    let review: ReviewItem[] = [];
    let stats: DiagnosisStats = { total: 0, correct: 0, wrong: 0, unanswered: 0, accuracy: 0 };

    // 已提交过的记录才逐题解析
    if (record.answers && record.answers.length > 0) {
      const questionIds = record.questionIds ?? [];
      const questions = await this.questionsService.findByIds(questionIds);
      review = this.buildReview(questionIds, questions, record.answers);
      stats = this.buildStats(review);
    }

    return { ...record, stats, review };
  }

  async findById(id: string): Promise<DiagnosisRecord> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('诊断记录不存在');
    return found;
  }

  listByStudent(studentId: string): Promise<DiagnosisRecord[]> {
    return this.repo.find({ where: { studentId }, order: { createdAt: 'DESC' } });
  }

  /** 按抽题顺序逐题批改，返回答案与解析 */
  private buildReview(
    questionIds: string[],
    questions: Question[],
    answers: Array<{ questionId: string; answer: string }>,
  ): ReviewItem[] {
    const byId = new Map(questions.map((q) => [q.id, q]));
    const answerOf = new Map(answers.map((a) => [a.questionId, a.answer ?? '']));

    return questionIds
      .map((id) => {
        const question = byId.get(id);
        if (!question) return null;

        const studentAnswer = answerOf.get(id) ?? '';
        const correctAnswer = question.answer ?? '';

        const item: ReviewItem = {
          questionId: question.id,
          type: question.type,
          difficulty: question.difficulty,
          content: question.content,
          options: question.options ?? null,
          knowledgePoints: question.knowledgePoints ?? [],
          studentAnswer,
          correctAnswer,
          isCorrect: isAnswerCorrect(studentAnswer, correctAnswer),
          analysis: question.analysis ?? '',
          typicalErrors: question.typicalErrors ?? [],
        };
        return item;
      })
      .filter((item): item is ReviewItem => item !== null);
  }

  private buildStats(review: ReviewItem[]): DiagnosisStats {
    const total = review.length;
    const correct = review.filter((r) => r.isCorrect).length;
    const unanswered = review.filter((r) => !r.studentAnswer.trim()).length;
    return {
      total,
      correct,
      wrong: total - correct,
      unanswered,
      accuracy: total === 0 ? 0 : Number((correct / total).toFixed(4)),
    };
  }
}
