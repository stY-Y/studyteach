import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GradingRecord } from './entities/grading-record.entity';
import { GradeQuestionDto } from './dto/grading.dto';
import { QuestionsService } from '../questions/questions.service';
import { AiService } from '../../ai/ai.service';

@Injectable()
export class GradingService {
  constructor(
    @InjectRepository(GradingRecord)
    private readonly repo: Repository<GradingRecord>,
    private readonly questionsService: QuestionsService,
    private readonly ai: AiService,
  ) {}

  /** 自动批改（主客观题），输出错因分析 + 启发式点拨，不返回完整答案 */
  async grade(studentId: string, dto: GradeQuestionDto) {
    const question = await this.questionsService.findById(dto.questionId);

    const result = await this.ai.grade({
      question: {
        id: question.id,
        type: question.type,
        content: question.content,
        answer: question.answer ?? '',
        knowledgePointId: question.knowledgePoints?.[0],
      },
      answer: dto.answer,
    });

    const record = await this.repo.save(
      this.repo.create({
        studentId,
        questionId: question.id,
        answer: dto.answer,
        score: result.score,
        errorAnalysis: result.errorAnalysis,
        hints: result.hints,
      }),
    );

    return {
      recordId: record.id,
      questionId: question.id,
      knowledgePointId: question.knowledgePoints?.[0],
      score: result.score,
      errorAnalysis: result.errorAnalysis,
      hints: result.hints,
    };
  }

  listByStudent(studentId: string): Promise<GradingRecord[]> {
    return this.repo.find({ where: { studentId }, order: { createdAt: 'DESC' } });
  }
}