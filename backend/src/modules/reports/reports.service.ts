import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudyReport } from './entities/study-report.entity';
import { GenerateReportDto } from './dto/report.dto';
import { DiagnosisService } from '../diagnosis/diagnosis.service';
import { GradingService } from '../grading/grading.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(StudyReport) private readonly repo: Repository<StudyReport>,
    private readonly diagnosisService: DiagnosisService,
    private readonly gradingService: GradingService,
  ) {}

  /** 生成极简版学情报表 */
  async generate(studentId: string, dto: GenerateReportDto): Promise<StudyReport> {
    const [diagnoses, gradings] = await Promise.all([
      this.diagnosisService.listByStudent(studentId),
      this.gradingService.listByStudent(studentId),
    ]);

    const subjectDiagnoses = diagnoses.filter((r) => r.subject === dto.subject);
    const weakPoints = subjectDiagnoses.flatMap((r) => r.weakPoints ?? []);
    const avgScore = gradings.length
      ? gradings.reduce((s, r) => s + r.score, 0) / gradings.length
      : 0;

    const metrics = {
      diagnosisCount: subjectDiagnoses.length,
      gradingCount: gradings.length,
      weakPointCount: weakPoints.length,
      avgScore: Number(avgScore.toFixed(2)),
      weakPoints: weakPoints.map((wp) => ({ id: wp.knowledgePointId, mastery: wp.mastery })),
    };

    return this.repo.save(this.repo.create({ studentId, subject: dto.subject, metrics }));
  }

  listByStudent(studentId: string): Promise<StudyReport[]> {
    return this.repo.find({ where: { studentId }, order: { createdAt: 'DESC' } });
  }
}