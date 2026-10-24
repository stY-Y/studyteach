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

  /**
   * 自动批改（主客观题）。
   *
   * 结果是一套「脚手架」：错因分析 + 若干关键点，每个关键点里的提示逐层递进
   * （先点拨；学生要了再给一小段答案；还不会再来一句点拨……要到底给完整答案与解析）。
   */
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
        keyPoints: result.keyPoints,
        fullAnswer: result.answer,
        analysis: result.analysis,
      }),
    );

    return {
      recordId: record.id,
      questionId: question.id,
      knowledgePointId: question.knowledgePoints?.[0],
      score: result.score,
      errorAnalysis: result.errorAnalysis,
      hints: result.hints,
      keyPoints: result.keyPoints,
      answer: result.answer,
      analysis: result.analysis,
    };
  }

  listByStudent(studentId: string): Promise<GradingRecord[]> {
    return this.repo.find({ where: { studentId }, order: { createdAt: 'DESC' } });
  }
}